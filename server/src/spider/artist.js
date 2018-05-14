import autoBind from 'auto-bind'
import _ from 'lodash'
import cheerio from 'cheerio'
import async from 'async'
import bluebird from 'bluebird'
import util from '../../util/util'
import serverConfig from '../../config'
import { ARTIST_CLASS } from './constants'
import database from '../database'

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
        database.upsertArtistRegistration(artistRegistration)
      });
      outerCallback()
    }).catch((err) => {
      util.errMsg(err)
    })
  }

  assignTaskByDiffPrefixOfName(artistClass, outerCallback, callbackForUpdate) {
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
    util.printMsgV2(`begin getting registration of artist class: ${ARTIST_CLASS[artistClass]}...`)
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumGetArtistInfo, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.printMsgV2(`finish getting registration of artist class: ${ARTIST_CLASS[artistClass]}`)
      outerCallback()
      callbackForUpdate()
    })
  }

  async callGetAllArtistInfo(outerCallback) {
    const tasks = []
    const bluebirdTasks = []
    _.forEach(ARTIST_CLASS, (v, k) => {
      bluebirdTasks.push(
        new bluebird.Promise((rev) => {
          const name = `artist-${v}`
          util.ifShouldUpdateData(name, shouldUpdate => {
            if (!shouldUpdate) {
              rev()
              return
            }
            const f = (callback) => {
              this.assignTaskByDiffPrefixOfName(k, callback, () => {
                util.updateDataDateInfo(name)
              })
            }
            tasks.push(f)
            rev()
          })
        })
      )
    })
    util.printMsgV1('Begin getting all of the artists information!')
    await bluebird.Promise.all(bluebirdTasks).then(() => {
      async.series(tasks, (err) => {
        if (err) {
          util.errMsg(err)
        }
        util.printMsgV1('Finish getting all of the artists information!')
        outerCallback()
      })
    })
  }
}

export default new Artist()

