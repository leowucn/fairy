import redis from 'redis';
import autoBind from 'auto-bind'
import _ from 'lodash'
import { promisify } from 'util'

import serverConfig from '../config';
import util from '../../util/util'
import schemaDef from '../database/schema'


const client = redis.createClient(serverConfig.redisURL);
client.on('error', (err) => {
  util.errMsg(`redis error: ${err}`)
});
export const smembersAsync = promisify(client.smembers).bind(client);
export const hgetallAsync = promisify(client.hgetall).bind(client);
export const hgetAsync = promisify(client.hget).bind(client)
export const flushallAsync = promisify(client.flushall).bind(client)
export const hsetAsync = promisify(client.hset).bind(client)

class RedisWrapper {
  constructor() {
    autoBind(this)
  }

  loadToRedis(outerCallback) {
    schemaDef.dataDateInfo.find({}, async (err, res) => {
      for (let i = 0; i < res.length; i++) {
        await hsetAsync('data_date_info_hash', res[i].name, res[i].date)
      }
      outerCallback()
    })
  }

  storeDataDateInfo(outerCallback) {
    client.hgetall('data_date_info_hash', (err, info) => {
      // console.log('-----info = ', info)
      if (!info) {
        return
      }
      const bulkOperations = []
      for (const [name, date] of Object.entries(info)) {
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
      // console.log('-----bulkOperations.length = ', bulkOperations.length)
      if (bulkOperations.length) {
        schemaDef.dataDateInfo.bulkWrite(bulkOperations)
        .then(() => {
          outerCallback()
        })
      }
    })
  }


  /**
   * 用来把抓取下来的数据，保存到redis
   * @param {string} setName   redis set 的名字，用来存放键值
   * @param {string} setItem   键值，比如"/playlist?id=515053982"，该字段只要唯一就行
   * @param {Object} itemInfo  值，保存抓取下来的数据，后续将被插入mongodb
   */
  storeInRedis(setName, setItem, itemInfo) {
    client.sadd(setName, setItem)
    _.forEach(itemInfo, (value, field) => {     // eslint-disable-line
      value = value || ''
      client.hset(setItem, field, value.toString())
    })
  }


  /**
   * 用来把redis中缓存的数据，保存到mongodb
   */
  redisToMongodb() {
    _.forEach(serverConfig.REDIS_SET, async (queryName, setName) => {
      let collection
      switch (setName) {
        case 'playlist_info_set':
          collection = schemaDef.playlistInfo
          break;
        case 'artist_registration_set':
          collection = schemaDef.artistRegistration
          break;
        case 'playlist_property_set':
          collection = schemaDef.playlistProperty
          break;
        case 'music_registration_set':
          collection = schemaDef.musicRegistration
          break;
        case 'album_registration_set':
          collection = schemaDef.albumRegistration
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
        client.srem(setName, hasWorkedItems)
        client.del(hasWorkedItems)
      }
    })
  }
}

export default new RedisWrapper()
