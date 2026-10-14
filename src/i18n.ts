// EN / 中文 / BM strings. Every language must have exactly the same keys (scripts/i18n-check.mjs).
export type Lang = 'en' | 'zh' | 'ms';
const en = {
  title: 'Mount Kinabalu', subtitle: 'Hike replay', tagline: 'Timpohon Gate to Low\'s Peak, 4,095 m',
  play: 'Play', pause: 'Pause', again: 'Replay', loop: 'Loop', speed: 'Speed',
  views: { auto: 'Auto', follow: 'Follow', oblique: 'Oblique', top: 'Top', reset: 'Reset' },
  colour: 'Colour', mono: 'Mono',
  live: 'Live data', clock: 'Time', elevation: 'Elevation', distance: 'Distance', elapsed: 'Elapsed', day: 'Day',
  chart: 'Elevation profile', checkpoints: 'Checkpoints', location: 'Location', credits: 'Sources & credits',
  typical: 'TYPICAL', typicalNote: 'The timeline is a typical two-day guided climb, not a recorded hike: Timpohon Gate to Laban Rata takes 3 to 6 hours and Laban Rata to Low\'s Peak 2 to 4 hours (Wikipedia). Start times are the usual pattern; add your own photos to place your day on it.',
  night: 'Night at Laban Rata', nightText: 'Dinner, a few hours of sleep, and the 2:30 am start for the summit.', skip: 'Skip',
  cp: { timpohon: 'Timpohon Gate', kandis: 'Pondok Kandis', ubah: 'Pondok Ubah', lowii: 'Pondok Lowii', mempening: 'Pondok Mempening', layang: 'Pondok Layang-Layang', vilosa: 'Pondok Vilosa', paka: 'Pondok Paka', labanrata: 'Laban Rata', sayat: 'Sayat-Sayat', lowspeak: 'Low\'s Peak' },
  cpKind: { timpohon: 'Start gate', labanrata: 'Rest house (overnight)', sayat: 'Checkpoint', lowspeak: 'Summit', shelter: 'Shelter' },
  eleSrc: { osm: 'height from OSM', wikipedia: 'height from Wikipedia' },
  parkhq: 'Park HQ', borneo: 'Borneo', sabah: 'Sabah', kk: 'Kota Kinabalu',
  media: 'Your photos', addMedia: 'Add photos / videos', mediaNote: 'Files stay on this device: nothing is uploaded.',
  mediaDay1: 'Day 1 date', mediaOffset: 'Camera clock offset (h)', mediaNone: 'No photos yet.',
  placedGps: 'GPS: snapped to the trail', placedTime: 'Time only: placed on the typical timeline', unplaced: 'No GPS or time: not placed', outside: 'Time outside the climb',
  heicNote: 'HEIC: metadata read; this browser cannot show the image', close: 'Close',
  units: { m: 'm', km: 'km' },
  sources: [
    'Terrain: Copernicus GLO-30 DEM, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA. Heights exaggerated 1.6×.',
    'Trail, checkpoints and peaks: © OpenStreetMap contributors (ODbL).',
    'Heights of Timpohon Gate (1,866 m), Laban Rata (3,270 m) and Low\'s Peak (4,095 m), and walking times: Wikipedia, "Mount Kinabalu" (fetched 2026-10-14). Shelter heights: OSM ele tags.',
    'Borneo outline: Natural Earth (public domain).',
    'The OSM trail is 8.0 km; signposts give about 8.7 km, so the drawn line is slightly simplified.',
  ],
  hint: 'Drag to rotate · scroll to zoom', loading: 'Loading terrain…', reduced: 'Reduced motion: animations are off',
};
type Dict = typeof en;
const zh: Dict = {
  title: '京那巴鲁山', subtitle: '登山回放', tagline: '廷波洪门至罗氏峰，4,095 米',
  play: '播放', pause: '暂停', again: '重播', loop: '循环', speed: '速度',
  views: { auto: '自动', follow: '跟随', oblique: '斜视', top: '俯视', reset: '重置' },
  colour: '彩色', mono: '单色',
  live: '实时数据', clock: '时间', elevation: '海拔', distance: '距离', elapsed: '用时', day: '第几天',
  chart: '海拔剖面', checkpoints: '检查点', location: '位置', credits: '资料来源与致谢',
  typical: '典型', typicalNote: '时间线是典型的两天导游登山行程，并非实际记录：廷波洪门至拉班拉打需 3 至 6 小时，拉班拉打至罗氏峰需 2 至 4 小时（维基百科）。出发时间为常见安排；加入您的照片即可把您的行程放上去。',
  night: '在拉班拉打过夜', nightText: '晚餐、睡几个小时，凌晨 2:30 出发冲顶。', skip: '跳过',
  cp: { timpohon: '廷波洪门', kandis: 'Kandis 休息亭', ubah: 'Ubah 休息亭', lowii: 'Lowii 休息亭', mempening: 'Mempening 休息亭', layang: 'Layang-Layang 休息亭', vilosa: 'Vilosa 休息亭', paka: 'Paka 休息亭', labanrata: '拉班拉打', sayat: '沙亚沙亚', lowspeak: '罗氏峰' },
  cpKind: { timpohon: '起点', labanrata: '山屋（过夜）', sayat: '检查站', lowspeak: '山顶', shelter: '休息亭' },
  eleSrc: { osm: '高度来自 OSM', wikipedia: '高度来自维基百科' },
  parkhq: '公园总部', borneo: '婆罗洲', sabah: '沙巴', kk: '亚庇',
  media: '您的照片', addMedia: '添加照片／视频', mediaNote: '文件只留在本设备上，不会上传。',
  mediaDay1: '第 1 天日期', mediaOffset: '相机时钟偏差（小时）', mediaNone: '还没有照片。',
  placedGps: 'GPS：已对齐到步道', placedTime: '仅有时间：按典型时间线放置', unplaced: '没有 GPS 或时间：未放置', outside: '时间不在登山期间',
  heicNote: 'HEIC：已读取元数据；此浏览器无法显示图像', close: '关闭',
  units: { m: '米', km: '公里' },
  sources: [
    '地形：Copernicus GLO-30 DEM，© DLR e.V. 2010-2014 及 © Airbus Defence and Space GmbH 2014-2018，由欧盟与欧洲航天局依 COPERNICUS 提供。高度夸大 1.6 倍。',
    '步道、检查点与山峰：© OpenStreetMap 贡献者（ODbL）。',
    '廷波洪门（1,866 米）、拉班拉打（3,270 米）与罗氏峰（4,095 米）的高度及步行时间：维基百科 "Mount Kinabalu"（2026-10-14 获取）。休息亭高度：OSM ele 标签。',
    '婆罗洲轮廓：Natural Earth（公有领域）。',
    'OSM 步道长 8.0 公里；路标约为 8.7 公里，所以画出的线略有简化。',
  ],
  hint: '拖动旋转 · 滚轮缩放', loading: '正在加载地形…', reduced: '减少动态：动画已关闭',
};
const ms: Dict = {
  title: 'Gunung Kinabalu', subtitle: 'Ulang tayang pendakian', tagline: 'Pintu Timpohon ke Puncak Low, 4,095 m',
  play: 'Main', pause: 'Jeda', again: 'Main semula', loop: 'Ulang', speed: 'Kelajuan',
  views: { auto: 'Auto', follow: 'Ikut', oblique: 'Serong', top: 'Atas', reset: 'Set semula' },
  colour: 'Warna', mono: 'Mono',
  live: 'Data langsung', clock: 'Masa', elevation: 'Ketinggian', distance: 'Jarak', elapsed: 'Tempoh', day: 'Hari',
  chart: 'Profil ketinggian', checkpoints: 'Pusat pemeriksaan', location: 'Lokasi', credits: 'Sumber & penghargaan',
  typical: 'BIASA', typicalNote: 'Garis masa ialah pendakian berpandu dua hari yang biasa, bukan rekod sebenar: Pintu Timpohon ke Laban Rata mengambil 3 hingga 6 jam dan Laban Rata ke Puncak Low 2 hingga 4 jam (Wikipedia). Waktu bertolak ialah corak biasa; tambah foto anda untuk meletakkan hari anda padanya.',
  night: 'Malam di Laban Rata', nightText: 'Makan malam, tidur beberapa jam, dan bertolak ke puncak pada 2:30 pagi.', skip: 'Langkau',
  cp: { timpohon: 'Pintu Timpohon', kandis: 'Pondok Kandis', ubah: 'Pondok Ubah', lowii: 'Pondok Lowii', mempening: 'Pondok Mempening', layang: 'Pondok Layang-Layang', vilosa: 'Pondok Vilosa', paka: 'Pondok Paka', labanrata: 'Laban Rata', sayat: 'Sayat-Sayat', lowspeak: 'Puncak Low' },
  cpKind: { timpohon: 'Pintu permulaan', labanrata: 'Rumah rehat (bermalam)', sayat: 'Pusat pemeriksaan', lowspeak: 'Puncak', shelter: 'Pondok' },
  eleSrc: { osm: 'ketinggian daripada OSM', wikipedia: 'ketinggian daripada Wikipedia' },
  parkhq: 'Ibu Pejabat Taman', borneo: 'Borneo', sabah: 'Sabah', kk: 'Kota Kinabalu',
  media: 'Foto anda', addMedia: 'Tambah foto / video', mediaNote: 'Fail kekal pada peranti ini: tiada yang dimuat naik.',
  mediaDay1: 'Tarikh hari 1', mediaOffset: 'Ofset jam kamera (j)', mediaNone: 'Belum ada foto.',
  placedGps: 'GPS: dilekatkan pada denai', placedTime: 'Masa sahaja: diletakkan pada garis masa biasa', unplaced: 'Tiada GPS atau masa: tidak diletakkan', outside: 'Masa di luar pendakian',
  heicNote: 'HEIC: metadata dibaca; pelayar ini tidak dapat memaparkan imej', close: 'Tutup',
  units: { m: 'm', km: 'km' },
  sources: [
    'Rupa bumi: Copernicus GLO-30 DEM, © DLR e.V. 2010-2014 dan © Airbus Defence and Space GmbH 2014-2018, disediakan di bawah COPERNICUS oleh Kesatuan Eropah dan ESA. Ketinggian dibesarkan 1.6×.',
    'Denai, pusat pemeriksaan dan puncak: © penyumbang OpenStreetMap (ODbL).',
    'Ketinggian Pintu Timpohon (1,866 m), Laban Rata (3,270 m) dan Puncak Low (4,095 m), dan masa berjalan: Wikipedia, "Mount Kinabalu" (diambil 2026-10-14). Ketinggian pondok: tag ele OSM.',
    'Garis pantai Borneo: Natural Earth (domain awam).',
    'Denai OSM sepanjang 8.0 km; papan tanda memberi kira-kira 8.7 km, jadi garisan yang dilukis sedikit dipermudah.',
  ],
  hint: 'Seret untuk putar · tatal untuk zum', loading: 'Memuatkan rupa bumi…', reduced: 'Gerakan dikurangkan: animasi dimatikan',
};
export const dicts: Record<Lang, Dict> = { en, zh, ms };
let lang: Lang = (() => { const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'zh' || q === 'ms') return q; const s = localStorage.getItem('mr-lang'); return s === 'zh' || s === 'ms' ? s : 'en'; })();
export const t = () => dicts[lang];
export const getLang = () => lang;
export function setLang(l: Lang) { lang = l; localStorage.setItem('mr-lang', l); document.documentElement.lang = l === 'zh' ? 'zh-Hans' : l; }
