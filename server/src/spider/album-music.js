import cheerio from 'cheerio'
import async from 'async'
import autoBind from 'auto-bind'
import serverConfig from '../config'
import database from '../database'
import util from '../../util/util'
import redisWrapper, { hgetAsync } from '../redis'

class AlbumMusic {
  constructor() {
    autoBind(this)
  }
  getMusicListOfAlbum(album, index, total, outerCallback) {
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
          redisWrapper.storeInRedis('music_registration_set', `mugis-${musicId}`, musicRegistration)
        })
      });
      util.printMsgV2(`finish album ${album.name.padEnd(40)} which index = ${`${index}`.padEnd(12)}, total = ${`${total}`.padEnd(12)}`)
      outerCallback()
    })
  }

  callGetAllMusicRegistrationOfAlbums(outerCallback) {
    const currentThis = this
    const tasks = []
    database.getAllAlbumRegistration(async (allAlbumRegistration) => {
      for (let i = 0; i < allAlbumRegistration.length; i++) {
        const album = allAlbumRegistration[i]
        const dataDateItemName = `album-music-${album.id}`
        const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
        const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
        if (!shouldUpdate) {
          continue
        }
        const f = (callback) => {          // eslint-disable-line
          currentThis.getMusicListOfAlbum(album, i, allAlbumRegistration.length, () => {
            util.updateDataDateInfo(dataDateItemName)
            callback()
          })
        }
        tasks.push(f)
      }
      util.printMsgV1('Begin getting music information of all albums...')
      async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfAlbumsForGetMusicInfo, (err) => {
        if (err) {
          util.errMsg(err)
          return
        }
        util.printMsgV1('Finish getting music information of all albums!')
        outerCallback()
      })
    })
  }
}

export default new AlbumMusic()
