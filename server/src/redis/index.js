import redis from 'redis';
import autoBind from 'auto-bind'
import _ from 'lodash'
import { promisify } from 'util'

import serverConfig from '../config';
import util from '../../util/util'
import schema from '../config/schema'


export const redisClient = redis.createClient(serverConfig.redisURL);
redisClient.on('error', (err) => {
  util.errMsg(`redis error: ${err}`)
});
export const smembersAsync = promisify(redisClient.smembers).bind(redisClient);
export const hgetallAsync = promisify(redisClient.hgetall).bind(redisClient);
export const hgetAsync = promisify(redisClient.hget).bind(redisClient)
export const hdelAsync = promisify(redisClient.hdel).bind(redisClient)
export const flushallAsync = promisify(redisClient.flushall).bind(redisClient)
export const hsetAsync = promisify(redisClient.hset).bind(redisClient)
export const saddAsync = promisify(redisClient.sadd).bind(redisClient)
export const sismemberAsync = promisify(redisClient.sismember).bind(redisClient)

class RedisWrapper {
  constructor() {
    autoBind(this)
  }

  async loadToRedis(outerCallback) {
    const allDataDateInfo = await schema.dataDateInfo.find({})
    for (let i = 0; i < allDataDateInfo.length; i++) {
      await hsetAsync('data_date_info_hash', allDataDateInfo[i].name, allDataDateInfo[i].date)
    }

    const allPlaylistInfos = await schema.playlistInfo.find({})
    for (let i = 0; i < allPlaylistInfos.length; i++) {
      const playlistInfo = allPlaylistInfos[i]._doc
      await this.storeInRedis('playlist_info_set', `plist-${playlistInfo.playlist}`, playlistInfo)
    }

    const allArtistRegistration = await schema.artistRegistration.find({})
    for (let i = 0; i < allArtistRegistration.length; i++) {
      const artistRegistration = allArtistRegistration[i]._doc
      await this.storeInRedis('artist_registration_set', `artist-${artistRegistration.id}`, artistRegistration)
    }

    const allPlaylistPropertys = await schema.playlistProperty.find({})
    for (let i = 0; i < allPlaylistPropertys.length; i++) {
      const playlistProperty = allPlaylistPropertys[i]._doc
      await this.storeInRedis('playlist_property_set', `prepty-${playlistProperty.playlist}`, playlistProperty)
    }
    const allMusicRegistration = await schema.musicRegistration.find({})
    for (let i = 0; i < allMusicRegistration.length; i++) {
      const musicRegistration = allMusicRegistration[i]._doc
      await this.storeInRedis('music_registration_set', `mugis-${musicRegistration.id}`, musicRegistration)
    }

    const allAlbumRegistration = await schema.albumRegistration.find({})
    for (let i = 0; i < allAlbumRegistration.length; i++) {
      const albumRegistration = allAlbumRegistration[i]._doc
      await this.storeInRedis('album_registration_set', `alist-${albumRegistration.id}`, albumRegistration)
    }
    outerCallback()
  }


  /**
   * 用来把抓取下来的数据，保存到redis
   * @param {string} setName   redis set 的名字，用来存放键值
   * @param {string} setItem   键值，比如"/playlist?id=515053982"，该字段只要唯一就行
   * @param {Object} itemInfo  值，保存抓取下来的数据，后续将被插入mongodb
   */
  storeInRedis(setName, setItem, itemInfo) {
    return new Promise(async (resolve) => {
      await saddAsync(setName, setItem)
      for (let [key, value] of Object.entries(itemInfo)) {   // eslint-disable-line
        value = value || ''
        await hsetAsync(setItem, key, value.toString())
      }
      resolve()
    })
  }

  deleteHashMembersWithStartsString(key, startWithString) {
    return new Promise(async resolve => {
      try {
        const hashObj = await hgetallAsync(key)
        for (let [k, v] of Object.entries(hashObj)) {   // eslint-disable-line
          if (k.startsWith(startWithString)) {
            await hdelAsync(key, k)
          }
        }
        console.log('delete ok!')
        resolve()
      } catch (err) {
        console.log('delete ok!')
        resolve()
      }
    })
  }


  /**
   * 用来把redis中缓存的数据，保存到mongodb
   */
  redisDataToMongodb() {
    _.forEach(serverConfig.REDIS_SET, async (queryName, setName) => {
      let collection
      switch (setName) {
        case 'playlist_info_set':
          collection = schema.playlistInfo
          break;
        case 'artist_registration_set':
          collection = schema.artistRegistration
          break;
        case 'playlist_property_set':
          collection = schema.playlistProperty
          break;
        case 'music_registration_set':
          collection = schema.musicRegistration
          break;
        case 'album_registration_set':
          collection = schema.albumRegistration
          break;
        default:
          break;
      }
      if (!collection) {
        throw Error('setName = ', setName, ', 此处有未处理的redis set!')
      }
      const setItems = await smembersAsync(setName)
      const bulkOperations = []
      const hasWorkedItems = []
      for (let i = 0; i < Math.min(setItems.length, serverConfig.bulkOperationNum); i++) {
        const info = await hgetallAsync(setItems[i])
        if (!info) {
          continue
        }
        bulkOperations.push({
          updateOne: {
            filter: { [queryName]: info[queryName] },
            update: info,
            upsert: true,
          },
        })
        hasWorkedItems.push(setItems[i])
      }
      if (hasWorkedItems.length) {
        collection.bulkWrite(bulkOperations)
        redisClient.srem(setName, hasWorkedItems)
        redisClient.del(hasWorkedItems)
      }
    })
  }

  async storeDataDateInfoToMongodb(outerCallback) {
    setInterval(
      () => {
        this.redisDataToMongodb()
      },
      serverConfig.bulkOperationInterval                     // 每隔一段时间调用一次mongodb数据库写入函数
    )

    const dataDateHash = await hgetallAsync('data_date_info_hash')
    if (!dataDateHash) {
      return
    }
    const bulkOperations = []
    for (const [name, date] of Object.entries(dataDateHash)) {
      if ((new Date().getTime() - date) < serverConfig.updateDbInterval) {
        bulkOperations.push({
          updateOne: {
            filter: { name },
            update: { date, name },
            upsert: true,
          },
        })
      }
    }
    if (bulkOperations.length) {
      schema.dataDateInfo.bulkWrite(bulkOperations)
      .then(() => {
        outerCallback()
      })
    }
  }
}

export default new RedisWrapper()
