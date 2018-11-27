import cheerio from 'cheerio'
import async from 'async'
import _ from 'lodash'
import bluebird from 'bluebird'
import autoBind from 'auto-bind'
import serverConfig from '../config'
import util from '../../util/util'
import redisWrapper, { hgetAsync } from '../redis'


class Playlist {
  constructor() {
    autoBind(this)
  }
  /**
   * 获取指定音乐风格的歌单列表
   * @param {string} musicStyle  定义在constants.js中，表示音乐风格，如'华语'
   * @param {function} outerCallback  用于把抓取下来的数据传送出去;
   */
  async getPlaylistsByMusicStyle(musicStyle, outerCallback) {
    const currentThis = this
    let url = util.getMusicStyleUrl(musicStyle)
    const body = await util.getHtmlSourceCodeWithGetMethod(url)
    let $ = cheerio.load(body, { decodeEntities: false })
    const aSize = $('#m-pl-pager').find('a').length
    let maxPageIndex = 0
    $('#m-pl-pager').find('a').each(function (i, elem) {
      if (i === aSize - 2) {
        maxPageIndex = Number($(this).html())
      }
    });
    maxPageIndex = serverConfig.maxPageIndexForPlaylist <= 0 ? maxPageIndex : serverConfig.maxPageIndexForPlaylist
    const tasks = []
    for (let pageIndex = 1; pageIndex <= maxPageIndex; pageIndex++) {
      const f = async (callback) => {                                         // eslint-disable-line
        url = util.getMusicStyleUrl(musicStyle, pageIndex)
        const b = await util.getHtmlSourceCodeWithGetMethod(url)
        const result = []
        $ = cheerio.load(b, { decodeEntities: false })
        $('#m-pl-container').find('li').each(function (i, elem) {
          $ = cheerio.load(this, { decodeEntities: false })
          const playlistInfo = currentThis.extractTitleAndPlayerList($('p[class=dec]').html(), musicStyle)
          if (playlistInfo) {
            result.push(playlistInfo)
          }
        });
        callback(null, result)
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
    while (current = pattern.exec(htmlCode)) {   // eslint-disable-line
      container.push(current[0]);
    }
    playlistInfo.title = container[0].replace(/['"]+/g, '')
    playlistInfo.playlist = container[1].replace(/['"]+/g, '')
    playlistInfo.metaInfo = metaInfo
    if (playlistInfo.playlist.indexOf('playlist') === -1 || playlistInfo.playlist.length === 0) {
      return null
    }
    return playlistInfo
  }


  /**
   * getPlaylistsByMusicStyle的包装函数，方便调用
   */
  wrapperGetPlaylistsByMusicStyle(musicStyle, index, total, outerCallback) {
    const currentThis = this
    const tasks = []
    const f = (callback) => {
      currentThis.getPlaylistsByMusicStyle(musicStyle, callback)
    }
    tasks.push(f)
    async.parallel(tasks, async (err, result) => {
      if (err) {
        util.errMsg(err)
        return
      }
      util.beautifulPrintMsgV2(
        '获取音乐风格歌单',
        `外部遍历序号: ${index}`,
        `总数: ${total}`,
        `${musicStyle}，歌单总数：${result[0].playlistInfo.length}`
      )
      const promiseTasks = []
      _.forEach(result[0].playlistInfo, (item) => {
        promiseTasks.push(
          redisWrapper.storeInRedis('playlist_info_set', `plist-${item.playlist}`, item)
        )
      })
      await bluebird.Promise.all(promiseTasks)
      outerCallback()
    })
  }


  /**
   * 获取所有音乐风格的歌单列表
   */
  async callGetPlaylistsForAllMusicStyle(outerCallback) {
    const tasks = []
    for (let i = 0; i < serverConfig.MUSIC_STYLE.length; i++) {
      const specificType = serverConfig.MUSIC_STYLE[i]
      const dataDateItemName = `playlist-${specificType}`
      const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
      const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
      if (!shouldUpdate) {
        continue
      }
      const f = (callback) => {
        this.wrapperGetPlaylistsByMusicStyle(specificType, i + 1, serverConfig.MUSIC_STYLE.length, () => {
          util.updateDataDateInfo(dataDateItemName)
          callback()
        })
      }
      tasks.push(f)
    }

    util.beautifulPrintMsgV1('..........开始 针对每一种音乐风格获取歌单!..........')
    async.waterfall(tasks, (err) => {
      if (err) {
        util.errMsg(err)
        return
      }
      util.beautifulPrintMsgV1('..........结束 针对每一种音乐风格获取歌单!..........\n')
      outerCallback()
    })
  }

}

export default new Playlist()

