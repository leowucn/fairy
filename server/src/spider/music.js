import autoBind from 'auto-bind'
import _ from 'lodash'
import async from 'async'
import util from '../../util/util'
import serverConfig from '../config'
import database from '../database'
import redisWrapper, { hgetAsync } from '../redis'

class Music {
  constructor() {
    autoBind(this)
  }
  updateMusicInfo(musicRegistration, index, total, outerCallback) {
    const musicCommentUrl = util.getMusicCommentUrl(musicRegistration.id)
    util.getHtmlSourceCodeWithGetMethod(musicCommentUrl).then((response) => {
      const updatedMusicRegistration = musicRegistration
      updatedMusicRegistration.commentCount = response.total
      if (response.total > serverConfig.countOfHotCommentThreshold) {
        this.callGetHotCommentsOfMusic(musicRegistration, outerCallback())
      } else {
        redisWrapper.storeInRedis('music_registration_set', `mugis-${musicRegistration.id}`, updatedMusicRegistration)
        outerCallback()
      }
      util.printMsgV2(`update music name = ${musicRegistration.name}, index = ${index}, total = ${total}`)
    })
  }
  callUpdateAllMusicInfo(outerCallback) {
    const tasks = []
    database.getAllMusicRegistration(async (allMusicRegistration) => {
      for (let i = 0; i < allMusicRegistration.length; i++) {
        const music = allMusicRegistration[i]

        const dataDateItemName = `music-${music.id}`
        const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
        const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
        if (music.commentCount && !shouldUpdate) {
          continue
        }
        const f = (callback) => {                  // eslint-disable-line
          this.updateMusicInfo(music, i, allMusicRegistration.length, () => {
            util.updateDataDateInfo(dataDateItemName)
            callback()
          })
        }
        tasks.push(f)
      }
      util.printMsgV1('Begin update music comment information!')
      async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfMusicForGetMusicInfo, (err) => {
        if (err) {
          util.errMsg(err)
        }
        util.printMsgV1('Finish updating music comment information!')
        outerCallback()
      })
    })
  }

  callGetHotCommentsOfMusic(musicRegistration, callback) {
    const musicCommentUrl = util.getMusicCommentUrl(musicRegistration.id)
    util.getHtmlSourceCodeWithGetMethod(musicCommentUrl).then((response) => {
      const res = []
      _.forEach(response.hotComments, (commentInfo) => {
        if (commentInfo.likedCount > serverConfig.countOfCommentFavorThreshold) {
          const item = {}
          item.likedCount = commentInfo.likedCount
          item.content = commentInfo.content
          res.push(item)
        }
      })
      musicRegistration.hotComments = res
      redisWrapper.storeInRedis('music_registration_set', `mugis-${musicRegistration.id}`, musicRegistration)
      if (callback) {
        callback()
      }
    })
    .catch(() => {
      callback()
    })
  }
}

export default new Music()
