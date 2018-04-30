import _ from 'lodash'
import async from 'async'
import { database } from './global'
import util from '../util/util'

import playlist from './spider/playlist'  // 测试使用
import playlistProperty from './spider/playlist-property'  // 测试使用
import music from './spider/music'  // 测试使用
import artist from './spider/artist'
import albumList from './spider/album-list'
import albumMusic from './spider/album-music'


export function run() {
  // --------------- 并发1阶段---------------
  const firstStageFuncs = [
    // playlist.callGetPlaylistsForAllMusicStyle,
    artist.callGetAllArtistInfo,
  ]

  // --------------- 并发2阶段---------------
  const seconddStageFuncs = [
    // playlistProperty.callUpdateAllPlaylistProperty,
    albumList.callGetAlbumListForAllArtist,
  ]

  // --------------- 并发3阶段---------------
  const thirdStageFuncs = [
    albumMusic.callGetAllMusicRegistrationOfAlbums,
  ]

  // --------------- 并发4阶段---------------
  const forthStageFuncs = [
    music.callUpdateAllMusicInfo,
  ]

  const firstStageTask = createTaskForAsync(firstStageFuncs, 1)
  const secondStageTask = createTaskForAsync(seconddStageFuncs, 2)
  const thirdStageTask = createTaskForAsync(thirdStageFuncs, 3)
  const forthStageTask = createTaskForAsync(forthStageFuncs, 4)

  const tasks = [
    firstStageTask,
    secondStageTask,
    thirdStageTask,
    forthStageTask,
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
