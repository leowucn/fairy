import axios from 'axios'
import dateFormat from 'dateformat'
import autoBind from 'auto-bind'
import _ from 'lodash'
import { URL } from '../src/spider/constants'
import serverConfig from '../config'
import { database } from '../src/global'


class Util {
  constructor() {
    autoBind(this)
  }
  errMsg(err, msg) {
    if (err) {
      this.printMsgV1('error happened!')
      this.printMsgV1(`error msg = ${msg}`)
      this.printMsgV1('---------------')
      console.log(err)                          // eslint-disable-line
      this.printMsgV1('error over!')
    }
  }

  getMusicStyleUrl(musicStyle, pageIndex) {
    let offset = 0
    if (pageIndex > 1) {
      offset = (pageIndex - 1) * 35   // 每一页35条数据
    }
    const url = URL.URL_MUSIC_STYLE.concat(musicStyle).concat(`&limit=35&offset=${offset}`)
    return encodeURI(url)
  }

  getPlaylistUrl(playlistPostfix) {
    return encodeURI(URL.URL_ROOT_LIST.concat(playlistPostfix.trim()))
  }

  getMusicCommentUrl(id) {
    return URL.URL_COMMENT_V2.concat(id)
  }

  getArtistTypeUrl(artistTypePostfixUrl) {
    return URL.URL_ARTIST.concat(artistTypePostfixUrl)
  }

  getAlbumListUrl(artistId, pageIndex) {
    let offset = 0
    if (pageIndex > 1) {
      offset = (pageIndex - 1) * 12   // 每一页12条数据
    }
    return URL.URL_ALBUM_LIST.concat(`?id=${artistId}&limit=12&offset=${offset}`)
  }

  getAlbumUrl(albumId) {
    return URL.URL_ALBUM.concat(albumId)
  }

  getHtmlSourceCodeWithGetMethod(url) {
    delete process.env.http_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTPS_PROXY;
    serverConfig.options.url = url
    return axios(serverConfig.options).then((response) => {
      return response.data
    }, (err) => {
      return this.errMsg(err)
    })
  }

  getNumberStringFromString(rawStr) {
    return rawStr.replace(/[^0-9]/g, '')
  }

  printMsgV1(msg) {
    let m = ''
    if (msg.length > serverConfig.maxMsgLength) {      // 如果日志长度过大就干脆直接返回
      m = msg
    } else {
      const count = (serverConfig.maxMsgLength - msg.length) / 2
      m = '-'.repeat(count).concat(msg).concat('-'.repeat(count))
    }
    console.log(this.getNowTimeForDisplay().concat(m))           // eslint-disable-line
  }
  printMsgV2(msg) {
    console.log(this.getNowTimeForDisplay().concat('   '.concat(msg)))           // eslint-disable-line
  }

  getNowTimeForDisplay() {
    const now = new Date();
    const time = dateFormat(now, 'isoDateTime');
    return time.slice(0, 19)
  }

  ifShouldUpdateData(name) {
    const data = database.getDataDateInfoByName(name)
    if (_.isEmpty(data)) {
      return true
    }
    const nowMilliseconds = (new Date()).getDate()
    if (data.date - nowMilliseconds > serverConfig.updateIntervalDays) {
      return true
    }
    return false
  }
}

export default new Util()
