import _ from 'lodash'
import async from 'async'

import util from '../util/util'
import serverConfig from './config'
import playlist from './spider/playlist'  // 测试使用
import playlistProperty from './spider/playlist-property'  // 测试使用
import music from './spider/music'  // 测试使用
import artist from './spider/artist'
import albumList from './spider/album-list'
import albumMusic from './spider/album-music'
import redisWrapper, { flushallAsync } from './redis'


export async function run() {
  //----------------------------------------
  // await flushallAsync()
  setInterval(
    () => {
      redisWrapper.redisToMongodb()
    },
    serverConfig.bulkOperationInterval * 1000              // 每隔一段时间调用一次mongodb数据库写入函数
  )
  // --------------- 并发第1阶段---------------
  const firstStageFuncs = [
    redisWrapper.loadToRedis,
  ]
  // --------------- 并发第2阶段---------------
  const secondStageFuncs = [
    playlist.callGetPlaylistsForAllMusicStyle,
    artist.callGetAllArtistInfo,
  ]

  // --------------- 并发第3阶段---------------
  const thirdStageFuncs = [
    playlistProperty.callUpdateAllPlaylistProperty,
    albumList.callGetAlbumListForAllArtist,
  ]

  // --------------- 并发第4阶段---------------
  const fourthStageFuncs = [
    albumMusic.callGetAllMusicRegistrationOfAlbums,
  ]

  // --------------- 并发第5阶段---------------
  const fifthStageFuncs = [
    music.callUpdateAllMusicInfo,
  ]
  // --------------- 并发第6阶段---------------
  const sixthStageFuncs = [
    redisWrapper.storeDataDateInfo,
  ]

  const firstStageTask = createTaskForAsync(firstStageFuncs, 1)
  const secondStageTask = createTaskForAsync(secondStageFuncs, 2)
  const thirdStageTask = createTaskForAsync(thirdStageFuncs, 3)
  const fourthStageTask = createTaskForAsync(fourthStageFuncs, 4)
  const fifthStageTask = createTaskForAsync(fifthStageFuncs, 5)
  const sixthStageTask = createTaskForAsync(sixthStageFuncs, 6)

  const tasks = [
    firstStageTask,
    secondStageTask,
    thirdStageTask,
    // fourthStageTask,
    fifthStageTask,
    sixthStageTask,
  ]
  async.series(tasks, (err) => {
    if (err) {
      util.errMsg(err)
    }
    util.printMsgV1('Game over!')
  })
}

/**
 * 创建可以同时并发或者顺序运行的task，供async使用
 */
function createTaskForAsync(funcs, numberFlag) {
  const tasks = []
  return (outerCallback) => {
    _.forEach(funcs, (func) => {
      const f = (callback) => {
        func(callback)
      }
      tasks.push(f)
    })
    async.parallel(tasks, (err) => {
      if (err) {
        util.errMsg(err)
        outerCallback()
        return
      }
      util.printMsgV1(`Functions which should run at ${numberFlag} step have finished!`)
      outerCallback()
    })
  }
}
