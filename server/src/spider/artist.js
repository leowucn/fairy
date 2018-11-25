import autoBind from 'auto-bind'
import _ from 'lodash'
import cheerio from 'cheerio'
import async from 'async'
import bluebird from 'bluebird'
import util from '../../util/util'
import serverConfig from '../config'
import redisWrapper, { hgetAsync } from '../redis'

class Artist {
  constructor() {
    autoBind(this)
  }
  async getArtists(artistClass, url, outerCallback) {
    const currentThis = this
    const body = await util.getHtmlSourceCodeWithGetMethod(url)
    const promiseTasks = []
    let $ = cheerio.load(body, { decodeEntities: false })
    $('#m-artist-box').find('li').each(async function (i, elem) {
      $ = cheerio.load(this, { decodeEntities: false })
      const id = util.getNumberStringFromString($('.nm').attr('href'))

      const artistRegistration = {}
      artistRegistration.id = id
      artistRegistration.name = $('.nm').html()
      artistRegistration.artistClass = artistClass
      artistRegistration.fanCount = await currentThis.getFanCountOfArtist()
      promiseTasks.push(
        redisWrapper.storeInRedis('artist_registration_set', `artist-${id}`, artistRegistration)
      )
    });
    await bluebird.Promise.all(promiseTasks)
    outerCallback()
  }

  async getFanCountOfArtist(artistId) {
    return new Promise(async (resolve) => {
      const artistHomeUrl = serverConfig.URL.URL_USER_HOME + artistId
      const htmlSourceCode = await util.getHtmlSourceCodeWithGetMethod(artistHomeUrl)
      const $ = cheerio.load(htmlSourceCode, { decodeEntities: false })
      resolve(Number($('#fan_count').text()))
    })
  }


  assignTaskByDiffPrefixOfName(artistClass, outerCallback) {
    const tasks = []
    _.forEach(serverConfig.artistPrefixOfName, (item) => {
      let n = '0'
      if (item !== '0') {
        n = item.charCodeAt(0)
      }
      const url = util.getArtistTypeUrl(artistClass.concat(`&initial=${n}`))
      const f = (callback) => {
        this.getArtists(artistClass, url, callback)
      }
      tasks.push(f)
    })
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumGetArtistInfo, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.beautifulPrintMsgV1(`完成该歌手类别歌手清单的获取： ${serverConfig.ARTIST_CLASS[artistClass]}`)
      outerCallback()
    })
  }

  async callGetAllArtistInfo(outerCallback) {
    const tasks = []
    for (const [desc, shortLink] of Object.entries(serverConfig.ARTIST_CLASS)) {
      const dataDateItemName = `artist-${desc}`
      const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
      const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
      if (!shouldUpdate) {
        continue
      }
      const f = (callback) => {                             // eslint-disable-line
        this.assignTaskByDiffPrefixOfName(desc, () => {
          util.updateDataDateInfo(dataDateItemName)
          callback()
        })
      }
      tasks.push(f)
    }
    util.beautifulPrintMsgV1('..........开始获取歌手清单！..........')
    async.series(tasks, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.beautifulPrintMsgV1('..........结束获取歌手清单！..........\n')
      outerCallback()
    })
  }
}

export default new Artist()

