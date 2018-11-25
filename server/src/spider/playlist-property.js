import autoBind from 'auto-bind'
import cheerio from 'cheerio'
import async from 'async'
import util from '../../util/util'
import serverConfig from '../config'
import redisWrapper, { hgetAsync, smembersAsync, hgetallAsync } from '../redis'


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
  async getPlaylistProperty(playlistInfo, index, total, outerCallback) {
    const playlistMusicCount = await this.getMusicRegistrationFromPlaylist(playlistInfo.playlist)

    const playlistUrl = serverConfig.URL.URL_MUSIC.concat(util.getNumberStringFromString(playlistInfo.playlist))
    const htmlSourceCode = await util.getHtmlSourceCodeWithGetMethod(playlistUrl)
    const resObj = htmlSourceCode.result

    const playlistProperty = {}
    playlistProperty.title = playlistInfo.title
    playlistProperty.playlist = playlistInfo.playlist
    playlistProperty.introduction = resObj.description
    playlistProperty.playlistMusicCount = playlistMusicCount
    playlistProperty.playCount = Number(resObj.playCount)
    playlistProperty.commentCount = Number(resObj.commentCount)
    playlistProperty.collectCount = resObj.shareCount
    playlistProperty.createTime = resObj.createTime
    util.beautifulPrintMsgV2('获取歌单信息', `外部遍历序号: ${index}`, `总数: ${total}`, `${playlistInfo.title}`)
    await redisWrapper.storeInRedis('playlist_property_set', `prepty-${playlistInfo.playlist}`, playlistProperty)
    outerCallback()
  }

  async getMusicRegistrationFromPlaylist(playlist) {
    return new Promise(async (resolve) => {
      const playlistUrl = serverConfig.URL.URL_PLAYLIST.concat(util.getNumberStringFromString(playlist))
      const htmlSourceCode = await util.getHtmlSourceCodeWithGetMethod(playlistUrl)
      const $ = cheerio.load(htmlSourceCode, { decodeEntities: false })
      resolve(Number($('#playlist-track-count').text()))
    })
  }

  /**
   * 更新所有歌单的属性信息
   */
  async callUpdateAllPlaylistProperty(outerCallback) {
    const currentThis = this
    const tasks = []
    const allPlaylistInfosKeys = await smembersAsync('playlist_info_set')
    for (let i = 0; i < allPlaylistInfosKeys.length; i++) {
      const playlistInfo = await hgetallAsync(allPlaylistInfosKeys[i])

      const dataDateItemName = `playlist-property-${playlistInfo.playlist}`
      const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
      const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
      if (!shouldUpdate) {
        continue
      }
      const f = (callback) => {                                                      // eslint-disable-line
        currentThis.getPlaylistProperty(playlistInfo, i + 1, allPlaylistInfosKeys.length, () => {
          util.updateDataDateInfo(dataDateItemName)
          callback()
        })
      }
      tasks.push(f)
    }
    util.beautifulPrintMsgV1('..........开始 针对每一个歌单，获取其详细信息，包括歌单的收藏数等和音乐列表!..........')
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumGetPlaylistProperty, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.beautifulPrintMsgV1('..........完成 针对每一个歌单，获取其详细信息，包括歌单的收藏数等和音乐列表!...........\n')
      outerCallback()
    })
  }
}

export default new PlaylistProperty()

