import cheerio from 'cheerio'
import async from 'async'
import autoBind from 'auto-bind'
import bluebird from 'bluebird'
import serverConfig from '../config'
import util from '../../util/util'
import redisWrapper, { hgetAsync, smembersAsync, hgetallAsync } from '../redis'

class AlbumMusic {
  constructor() {
    autoBind(this)
  }
  getMusicListOfAlbum(album, index, total, outerCallback) {
    const albumUrl = util.getAlbumUrl(album.id)
    util.getHtmlSourceCodeWithGetMethod(albumUrl).then(async (response) => {
      const promiseTasks = []
      const $ = cheerio.load(response, { decodeEntities: false })
      $('#song-list-pre-cache').find('a').each(async function (i, elem) {
        const musicId = util.getNumberStringFromString($(this).attr('href'))
        const musicRegistration = {}
        musicRegistration.id = musicId
        musicRegistration.name = $(this).html()
        musicRegistration.artistId = album.artistId
        musicRegistration.artistName = album.artistName
        promiseTasks.push(
          redisWrapper.storeInRedis('music_registration_set', `mugis-${musicId}`, musicRegistration)
        )
      });
      util.beautifulPrintMsgV2('获取专辑音乐清单', `外部遍历序号: ${index}`, `总数: ${total}`, `${album.name}`)
      await bluebird.Promise.all(promiseTasks)
      outerCallback()
    })
  }

  async callGetAllMusicRegistrationOfAlbums(outerCallback) {
    const currentThis = this
    const tasks = []

    const allAlbumRegistrationKeys = await smembersAsync('album_registration_set')
    for (let i = 0; i < allAlbumRegistrationKeys.length; i++) {
      const album = await hgetallAsync(allAlbumRegistrationKeys[i])
      const dataDateItemName = `album-music-${album.id}`
      const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
      const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
      if (!shouldUpdate) {
        continue
      }
      const f = async (callback) => {          // eslint-disable-line
        currentThis.getMusicListOfAlbum(album, i + 1, allAlbumRegistrationKeys.length, () => {
          util.updateDataDateInfo(dataDateItemName)
          callback()
        })
      }
      tasks.push(f)
    }
    util.beautifulPrintMsgV1('..........开始 针对每一个音乐专辑，获取它的音乐清单!..........')
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfAlbumsForGetMusicInfo, (err) => {
      if (err) {
        util.errMsg(err)
        return
      }
      util.beautifulPrintMsgV1('..........结束 针对每一个音乐专辑，获取它的音乐清单!..........\n')
      outerCallback()
    })
  }
}

export default new AlbumMusic()
