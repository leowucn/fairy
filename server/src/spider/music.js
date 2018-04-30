import autoBind from 'auto-bind'
import _ from 'lodash'
import async from 'async'
import util from '../../util/util'
import serverConfig from '../../config'
import database from '../database'

class Music {
  constructor() {
    autoBind(this)
  }
  updateMusicInfo(musicRegistration, index, total, outerCallback) {
    const musicCommentUrl = util.getMusicCommentUrl(musicRegistration.id)
    util.getHtmlSourceCodeWithGetMethod(musicCommentUrl).then((response) => {
      const updatedMusicRegistration = musicRegistration
      updatedMusicRegistration.commentCount = response.total
      database.upsertMusicRegistration(updatedMusicRegistration)
      util.printMsgV2(`update music name = ${musicRegistration.name}, index = ${index}, total = ${total}`)
      callback()
    })
  }
  callUpdateAllMusicInfo(outerCallback) {
    const tasks = []
    let index = 0
    database.getAllMusicRegistration(allMusicRegistration => {
      _.forEach(allMusicRegistration, (item) => {
        // if (!util.ifShouldUpdateData(`music-${item.id}`)) {
        //   return
        // }
        const f = (callback) => {
          this.updateMusicInfo(item, index, allMusicRegistration.length, callback)
          index++
        }
        tasks.push(f)
      })
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

  callGetHotCommentsOfMusic(musicId, callback) {
    const musicCommentUrl = util.getMusicCommentUrl(musicId)
    util.getHtmlSourceCodeWithGetMethod(musicCommentUrl).then((response) => {
      const res = []
      _.forEach(response.hotComments, (commentInfo) => {
        const item = {}
        item.likedCount = commentInfo.likedCount
        item.content = commentInfo.content
        res.push(item)
      })
      callback(res.slice(0, 10))
    })
  }
}

export default new Music()
