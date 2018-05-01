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
  getMusicListOfAlbum(album, index, total, outerCallback) {
    const albumUrl = util.getAlbumUrl(album.id)
    util.getHtmlSourceCodeWithGetMethod(albumUrl).then((response) => {
      const $ = cheerio.load(response, { decodeEntities: false })
      $('#song-list-pre-cache').find('a').each(function (i, elem) {          // eslint-disable-line
        const musicId = util.getNumberStringFromString($(this).attr('href'))
        const musicRegistration = {}
        musicRegistration.id = musicId
        musicRegistration.name = $(this).html()
        musicRegistration.artistId = album.artistId
        database.upsertMusicRegistration(musicRegistration)
      });
      util.printMsgV2(`finish album ${album.name} which index = ${index}, total = ${total}`)
      outerCallback()
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
            util.ifShouldUpdateData(`album-music-${album.id}`, shouldUpdate => {
              if (!shouldUpdate) {
                rev()
                return
              }
              const f = (callback) => {
                currentThis.getMusicListOfAlbum(album, index, allAlbumRegistration.length, callback)
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
