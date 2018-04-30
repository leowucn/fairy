import cheerio from 'cheerio'
import async from 'async'
import _ from 'lodash'
import autoBind from 'auto-bind'
import mongodb from 'mongodb'
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
        let musicRegistration = {}
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
    console.log(11)
    const currentThis = this
    const tasks = []
    let index = 0
    console.log(22)
    database.getAllAlbumRegistration(allAlbumRegistration => {
      console.log(33)
      console.log('44, allAlbumRegistration.length = ', allAlbumRegistration.length)
      _.forEach(allAlbumRegistration, (album) => {
        // if (!util.ifShouldUpdateData(`album-music-${album.id}`)) {
        //   return
        // }
        console.log(44)
        const f = (callback) => {
          currentThis.getMusicListOfAlbum(album, index, allAlbumRegistration.length, callback)
          index++
        }
        tasks.push(f)
      })
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
