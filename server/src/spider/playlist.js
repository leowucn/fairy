import cheerio from 'cheerio'
import async from 'async'
import _ from 'lodash'
import autoBind from 'auto-bind'
import mongodb from 'mongodb'
import { MUSIC_STYLE } from './constants'
import serverConfig from '../../config'
import util from '../../util/util'
import database from '../database'


class Playlist {
  constructor() {
    autoBind(this)
  }
  /**
   * 获取指定音乐风格的歌单列表
   * @param {string} musicStyle  定义在constants.js中，表示音乐风格，如'华语'
   * @param {function} outerCallback  用于把抓取下来的数据传送出去;w
   */
  getPlaylistsByMusicStyle(musicStyle, outerCallback) {
    const currentThis = this
    let url = util.getMusicStyleUrl(musicStyle)
    util.getHtmlSourceCodeWithGetMethod(url).then(async function(body) {             // eslint-disable-line
      let $ = cheerio.load(body, { decodeEntities: false })
      const aSize = $('#m-pl-pager').find('a').length
      let maxPageIndex = 0
      $('#m-pl-pager').find('a').each(function (i, elem) {                            // eslint-disable-line
        if (i === aSize - 2) {
          maxPageIndex = Number($(this).html())
        }
      });
      maxPageIndex = serverConfig.maxPageIndexForPlaylist <= 0 ? maxPageIndex : serverConfig.maxPageIndexForPlaylist
      const tasks = []
      for (let pageIndex = 1; pageIndex <= maxPageIndex; pageIndex++) {
        const f = function (callback) {                                              // eslint-disable-line
          url = util.getMusicStyleUrl(musicStyle, pageIndex)
          util.getHtmlSourceCodeWithGetMethod(url).then((b) => {
            const result = []
            $ = cheerio.load(b, { decodeEntities: false })
            $('#m-pl-container').find('li').each(function (i, elem) {                 // eslint-disable-line
              $ = cheerio.load(this, { decodeEntities: false })
              const playlistInfo = currentThis.extractTitleAndPlayerList($('p[class=dec]').html(), musicStyle)
              if (playlistInfo) {
                result.push(playlistInfo)
              }
            });
            callback(null, result)
            return null
          }).catch((err) => {
            util.errMsg(err)
          })
        }
        tasks.push(f)
      }
      await async.parallel(tasks, (err, results) => {
        if (err) {
          outerCallback(err)
          return util.errMsg(err)
        }
        const playlistInfo = []
        _.forEach(results, (playlistArr) => {
          _.forEach(playlistArr, (playlist) => {
            try {
              if (playlist) {
                playlistInfo.push(playlist)
              }
            } catch (e) {
              util.errMsg(e)
            }
          })
        })
        return outerCallback(null, { musicStyle, playlistInfo })
      })
      return null
    }).catch((err) => {
      util.errMsg(err)
    })
  }

  /**
   * getPlaylistsByMusicStyle的包装函数，方便调用
   */
  wrapperGetPlaylistsByMusicStyle(musicStyle, outerCallback) {
    const tasks = []
    const currentThis = this
    const f = function (callback) {      // eslint-disable-line
      currentThis.getPlaylistsByMusicStyle(musicStyle, callback)
    }
    tasks.push(f)
    async.parallel(tasks, (err, result) => {
      if (err) {
        util.errMsg(err)
        return
      }
      util.printMsgV2(`musicStyle = ${result[0].musicStyle}, playlistInfo.length = ${result[0].playlistInfo.length}`)   // eslint-disable-line
      _.forEach(result[0].playlistInfo, (item) => {
        database.upsertPlaylistInfo(item)
      })
      if (outerCallback) {
        outerCallback()
      }
    })
  }

  /**
   * 提取歌单标题和对应的歌单地址
   * @param {*} htmlCode // 比如<a title="起床最强闹铃，就不信你不起" href="/playlist?id=922757186" class="tit f-thide s-fc0">起床最强闹铃，就不信你不起</a>
   * @param {*} metaInfo // 用于标识当前歌单属于哪个类别，比如华语，欧美等等。
   */
  extractTitleAndPlayerList(htmlCode, metaInfo) {
    const pattern = /".*?"/g;
    let current;
    const playlistInfo = {}
    const container = []
    while (current = pattern.exec(htmlCode)) // eslint-disable-line
      container.push(current[0]);
    playlistInfo.title = container[0].replace(/['"]+/g, '')
    playlistInfo.playlist = container[1].replace(/['"]+/g, '')
    playlistInfo.metaInfo = metaInfo
    if (playlistInfo.playlist.indexOf('playlist') === -1 || playlistInfo.playlist.length === 0) {
      return null
    }
    return playlistInfo
  }

  /**
   * 获取所有音乐风格的歌单列表
   */
  callGetPlaylistsForAllMusicStyle(outerCallback) {
    const tasks = []
    const currentThis = this
    _.forEach(MUSIC_STYLE, (v) => {
      // console.log(11)
      // if (!util.ifShouldUpdateData(`playlist-${v}`)) {
      //   console.log(22)
      //   return
      // }
      // console.log(33)
      const f = (callback) => {
        util.printMsgV1(`Prepare for the next data of music style ${v}...`)      // eslint-disable-line
        currentThis.wrapperGetPlaylistsByMusicStyle(v, callback)
      }
      tasks.push(f)
    })

    async.waterfall(tasks, (err) => {
      if (err) {
        util.errMsg(err)
        return
      }
      util.printMsgV1('fetch play lists over!')      // eslint-disable-line
      outerCallback()
    })
  }

}

export default new Playlist()

