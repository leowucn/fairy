import axios from 'axios'
import dateFormat from 'dateformat'
import autoBind from 'auto-bind'
import { createStream } from 'table';
import UserAgent from 'user-agents';

import serverConfig from '../src/config'
import { hsetAsync } from '../src/redis'

const streamConfig = {
  columnDefault: {
    width: 50,
  },
  columnCount: 5,
  columns: {
    0: {
      width: 30,
      alignment: 'center'
    },
    1: {
      width: 20,
      alignment: 'center',
    },
    2: {
      width: 32,
      alignment: 'center',
    },
    3: {
      alignment: 'center',
      width: 20,
    },
    4: {
      alignment: 'center',
      width: 70,
    },
  },
};
const stream = createStream(streamConfig);

class Util {
  constructor() {
    autoBind(this)
  }
  errMsg(err) {
    this.beautifulPrintMsgV1('发生了错误！')
    this.beautifulPrintMsgV1(err)
  }

  getMusicStyleUrl(musicStyle, pageIndex) {
    let offset = 0
    if (pageIndex > 1) {
      offset = (pageIndex - 1) * 35   // 每一页35条数据
    }
    const url = serverConfig.URL.URL_MUSIC_STYLE.concat(musicStyle).concat(`&limit=35&offset=${offset}`)
    return encodeURI(url)
  }

  getMusicCommentUrl(id) {
    return serverConfig.URL.URL_COMMENT_V2.concat(id)
  }

  getArtistTypeUrl(artistTypePostfixUrl) {
    return serverConfig.URL.URL_ARTIST.concat(artistTypePostfixUrl)
  }

  getAlbumListUrl(artistId, pageIndex) {
    let offset = 0
    if (pageIndex > 1) {
      offset = (pageIndex - 1) * 12   // 每一页12条数据
    }
    return serverConfig.URL.URL_ALBUM_LIST.concat(`?id=${artistId}&limit=12&offset=${offset}`)
  }

  getAlbumUrl(albumId) {
    return serverConfig.URL.URL_ALBUM.concat(albumId)
  }

  getHtmlSourceCodeWithGetMethod(url) {
    return new Promise(async (resolve) => {
      serverConfig.options.url = url
      serverConfig.options.header['User-Agent'] = this.generateRandomUserAgent()
      const response = await axios(serverConfig.options)
      resolve(response.data)
    })
  }

  getNumberStringFromString(rawStr) {
    return rawStr.replace(/[^0-9]/g, '')
  }

  beautifulPrintMsgV1(...args) {
    let resMsg = `\n${this.getNowTimeForDisplay()}     `
    let fixedWidth = 80
    for (let i = 0; i < args.length; i++) {
      if (i > 0) {
        fixedWidth = 30
      }
      const argument = args[i]
      if (argument.length < fixedWidth) {
        resMsg += argument.concat(' '.repeat(fixedWidth - argument.length))
      } else {
        resMsg += argument + ' '.repeat(5)
      }
    }
    console.log(resMsg)
  }

  /**
   * 以整齐的表格形式打印日志，暂时只支持4个参数的情况
   */
  beautifulPrintMsgV2(...args) {
    stream.write([this.getNowTimeForDisplay(), args[0], args[1], args[2], args[3]]);
  }

  getNowTimeForDisplay() {
    const now = new Date();
    const time = dateFormat(now, 'isoDateTime');
    return time.slice(0, 19)
  }

  generateRandomUserAgent() {
    const userAgent = new UserAgent();
    return userAgent.toString()
  }

  /**
   *
   * @param {*} date  上次抓取数据的时间
   */
  ifShouldUpdateData(date) {
    if (new Date().getTime() - date < serverConfig.updateDbInterval) {
      return false
    }
    return true
  }

  /**
   *
   * @param {} date  上次抓取歌手列表的时间，这个列表应该很少变化，所以可以隔比较长的时间再重新抓取
   */
  ifShouldUpdateArtistListData(date) {
    if (new Date().getTime() - date < serverConfig.updateDbArtistListInterval) {
      return false
    }
    return true
  }

  updateDataDateInfo(name) {
    hsetAsync('data_date_info_hash', name, new Date().getTime())
  }

}

export default new Util()
