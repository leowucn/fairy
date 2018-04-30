import mongoose from 'mongoose';
import { COLLECTIONS } from '../spider/constants'

const Schema = mongoose.Schema;

// playlistInfo model
const playlistInfo = mongoose.model(COLLECTIONS.COLLECTION_PLAY_LIST_INFO, new Schema({
  title: { type: 'String', required: true },             // 歌单标题
  playlist: { type: 'String', required: true },          // 歌单地址后缀
  metaInfo: { type: 'String', required: true },          // 歌单所属音乐风格分类
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// playlistProperty model
const playlistProperty = mongoose.model(COLLECTIONS.COLLECTION_PLAY_LIST_PROPERTY, new Schema({
  title: { type: 'String', required: true },              // 歌单标题
  playlist: { type: 'String', required: true },           // 歌单地址后缀
  introduction: { type: 'String', required: true },       // 歌单介绍
  playCount: { type: 'Number', required: true },          // 歌单播放次数
  commentCount: { type: 'Number', required: true },       // 歌单评论次数
  collectCount: { type: 'Number', required: true },       // 歌单收藏次数
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// musicRegistration model
const musicRegistration = mongoose.model(COLLECTIONS.COLLECTION_MUSIC_REGISTRATION, new Schema({
  id: { type: 'String', required: true },                // 歌曲id
  name: { type: 'String', required: true },              // 歌曲名称
  playlist: { type: 'String', required: false },          // 所属歌单地址后缀
  artistId: { type: 'String', required: false },         // 所属音乐人的id
  commentCount: { type: 'Number', required: false },     // 评论总数
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// artistRegistration model
const artistRegistration = mongoose.model(COLLECTIONS.COLLECTION_ARTIST_REGISTRATION, new Schema({
  id: { type: 'String', required: true },                // 歌手id
  name: { type: 'String', required: true },              // 歌手名称
  artistClass: { type: 'String', required: true },       // 所属歌手类别分类，地址后缀形式表示
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// albumRegistration model
const albumRegistration = mongoose.model(COLLECTIONS.COLLECTION_ALBUM_REGISTRATION, new Schema({
  id: { type: 'String', required: true },                // 专辑id
  name: { type: 'String', required: true },              // 专辑名称
  artistId: { type: 'String', required: true },          // 所属歌手类别分类，地址后缀形式表示
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));

// dataDateInfo model
const dataDateInfo = mongoose.model(COLLECTIONS.COLLECTION_DATA_DATE_INFO, new Schema({
  name: { type: 'String', required: true },              // 名称，如果是歌手的专辑，则为 "歌手+专辑"
  date: { type: 'Number', required: true },              // 日期，用于在出现网络连接错误的情况下，再次获取数据不会重复之前成功的
}, {
  versionKey: false, // You should be aware of the outcome after set to false
}));


export const schemaDef = {
  playlistInfo,
  playlistProperty,
  musicRegistration,
  artistRegistration,
  albumRegistration,
  dataDateInfo,
}

