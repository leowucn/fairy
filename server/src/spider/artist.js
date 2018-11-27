import autoBind from 'auto-bind'
import _ from 'lodash'
import cheerio from 'cheerio'
import async from 'async'
import bluebird from 'bluebird'
import util from '../../util/util'
import serverConfig from '../config'
import redisWrapper, { hgetAsync, sismemberAsync } from '../redis'

class Artist {
  constructor() {
    autoBind(this)
  }
  getArtists(desc, url, index, total) {
    return new Promise(async resolve => {
      const currentThis = this
      const body = await util.getHtmlSourceCodeWithGetMethod(url)
      const promiseTasks = []
      let $ = cheerio.load(body, { decodeEntities: false })
      $('#m-artist-box').find('li').each(function (i, elem) {
        promiseTasks.push(new Promise(async rev => {
          $ = cheerio.load(this, { decodeEntities: false })
          const id = util.getNumberStringFromString($('.nm').attr('href'))
          const artistRegistration = {}
          artistRegistration.id = id
          artistRegistration.name = $('.nm').html()
          artistRegistration.artistClass = desc
          artistRegistration.fanCount = await currentThis.getFanCountOfArtist()
          await redisWrapper.storeInRedis('artist_registration_set', `artist-${id}`, artistRegistration)
          util.beautifulPrintMsgV2('获取歌手', `外部遍历序号: ${index}`, `总数: ${total}`, `${artistRegistration.name}`)
          rev()
        }))
      });
      await bluebird.Promise.all(promiseTasks)
      resolve()
    })
  }

  async getFanCountOfArtist(artistId) {
    return new Promise(async (resolve) => {
      const artistHomeUrl = serverConfig.URL.URL_USER_HOME + artistId
      const htmlSourceCode = await util.getHtmlSourceCodeWithGetMethod(artistHomeUrl)
      const $ = cheerio.load(htmlSourceCode, { decodeEntities: false })
      resolve(Number($('#fan_count').text()))
    })
  }

  async callGetAllArtistInfo(outerCallback) {
    const tasks = []
    const promiseTasks = []
    let index = 1
    const total = Object.keys(serverConfig.ARTIST_CLASS).length
    for (const [shortLink, desc] of Object.entries(serverConfig.ARTIST_CLASS)) {
      const indexOfArtistClass = index
      _.forEach(serverConfig.artistPrefixOfName, item => {          // eslint-disable-line
        promiseTasks.push(new Promise(async resolve => {
          const dataDateItemName = `artist-${desc}-${item}`
          const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
          const shouldUpdate = util.ifShouldUpdateArtistListData(lastUpdateDate)
          if (!shouldUpdate) {
            resolve()
            return
          }
          let n = '0'
          if (item !== '0') {
            n = item.charCodeAt(0)
          }
          const url = util.getArtistTypeUrl(shortLink.concat(`&initial=${n}`))
          const f = async (callback) => {
            this.getArtists(desc, url, indexOfArtistClass, total)
            .then(() => {
              util.updateDataDateInfo(dataDateItemName)
              callback()
            })
            .catch(() => {
              callback()
            })
          }
          tasks.push(f)
          resolve()
        }))
      })
      index++
    }
    await bluebird.Promise.all(promiseTasks)
    util.beautifulPrintMsgV1('..........开始获取歌手清单！..........')
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumGetArtistInfo, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.beautifulPrintMsgV1('..........结束获取歌手清单！..........\n')
      outerCallback()
    })
  }
}

export default new Artist()

