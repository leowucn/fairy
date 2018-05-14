import cheerio from 'cheerio'
import async from 'async'
import _ from 'lodash'
import autoBind from 'auto-bind'
import bluebird from 'bluebird'
import serverConfig from '../../config'
import database from '../database'
import util from '../../util/util'

class AlbumMusic {
  constructor() {
    autoBind(this)
  }
  getMusicListOfAlbum(album, index, total, outerCallback, callbackForUpdate) {
    const albumUrl = util.getAlbumUrl(album.id)
    util.getHtmlSourceCodeWithGetMethod(albumUrl).then(async (response) => {
      const $ = cheerio.load(response, { decodeEntities: false })
      $('#song-list-pre-cache').find('a').each(function (i, elem) {          // eslint-disable-line
        database.getArtistNameByArtistId(album.artistId, artistName => {
          const musicId = util.getNumberStringFromString($(this).attr('href'))
          const musicRegistration = {}
          musicRegistration.id = musicId
          musicRegistration.name = $(this).html()
          musicRegistration.artistId = album.artistId
          musicRegistration.artistName = artistName
          database.upsertMusicRegistration(musicRegistration)
        })
      });
      util.printMsgV2(`finish album ${album.name} which index = ${index}, total = ${total}`)
      outerCallback()
      callbackForUpdate()
    })
  }

  callGetAllMusicRegistrationOfAlbums(outerCallback) {
    const currentThis = this
    const tasks = []
    const bluebirdTasks = []
    let index = 0
    database.getAllAlbumRegistration(async (allAlbumRegistration) => {
      _.forEach(allAlbumRegistration, (album) => {
        bluebirdTasks.push(
          new bluebird.Promise((rev) => {
            const name = `album-music-${album.id}`
            util.ifShouldUpdateData(name, shouldUpdate => {
              if (!shouldUpdate) {
                rev()
                return
              }
              const f = (callback) => {
                currentThis.getMusicListOfAlbum(album, index, allAlbumRegistration.length, callback, () => {
                  util.updateDataDateInfo(name)
                })
                index++
              }
              tasks.push(f)
              rev()
            })
          })
        )
      })
      util.printMsgV1('Begin getting music information of all albums...')
      await bluebird.Promise.all(bluebirdTasks).then(() => {
        async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfAlbumsForGetMusicInfo, (err) => {
          if (err) {
            util.errMsg(err)
            return
          }
          util.printMsgV1('Finish getting music information of all albums!')
          outerCallback()
        })
      })
    })
  }
}

export default new AlbumMusic()
