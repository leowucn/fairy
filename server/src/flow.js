import async from 'async'

import util from '../util/util'
import serverConfig from './config'
import playlist from './spider/playlist'
import playlistProperty from './spider/playlist-property'
import music from './spider/music'
import artist from './spider/artist'
import albumList from './spider/album-list'
import albumMusic from './spider/album-music'
import redisWrapper from './redis'


export function runSpider() {
  const processStags = [
    redisWrapper.loadToRedis,                             // 加载时间信息到redis

    playlist.callGetPlaylistsForAllMusicStyle,            // 针对每一种音乐风格获取音乐歌单
    playlistProperty.callUpdateAllPlaylistProperty,       // 针对每一个歌单，获取它的介绍信息和音乐清单

    // artist.callGetAllArtistInfo,                          // 获取歌手列表
    // albumList.callGetAlbumListForAllArtist,               // 针对每一个歌手获取他/她的专辑列表
    // albumMusic.callGetAllMusicRegistrationOfAlbums,       // 针对每一个专辑，获取它的音乐清单

    // music.callUpdateAllMusicInfo,                         // 针对每一首歌曲，获取它的评论数和热门评论

    redisWrapper.storeDataDateInfoToMongodb,                       // 把redis中的数据，存储到mongodb
  ]

  const stagesTasks = []
  for (let i = 0; i < processStags.length; i++) {
    const f = (callback) => {
      const dummyString = '.....................................'
      util.beautifulPrintMsgV1(dummyString.concat(`开始第 ${i + 1} 阶段的方法调用, 总共 ${processStags.length} 阶段！`).concat(dummyString))
      processStags[i](callback)
    }
    stagesTasks.push(f)
  }
  const dummyString = '...............................................................'
  util.beautifulPrintMsgV1(serverConfig.fariyAsciiBanner)
  util.beautifulPrintMsgV1(dummyString.concat('网易云音乐数据抓取 开始！').concat(dummyString))
  async.series(stagesTasks, (err) => {
    if (err) {
      util.errMsg(err)
    }
    util.beautifulPrintMsgV1(dummyString.concat('网易云音乐数据抓取 结束！').concat(dummyString))
  })
}
