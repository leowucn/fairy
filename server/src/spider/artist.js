import autoBind from 'auto-bind'
import _ from 'lodash'
import cheerio from 'cheerio'
import async from 'async'
import util from '../../util/util'
import serverConfig from '../config'
import redisWrapper, { hgetAsync } from '../redis'

class Artist {
  constructor() {
    autoBind(this)
  }
  getArtists(artistClass, url, outerCallback) {
    util.getHtmlSourceCodeWithGetMethod(url).then((body) => {
      let $ = cheerio.load(body, { decodeEntities: false })
      $('#m-artist-box').find('li').each(function (i, elem) {      // eslint-disable-line
        $ = cheerio.load(this, { decodeEntities: false })
        const id = util.getNumberStringFromString($('.nm').attr('href'))

        const artistRegistration = {}
        artistRegistration.id = id
        artistRegistration.name = $('.nm').html()
        artistRegistration.artistClass = artistClass
        redisWrapper.storeInRedis('artist_registration_set', `artist-${id}`, artistRegistration)
      });
      outerCallback()
    }).catch((err) => {
      util.errMsg(err)
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
    util.printMsgV2(`begin getting registration of artist class: ${serverConfig.ARTIST_CLASS[artistClass]}...`)
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumGetArtistInfo, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.printMsgV2(`finish getting registration of artist class: ${serverConfig.ARTIST_CLASS[artistClass]}`)
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
        this.assignTaskByDiffPrefixOfName(desc, () => {    // eslint-disable-line
          util.updateDataDateInfo(dataDateItemName)
          callback()
        })
      }
      tasks.push(f)
    }
    util.printMsgV1('Begin getting all of the artists information!')
    async.series(tasks, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.printMsgV1('Finish getting all of the artists information!')
      outerCallback()
    })
  }
}

export default new Artist()

