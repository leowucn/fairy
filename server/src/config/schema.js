import serverConfig from '../config'
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// playlistInfo model
const playlistInfo = mongoose.model(serverConfig.COLLECTIONS.COLLECTION_PLAY_LIST_INFO, new Schema({
  title: { type: 'String', required: true },             // 歌单标题
  playlist: { type: 'String', required: true },          // 歌单地址后缀
  metaInfo: { type: 'String', required: true },          // 歌单所属音乐风格分类
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));


const playlistPropertySchema = new Schema({
  title: { type: 'String', required: true },              // 歌单标题
  playlist: { type: 'String', required: true },           // 歌单地址后缀
  introduction: { type: 'String', required: true },       // 歌单介绍
  playlistMusicCount: { type: 'Number', required: true }, // 歌单包含音乐的数目
  playCount: { type: 'Number', required: true },          // 歌单播放次数
  commentCount: { type: 'Number', required: true },       // 歌单评论次数
  shareCount: { type: 'Number', required: true },         // 歌单分享次数
  subscribedCount: { type: 'Number', required: true },    // 歌单订阅次数
  createTime: { type: 'Number', required: true },         // 歌单创建时间
}, {
  versionKey: false, // You should be aware of the outcome after set to false
});
// playlistPropertySchema.index({ playlist: 1 }); // schema level
// playlistProperty model
const playlistProperty = mongoose.model(serverConfig.COLLECTIONS.COLLECTION_PLAY_LIST_PROPERTY, playlistPropertySchema);

// musicRegistration model
const musicRegistration = mongoose.model(serverConfig.COLLECTIONS.COLLECTION_MUSIC_REGISTRATION, new Schema({
  id: { type: 'String', required: true },                 // 歌曲id
  name: { type: 'String', required: true },               // 歌曲名称
  playlist: { type: 'String', required: false },          // 所属歌单地址后缀
  artistName: { type: 'String', required: false },        // 所属音乐人的名字
  commentCount: { type: 'Number', required: false },      // 评论总数
  hotComments: { type: 'Array', required: false },        // 热门评论
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// artistRegistration model
const artistRegistration = mongoose.model(serverConfig.COLLECTIONS.COLLECTION_ARTIST_REGISTRATION, new Schema({
  id: { type: 'String', required: true },                 // 歌手id
  name: { type: 'String', required: true },               // 歌手名称
  fanCount: { type: 'Number', required: false },          // 歌手粉丝数
  artistClass: { type: 'String', required: true },        // 所属歌手类别分类，地址后缀形式表示
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// albumRegistration model
const albumRegistration = mongoose.model(serverConfig.COLLECTIONS.COLLECTION_ALBUM_REGISTRATION, new Schema({
  id: { type: 'String', required: true },                // 专辑id
  name: { type: 'String', required: true },              // 专辑名称
  artistId: { type: 'String', required: true },          // 歌手id
  artistName: { type: 'String', required: true },        // 歌手名字
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// dataDateInfo model
const dataDateInfo = mongoose.model(serverConfig.COLLECTIONS.COLLECTION_DATA_DATE_INFO, new Schema({
  name: { type: 'String', required: true },              // 名称，如果是歌手的专辑，则为 "歌手+专辑"
  date: { type: 'Number', required: true },              // 日期，用于在出现网络连接错误的情况下，再次获取数据不会重复之前成功的
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));


const schema = {
  playlistInfo,
  playlistProperty,
  musicRegistration,
  artistRegistration,
  albumRegistration,
  dataDateInfo,
}

export default schema;
