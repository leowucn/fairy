const config = {
  mongoURL: process.env.MONGO_URL || 'mongodb://localhost:27017/fairy',
  redisURL: process.env.REDIS_URL || 'redis://localhost:6379',
  port: process.env.PORT || 9528,

  bulkOperationInterval: 20,      // 每隔指定秒数扫描redis，把数据存放到mongodb，间隔太短，容易导致mongodb占用cpu使用率高过
  bulkOperationNum: 10000,         // 批量处理的数目

  // 设置评论抓取条件，抓取太多会过于占用磁盘空间
  countOfHotCommentThreshold: 10000,              // 对于热评数大于这个值的音乐才抓取评论
  countOfCommentFavorThreshold: 10000,            // 抓取评论时，之抓取点赞数大于这个值得评论
  // 对于页数类型的参数配置，-1表示没有限制
  maxPageIndexForPlaylist: 1,                     // 要抓取的歌单最大页数
  maxPageIndexForAlbum: -1,                       // 要抓取歌手的专辑的最大页数
  maxConcurrentNumGetPlaylistProperty: 30,        // 并发获取音乐歌单属性信息的歌单数目
  maxConcurrentNumOfMusicForGetMusicInfo: 30,     // 并发更新音乐评论数的歌曲数目
  maxConcurrentNumGetArtistInfo: 30,              // 并发获取歌手信息的数目
  maxConcurrentNumOfSingerForGetAlbum: 30,        // 要并发抓取专辑的歌手的数目
  maxConcurrentNumOfAlbumsForGetMusicInfo: 30,    // 要并发从专辑抓取歌曲信息的最大专辑数目
  updateDbInterval: 1000 * 3600 * 24 * 5,         // 隔多少毫秒后更新本地数据库
  musicCountPerPage: 100,                         // 给客户端每次请求排行榜显示多少数据

  options: {
    method: 'get',
    responseType: 'json',
    header: {
      Referer: 'http://music.163.com/',
      Host: 'music.163.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
    // proxy: {
    //   host: '61.135.217.7',
    //   port: 80,
    // },
    // proxy: {
    //   host: '101.81.141.175',
    //   port: 9999,
    // },
  },
  artistPrefixOfName: ['0', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],

  // ----------------------------redis------------------------------
  // redis set 存放缓存数据，用于后续mongod 根据键查出对应的值更新数据库
  REDIS_SET: {
    playlist_info_set: 'playlist',
    artist_registration_set: 'id',
    playlist_property_set: 'playlist',
    music_registration_set: 'id',
    album_registration_set: 'id',
  },
  // ---------------------------------------------------------------

   /**
   * 要抓取的网易云音乐根url
   */
  URL: {
    URL_ROOT_LIST: 'http://music.163.com',                                                        // 网易云音乐根url
    URL_MUSIC_STYLE: 'http://music.163.com/discover/playlist/?order=hot&cat=',                    // 网易云音乐音乐风格根url
    URL_ARTIST: 'http://music.163.com/discover/artist/',                                          // 网易云音乐歌手根url
    URL_MUSIC: 'http://music.163.com/api/playlist/detail?id=',
    URL_COMMENT_V1: 'http://music.163.com/weapi/v1/resource/comments/R_SO_4_{0}/?csrf_token=',
    URL_COMMENT_V2: 'http://music.163.com/api/v1/resource/comments/R_SO_4_',                      // get方法，最后需要拼一个歌曲id
    URL_ALBUM_LIST: 'http://music.163.com/artist/album',                                          // 专辑列表地址前缀
    URL_ALBUM: 'http://music.163.com/album?id=',                                                  // 专辑地址前缀
  },


  /**
   * 网易云音乐音乐风格部分, 可以作为指定音乐榜单的url后缀，需要做url编码转换
   */
  MUSIC_STYLE: [
    '华语',
    // '欧美',
    // '日语',
    // '韩语',
    // '粤语',
    // '小语种',
    // '流行',
    // '摇滚',
    // '民谣',
    // '电子',
    // '舞曲',
    // '说唱',
    // '轻音乐',
    // '爵士',
    // '乡村',
    // '古典',
    // '民族',
    // '英伦',
    // '金属',
    // '朋克',
    // '蓝调',
    // '雷鬼',
    // '世界音乐',
    // '拉丁',
    // '另类/独立',
    // 'New Age',
    // '古风',
    // '后摇',
    // 'Bossa Nova',
    // '清晨',
    // '夜晚',
    // '学习',
    // '工作',
    // '午休',
    // '下午茶',
    // '地铁',
    // '驾车',
    // '运动',
    // '旅行',
    // '散步',
    // '酒吧',
    // '怀旧',
    // '清新',
    // '浪漫',
    // '性感',
    // '伤感',
    // '治愈',
    // '放松',
    // '孤独',
    // '感动',
    // '兴奋',
    // '快乐',
    // '安静',
    // '思念',
    // '影视原声',
    // 'ACG',
    // '校园',
    // '游戏',
    // '70后',
    // '80后',
    // '90后',
    // '网络歌曲',
    // 'KTV',
    // '经典',
    // '翻唱',
    // '吉他',
    // '钢琴',
    // '器乐',
    // '儿童',
    // '榜单',
    // '00后',
  ],

  /**
   * 网易云音乐歌手部分, 可以作为指定音乐榜单的url后缀，需要做url编码转换
   */
  ARTIST_CLASS: {
    'cat?id=1001': '华语男歌手',
    // 'cat?id=1002': '华语女歌手',
    // 'cat?id=1003': '华语组合/乐队',
    // 'cat?id=2001': '欧美男歌手',
    // 'cat?id=2002': '欧美女歌手',
    // 'cat?id=2003': '欧美组合/乐队',
    // 'cat?id=6001': '日本男歌手',
    // 'cat?id=6002': '日本女歌手',
    // 'cat?id=6003': '日本组合/乐队',
    // 'cat?id=7001': '韩国男歌手',
    // 'cat?id=7002': '韩国女歌手',
    // 'cat?id=7003': '韩国组合/乐队',
    // 'cat?id=4001': '其他男歌手',
    // 'cat?id=4002': '其他女歌手',
    // 'cat?id=4003': '其他组合/乐队',
  },

  /**
   * 事件
   */
  EVENTS_DEF: {
    EVENT_NEW_PLAY_LIST: 'newPlaylist',    // 新的歌单列表
    EVENT_NEW_MUSIC: 'newMusic',           // 新的歌曲
  },

  /**
   * mongodb数据库collection名字
   */
  COLLECTIONS: {
    COLLECTION_PLAY_LIST_INFO: 'playlistinfos',                     // 存放歌单标题、地址、类别等信息
    COLLECTION_PLAY_LIST_PROPERTY: 'playlistProperty',              // 存放歌单的属性信息
    COLLECTION_MUSIC_REGISTRATION: 'musicRegistration',             // 存放音乐列表
    COLLECTION_ARTIST_REGISTRATION: 'artistRegistration',           // 存放歌手基本信息
    COLLECTION_ALBUM_REGISTRATION: 'albumRegistration',             // 存放专辑基本信息
    COLLECTION_DATA_DATE_INFO: 'dataDateInfo',                      // 存放更新时间信息，避免当重新运行程序时，短时间内抓取没有更新的数据
  },
};

export default config;

