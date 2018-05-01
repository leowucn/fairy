import schema from '../src/database/schema'
import database from '../src/database'
import config from '../config'
export function getRanks(req, res) {
  const result = {}
  const ranks = []
  getCommentCountForMusicRank(config.musicCountPerPage, musicCommentRank => {
    ranks.push({ title: '音乐评论数排行榜', data: musicCommentRank })
    getCollectCountForPlaylistRank(config.musicCountPerPage, playlistCollectRank => {
      ranks.push({ title: '歌单收藏数排行榜', data: playlistCollectRank })
      getCommentCountForPlaylistRank(config.musicCountPerPage, playlistCommentRank => {
        ranks.push({ title: '歌单评论数排行榜', data: playlistCommentRank })
        getPlayTimesCountForPlaylistRank(config.musicCountPerPage, playlistPlayTimesRank => {
          ranks.push({ title: '歌单播放数排行榜', data: playlistPlayTimesRank })
          database.getAllDataDateInfo(allDataDateInfo => {
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
  })
}

/**
 * 根据音乐评论数生成的排行榜
 */
function getCommentCountForMusicRank(count = config.musicCountPerPage, callback) {
  const q = schema.musicRegistration.find({}).sort({ commentCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}

/**
 * 根据歌单收藏数生成的排行榜
 */
function getCollectCountForPlaylistRank(count = config.musicCountPerPage, callback) {
  const q = schema.playlistProperty.find({}).sort({ collectCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}

/**
 * 根据歌单评论数生成的排行榜
 */
function getCommentCountForPlaylistRank(count = config.musicCountPerPage, callback) {
  const q = schema.playlistProperty.find({}).sort({ commentCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}

/**
 * 根据歌单播放次数生成的排行榜
 */
function getPlayTimesCountForPlaylistRank(count = config.musicCountPerPage, callback) {
  const q = schema.playlistProperty.find({}).sort({ playCount: -1 }).limit(count)
  q.exec((err, docs) => {
    callback(docs)
  })
}
