import autoBind from 'auto-bind'
import _ from 'lodash'
import async from 'async'
import util from '../../util/util'
import serverConfig from '../config'
import redisWrapper, { hgetAsync, smembersAsync, hgetallAsync } from '../redis'

class Music {
  constructor() {
    autoBind(this)
  }
  updateMusicInfo(musicRegistration, index, total, outerCallback) {
    const currentThis = this
    const musicCommentUrl = util.getMusicCommentUrl(musicRegistration.id)
    util.getHtmlSourceCodeWithGetMethod(musicCommentUrl).then(async (response) => {
      const updatedMusicRegistration = musicRegistration
      updatedMusicRegistration.commentCount = response.total
      if (response.total > serverConfig.countOfHotCommentThreshold) {
        await currentThis.callGetHotCommentsOfMusic(musicRegistration)
      } else {
        await redisWrapper.storeInRedis('music_registration_set', `mugis-${musicRegistration.id}`, updatedMusicRegistration)
      }
      outerCallback()
      util.beautifulPrintMsgV2('获取音乐评论数和热门评论', `外部遍历序号: ${index}`, `总数: ${total}`, `${musicRegistration.name}`)
    })
  }

  callGetHotCommentsOfMusic(musicRegistration) {
    return new Promise(async (resolve) => {
      const musicCommentUrl = util.getMusicCommentUrl(musicRegistration.id)
      const response = await util.getHtmlSourceCodeWithGetMethod(musicCommentUrl)
      const hotComments = []
      _.forEach(response.hotComments, (commentInfo) => {
        if (commentInfo.likedCount > serverConfig.countOfCommentFavorThreshold) {
          const item = {}
          item.likedCount = commentInfo.likedCount
          item.content = commentInfo.content
          hotComments.push(item)
        }
      })
      musicRegistration.hotComments = hotComments
      await redisWrapper.storeInRedis('music_registration_set', `mugis-${musicRegistration.id}`, musicRegistration)
      resolve()
    })
  }


  async callUpdateAllMusicInfo(outerCallback) {
    const tasks = []

    const allMusicRegistrationKeys = await smembersAsync('music_registration_set')
    for (let i = 0; i < allMusicRegistrationKeys.length; i++) {
      const musicRegistration = await hgetallAsync(allMusicRegistrationKeys[i])
      const dataDateItemName = `music-${musicRegistration.id}`
      const lastUpdateDate = await hgetAsync('data_date_info_hash', dataDateItemName)
      const shouldUpdate = util.ifShouldUpdateData(lastUpdateDate)
      if (musicRegistration.commentCount && !shouldUpdate) {
        continue
      }
      const f = (callback) => {                  // eslint-disable-line
        this.updateMusicInfo(musicRegistration, i + 1, allMusicRegistrationKeys.length, () => {
          util.updateDataDateInfo(dataDateItemName)
          callback()
        })
      }
      tasks.push(f)
    }
    util.beautifulPrintMsgV1('..........开始获取音乐评论数和热门评论！..........')
    async.parallelLimit(tasks, serverConfig.maxConcurrentNumOfMusicForGetMusicInfo, (err) => {
      if (err) {
        util.errMsg(err)
      }
      util.beautifulPrintMsgV1('..........结束获取音乐评论数和热门评论！..........\n')
      outerCallback()
    })
  }
}

export default new Music()
