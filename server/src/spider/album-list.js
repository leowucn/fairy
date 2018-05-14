import cheerio from 'cheerio'
import async from 'async'
import _ from 'lodash'
import autoBind from 'auto-bind'
import bluebird from 'bluebird'
import serverConfig from '../../config'
import util from '../../util/util'
import database from '../database'


class AlbumList {
  constructor() {
    autoBind(this)
  }

  getAlbumListForArtist(artistId, index, total, outerCallback, callbackForUpdate) {
    let url = util.getAlbumListUrl(artistId, 0)
    util.getHtmlSourceCodeWithGetMethod(url).then((response) => {
      let $ = cheerio.load(response, { decodeEntities: false })
      const aSize = $('div[class=u-page]').find('a').length
      let maxPageIndex = 1
      $('div[class=u-page]').find('a').each(function (i, elem) {               // eslint-disable-line
        if (i === aSize - 2) {
          maxPageIndex = Number($(this).html())
        }
      });
      maxPageIndex = serverConfig.maxPageIndexForAlbum <= 0 ? maxPageIndex : serverConfig.maxPageIndexForAlbum
      const tasks = []
      let albumNum = 0
      for (let pageIndex = 1; pageIndex <= maxPageIndex; pageIndex++) {
        const f = function (callback) {                                      // eslint-disable-line
          url = util.getAlbumListUrl(artistId, pageIndex)
          util.getHtmlSourceCodeWithGetMethod(url).then((b) => {
            $ = cheerio.load(b, { decodeEntities: false })
            $('#m-song-module').find('li').each(function (i, elem) {          // eslint-disable-line
              $ = cheerio.load(this, { decodeEntities: false })
              const albumId = util.getNumberStringFromString($('.tit').attr('href'))
              const albumRegistration = {}
              albumRegistration.id = albumId
              albumRegistration.name = $('.tit').html()
              albumRegistration.artistId = artistId
              database.upsertAlbumRegistration(albumRegistration)

              albumNum++
              util.printMsgV2(`get ${albumRegistration.name} which index = ${index}, total = ${total} albums over!`)
            });
            callback()
          }).catch((err) => {
            util.errMsg(err)
          })
        }
        tasks.push(f)
      }
      async.parallel(tasks, (err) => {
        if (err) {
          util.errMsg(err)
          return
        }
        outerCallback()
        callbackForUpdate()
      })
    }).catch((err) => {
      util.errMsg(err)
    })
  }

  callGetAlbumListForAllArtist(outerCallback) {
    const tasks = []
    const bluebirdTasks = []
    database.getAllArtistRegistration(async (allArtistRegistration) => {
      _.forEach(allArtistRegistration, (artistInfo, index) => {
        bluebirdTasks.push(
          new bluebird.Promise((rev) => {
            const name = `album-list-${artistInfo.id}`
            util.ifShouldUpdateData(name, shouldUpdate => {
              // if (!shouldUpdate) {
              //   rev()
                // return
              // }
              const f = (callback) => {
                this.getAlbumListForArtist(artistInfo.id, index, allArtistRegistration.length, callback, () => {
                  util.updateDataDateInfo(name)
                })
              }
              tasks.push(f)
              rev()
            })
          })
        )
      })
      util.printMsgV1('Begin getting albums list of each artist...')
      await bluebird.Promise.all(bluebirdTasks).then(() => {
        async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfSingerForGetAlbum, (err) => {
          if (err) {
            util.errMsg(err)
          }
          util.printMsgV1('Finish getting albums list of each artist!')
          outerCallback()
        })
      })
    })
  }
}

export default new AlbumList()
