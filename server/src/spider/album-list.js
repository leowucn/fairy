import cheerio from 'cheerio'
import async from 'async'
import autoBind from 'auto-bind'
import serverConfig from '../config'
import util from '../../util/util'
import database from '../database'
import redisWrapper, { hgetAsync } from '../redis'


class AlbumList {
  constructor() {
    autoBind(this)
  }

  getAlbumListForArtist(artistId, index, total, outerCallback) {
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
              redisWrapper.storeInRedis('album_registration_set', `alist-${albumId}`, albumRegistration)

              albumNum++
              util.printMsgV2(`获取专辑：${albumRegistration.name.padEnd(40)}, 序号：${`${index}`.padEnd(12)}, 总数：${`${total}`.padEnd(12)} albums over!`)
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
      })
    }).catch((err) => {
      util.errMsg(err)
    })
  }

  callGetAlbumListForAllArtist(outerCallback) {
    const tasks = []
    database.getAllArtistRegistration(async (allArtistRegistration) => {
      for (let i = 0; i < allArtistRegistration.length; i++) {
        const artistInfo = allArtistRegistration[i]
        const dataDateItemName = `album-list-${artistInfo.id}`
        const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
        const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
        if (!shouldUpdate) {
          continue
        }
        const f = (callback) => {
          this.getAlbumListForArtist(artistInfo.id, i, allArtistRegistration.length, () => {
            util.updateDataDateInfo(dataDateItemName)
            callback()
          })
        }
        tasks.push(f)
      }
      util.printMsgV1('Begin getting albums list of each artist...')
      async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfSingerForGetAlbum, (err) => {
        if (err) {
          util.errMsg(err)
        }
        util.printMsgV1('Finish getting albums list of each artist!')
        outerCallback()
      })
    })
  }
}

export default new AlbumList()
