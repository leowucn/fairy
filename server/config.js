const config = {
  mongoURL: process.env.MONGO_URL || 'mongodb://localhost:27017/fairy',
  port: process.env.PORT || 9528,

  // 对于页数类型的参数配置，-1表示没有限制
  maxPageIndexForPlaylist: -1,                     // 要抓取的歌单最大页数
  maxPageIndexForAlbum: -1,                       // 要抓取歌手的专辑的最大页数
  updatePlaylistPropertyInterval: 1,              // 更新音乐歌单的间隔时间，以天为单位
  maxConcurrentNumGetPlaylistProperty: 30,        // 并发获取音乐歌单属性信息的歌单数目
  maxConcurrentNumOfMusicForGetMusicInfo: 30,     // 并发更新音乐评论数的歌曲数目
  maxConcurrentNumGetArtistInfo: 30,              // 并发获取歌手信息的数目
  maxConcurrentNumOfSingerForGetAlbum: 30,        // 要并发抓取专辑的歌手的数目
  maxConcurrentNumOfAlbumsForGetMusicInfo: 30,    // 要并发从专辑抓取歌曲信息的最大专辑数目
  maxMsgLength: 80,                               // 表示在控制台打印的日志行的最大长度，此处假设日志长度不大于屏幕的最大宽度，理论上我不会使用这么长的日志

  updateIntervalDays: 10 * 8.64e+7,               // 隔多少毫秒后更新数据，默认10天

  musicCountPerPage: 100,                          // 给客户端每次请求排行榜显示多少数据


  options: {
    method: 'get',
    responseType: 'json', // default
    header: {
      Referer: 'http://music.163.com/',
      Host: 'music.163.com',
      // cSpell:disable
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
  // artistPrefixOfName: ['A'],
  // --------------------------------
};

export default config;

