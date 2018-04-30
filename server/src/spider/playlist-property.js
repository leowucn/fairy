import autoBind from 'auto-bind'
import mongodb from 'mongodb'
import async from 'async'
import _ from 'lodash'
import util from '../../util/util'
import serverConfig from '../../config'
import { URL } from './constants'
import database from '../database'


class PlaylistProperty {
  constructor() {
    autoBind(this)
  }
  /**
   * 根据歌单的地址获取歌单的属性信息和音乐列表
   * @param {*} playlistInfo    歌单的基本信息
   * @param {*} index           当前歌单再批量任务中的索引，用于日志显示使用
   * @param {*} outerCallback   外部传进来的用于异步库async进行流程控制的回调函数
   */
  getPlaylistProperty(playlistInfo, index, total, outerCallback) {
    const currentThis = this
    const playlistUrl = URL.URL_MUSIC.concat(util.getNumberStringFromString(playlistInfo.playlist))
    util.getHtmlSourceCodeWithGetMethod(playlistUrl).then((htmlSourceCode) => {
      const resObj = htmlSourceCode.result
      currentThis.parsePlaylistPropertyInfo(resObj, playlistInfo)
      currentThis.parseMusicList(resObj, playlistInfo.playlist)
      util.printMsgV1(`update playlist property index = ${index}, total = ${total}`)
      outerCallback()
      return ''
    }).catch((err) => {
      util.errMsg(err)
      return
    })
  }

  /**
   * 从网页对象里解析出歌单属性信息
   * @param {*} resObj          解析后的网页对象，从网页获取的对象直接就是个json字符串
   * @param {*} playlistInfo    歌单的基本信息
   * @param {*} index           当前歌单再批量任务中的索引，用于日志显示使用
   */
  parsePlaylistPropertyInfo(resObj, playlistInfo) {
    let playlistProperty = {}
    database.getPlaylistPropertyByPlaylist(playlistInfo.playlist, (data) => {
      playlistProperty = data || {}
      playlistProperty.title = playlistInfo.title
      playlistProperty.playlist = playlistInfo.playlist
      playlistProperty.introduction = resObj.description
      playlistProperty.playCount = Number(resObj.playCount)
      playlistProperty.commentCount = Number(resObj.commentCount)
      playlistProperty.collectCount = resObj.shareCount
      database.upsertPlaylistProperty(playlistProperty)
    })
  }

  /**
   * 解析并存储歌单对应的歌曲列表
   * @param {*} resObj
   * @param {*} playlist
   */
  parseMusicList(resObj, playlist) {
    _.forEach(resObj.tracks, (item) => {
      const musicRegistration = {}
      musicRegistration.id = item.id
      musicRegistration.name = item.name
      musicRegistration.playlist = playlist
      database.upsertMusicRegistration(musicRegistration)
    })
  }

  /**
   * 更新所有歌单的属性信息
   */
  callUpdateAllPlaylistProperty(outerCallback) {
    const currentThis = this
    const tasks = []
    let index = 0
    database.getAllPlaylistInfos((allPlaylistInfos) => {
      _.forEach(allPlaylistInfos, (item) => {
        // if (!util.ifShouldUpdateData(`playlist-property-${item.playlist}`)) {
        //   return
        // }
        const f = (cb) => {
          currentThis.getPlaylistProperty(item, index, allPlaylistInfos.length, cb)
          index++
        }
        tasks.push(f)
      })
      util.printMsgV1('Begin upsert play list property finish!')
      async.parallelLimit(tasks, serverConfig.maxConcurrentNumGetPlaylistProperty, (err) => {
        if (err) {
          util.errMsg(err)
        }
        util.printMsgV1('Finish upsert play list property finish!')
        outerCallback()
      })
    })
  }
}

export default new PlaylistProperty()

