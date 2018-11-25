import serverConfig from '../src/config'
import schema from '../src/config/schema'
export function getRanks(req, res) {
  const result = {}
  const ranks = []
  getCommentCountForMusicRank(serverConfig.musicCountPerPage, musicCommentRank => {
    ranks.push({ title: '音乐评论数排行榜', data: musicCommentRank })
    getCollectCountForPlaylistRank(serverConfig.musicCountPerPage, playlistCollectRank => {
      ranks.push({ title: '歌单收藏数排行榜', data: playlistCollectRank })
      getCommentCountForPlaylistRank(serverConfig.musicCountPerPage, playlistCommentRank => {
        ranks.push({ title: '歌单评论数排行榜', data: playlistCommentRank })
        getPlayTimesCountForPlaylistRank(serverConfig.musicCountPerPage, async playlistPlayTimesRank => {
          ranks.push({ title: '歌单播放数排行榜', data: playlistPlayTimesRank })
          const allDataDateInfo = await schema.playlistProperty.find({})
          result.ranks = ranks
          result.date = new Date().getTime()
          if (allDataDateInfo.length > 0) {
            result.date = allDataDateInfo[0].date
          }
          res.json(result)
        })
      })
    })
  })
}

/**
 * 根据音乐评论数生成的排行榜
 */
function getCommentCountForMusicRank(count = serverConfig.musicCountPerPage, callback) {
  const q = schema.musicRegistration.find({}).sort({ commentCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}

/**
 * 根据歌单收藏数生成的排行榜
 */
function getCollectCountForPlaylistRank(count = serverConfig.musicCountPerPage, callback) {
  const q = schema.playlistProperty.find({}).sort({ collectCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}

/**
 * 根据歌单评论数生成的排行榜
 */
function getCommentCountForPlaylistRank(count = serverConfig.musicCountPerPage, callback) {
  const q = schema.playlistProperty.find({}).sort({ commentCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}

/**
 * 根据歌单播放次数生成的排行榜
 */
function getPlayTimesCountForPlaylistRank(count = serverConfig.musicCountPerPage, callback) {
  const q = schema.playlistProperty.find({}).sort({ playCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}
