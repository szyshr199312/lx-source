/*!
 * @name 洋仔聚合音源
 * @description QQ音乐 / 网易云 / 酷我 / 酷狗 / 咪咕 / 汽水，六平台聚合（杰翔+轻量+星澜+星海）
 * @version 1.0.5
 * @author 洋仔
 * @homepage https://github.com/szyshr199312/lx-source
 * @license MIT
 * @update 2026-11-21
 */

/*
 * 构建说明（不是洛雪元数据字段，仅作记录）
 *   打包子源: jiexiang + qingliang + xinglan + xinghai
 *   构建时间: 2026-11-21T11:17:38.864Z
 *   技术路线: 源码级内联，不使用 eval / new Function，兼容 React Native / Hermes
 *   调度策略: 串行 fallback，按打包顺序优先，首个可用结果即返回
 *   平台声明: 每个平台沿用"第一优先源"的原始 qualitys / actions，不做合并
 *   音质筛选: 请求的音质只有被该子源明确声明时才成为候选，防止错配返回垃圾地址
 */
;(function () {
  'use strict'

  var G = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this)
  var __lx = G.lx
  if (!__lx) {
    try { console.error('[洋仔聚合] 未检测到 lx 环境') } catch (e) {}
    return
  }

  var EN = __lx.EVENT_NAMES || {}
  var EV_REQ = EN.request || 'request'
  var EV_INIT = EN.inited || 'inited'
  var SELF_NAME = '洋仔聚合音源'
  var SELF_VERSION = '1.0.5'

  var SUBS = []

  function __SUB_REGISTER(name, rawScript) {
    var state = { name: name, handler: null, inited: null, ok: false }
    var fake = {
      EVENT_NAMES: EN,
      request: function () { return __lx.request.apply(__lx, arguments) },
      on: function (ev, fn) { if (ev === EV_REQ) state.handler = fn },
      send: function (ev, data) {
        if (ev === EV_INIT) {
          state.inited = data
          state.ok = !!(data && data.status)
        }
      },
      utils: __lx.utils,
      env: __lx.env,
      version: __lx.version,
      // 每个子源看到的是"自己的"脚本信息，rawScript 只用各自头部注释，
      // 否则 @tx_cookie / @wy_cookie 解析会读到合并版 banner
      currentScriptInfo: {
        name: SELF_NAME,
        version: SELF_VERSION,
        rawScript: rawScript || ''
      }
    }
    SUBS.push(state)
    return fake
  }

  var PER_TIMEOUT = 6000
  var TOTAL_TIMEOUT = 15000

// ==================== 子源: jiexiang ====================
;(function (__lx) {
/*!
 * @name 杰翔聚合音源
 * @description 全平台支持flac，wy，qq，kw，kg支持母带
 * @version 2.3.0
 * @author https://qm.qq.com/cgi-bin/qm/qr?k=dEBGYbmu1lIRp7bAgHFim0W1uDsYl9v5&jump_from=webapi&authKey=fmTG96MhfqDQ5KARA/OvnuWAigCAloClvYhtSiEQd0jQneXmGons54BwlAh1+bUi
 * @homepage https://github.com/haonanren118/jiexiang-Music-Source
 * @license MIT
 * @update 2026-09-13
 * @changelog
    1.修复wy音源
    2.新增QQ越权
 */


const { EVENT_NAMES, request, on, send, utils, env, version, currentScriptInfo } = __lx

// ==================== 解析头部注解 ====================

const currentScript = currentScriptInfo
  ? currentScriptInfo.rawScript
  : (typeof document !== 'undefined' ? document.currentScript?.textContent || '' : '')

const parseHeader = (str) => {
  const comment = /^\/\*!(?:.|\n)+?\*\//.exec(str)?.[0]
  if (!comment) return {}
  const result = {}
  const pairs = [
    { key: 'tx_cookie', regex: /\*\s*@tx_cookie\s+(.+)/ },
    { key: 'wy_cookie', regex: /\*\s*@wy_cookie\s+(.+)/ },
  ]
  for (const { key, regex } of pairs) {
    const match = regex.exec(comment)
    const val = match?.[1]?.trim()
    result[key] = (!val || val === 'null') ? '' : val
  }
  return result
}

const config = parseHeader(currentScript)
const TX_COOKIE = config.tx_cookie
const WY_COOKIE = config.wy_cookie
const HAS_TX_COOKIE = !!TX_COOKIE
const HAS_WY_COOKIE = !!WY_COOKIE

// ==================== 音质列表（参照ikun音源格式） ====================

const MUSIC_QUALITY = JSON.parse(HAS_TX_COOKIE && HAS_WY_COOKIE
  ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
  : HAS_TX_COOKIE
    ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
    : HAS_WY_COOKIE
      ? '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
      : '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
)

const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY)

// ==================== 工具函数 ====================

const httpFetch = (url, options = { method: 'GET' }) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) return reject(err)
    let body = resp.body
    if (typeof body === 'string') {
      const trimmed = body.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try { body = JSON.parse(trimmed) } catch (e) {}
      }
    }
    resolve({ body, statusCode: resp.statusCode, headers: resp.headers || {} })
  })
})

const md5 = (str) => utils.crypto.md5(str)

const randomGuid = () => {
  const hex = '0123456789abcdef'
  let guid = ''
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)]
  return guid
}

const aesEncrypt = (data, key, iv, mode) => {
  if (!version) mode = mode.split('-').pop()
  return utils.crypto.aesEncrypt(data, mode, key, iv)
}

const buf2hex = (buffer) => {
  return version
    ? utils.buffer.bufToString(buffer, 'hex')
    : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

const wyEapi = (url, object) => {
  const eapiKey = 'e82ckenh8dichen8'
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt')
  const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest
  return { params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase() }
}

const objToForm = (obj) => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&')

const extractUrl = (obj, paths) => {
  for (const path of paths) {
    let val = obj
    for (const key of path) {
      if (val == null) { val = undefined; break }
      val = val[key]
    }
    if (Array.isArray(val)) val = val[0]
    if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val
    if (typeof val === 'string' && val.startsWith('//')) return 'https:' + val
  }
  return ''
}

const cleanUrl = (url) => {
  if (!url) return ''
  const s = String(url).replace(/\\?u0026/gi, '&').replace(/\\&/g, '&').replace(/\$/g, '&')
  const idx = s.indexOf('?')
  return idx > 0 ? s.substring(0, idx) : s
}

// ==================== 通用音质转Level工具 ====================

const qualityToLevel = (quality) => {
  const map = {
    '128k': 'standard',
    '192k': 'standard',
    '320k': 'exhigh',
    'flac': 'lossless',
    'flac24bit': 'lossless',
    'hires': 'lossless',
    'atmos': 'lossless',
    'atmos_plus': 'lossless',
    'master': 'lossless',
  }
  return map[quality] || 'standard'
}

// ==================== SHA256 工具（用于 Hello World API 签名） ====================

const sha256 = (function() {
  var HEX_CHARS = '0123456789abcdef'.split('');
  function Sha256() {
    this.blocks = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    this.h0 = 0x6a09e667;
    this.h1 = 0xbb67ae85;
    this.h2 = 0x3c6ef372;
    this.h3 = 0xa54ff53a;
    this.h4 = 0x510e527f;
    this.h5 = 0x9b05688c;
    this.h6 = 0x1f83d9ab;
    this.h7 = 0x5be0cd19;
    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
  }
  Sha256.prototype.update = function(message) {
    if (this.finalized) return;
    var notString = typeof message !== 'string';
    var blocks = this.blocks;
    for (var i = 0; i < message.length; i++) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }
      var code = notString ? message[i] : message.charCodeAt(i);
      blocks[this.start >> 2] |= code << (24 - (this.start % 4) * 8);
      this.start++;
      if (this.start === 64) {
        this.block = blocks[16];
        this.start = 0;
        this.hash();
        this.hashed = true;
      }
    }
    this.bytes += message.length;
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };
  Sha256.prototype.finalize = function() {
    if (this.finalized) return;
    this.finalized = true;
    var blocks = this.blocks;
    var i = this.start;
    blocks[16] = this.block;
    blocks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) this.hash();
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };
  Sha256.prototype.hash = function() {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7, blocks = this.blocks;
    for (var j = 0; j < 64; j++) {
      if (j >= 16) {
        var w0 = blocks[j - 15];
        var w1 = blocks[j - 2];
        var s0 = ((w0 >>> 7) | (w0 << 25)) ^ ((w0 >>> 18) | (w0 << 14)) ^ (w0 >>> 3);
        var s1 = ((w1 >>> 17) | (w1 << 15)) ^ ((w1 >>> 19) | (w1 << 13)) ^ (w1 >>> 10);
        blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1;
      }
      var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      var ch = (e & f) ^ ((~e) & g);
      var temp1 = h + S1 + ch + K[j] + (blocks[j] >>> 0);
      var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = S0 + maj;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    this.h0 = (this.h0 + a) >>> 0;
    this.h1 = (this.h1 + b) >>> 0;
    this.h2 = (this.h2 + c) >>> 0;
    this.h3 = (this.h3 + d) >>> 0;
    this.h4 = (this.h4 + e) >>> 0;
    this.h5 = (this.h5 + f) >>> 0;
    this.h6 = (this.h6 + g) >>> 0;
    this.h7 = (this.h7 + h) >>> 0;
  };
  Sha256.prototype.hex = function() {
    this.finalize();
    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
    return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] + HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] + HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] + HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] + HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] + HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] + HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] + HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] + HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] + HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] + HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] + HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] + HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] + HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] + HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] + HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] + HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] + HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] + HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] + HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] + HEX_CHARS[(h5 >> 28) & 0x0F] + HEX_CHARS[(h5 >> 24) & 0x0F] + HEX_CHARS[(h5 >> 20) & 0x0F] + HEX_CHARS[(h5 >> 16) & 0x0F] + HEX_CHARS[(h5 >> 12) & 0x0F] + HEX_CHARS[(h5 >> 8) & 0x0F] + HEX_CHARS[(h5 >> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] + HEX_CHARS[(h6 >> 28) & 0x0F] + HEX_CHARS[(h6 >> 24) & 0x0F] + HEX_CHARS[(h6 >> 20) & 0x0F] + HEX_CHARS[(h6 >> 16) & 0x0F] + HEX_CHARS[(h6 >> 12) & 0x0F] + HEX_CHARS[(h6 >> 8) & 0x0F] + HEX_CHARS[(h6 >> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F] + HEX_CHARS[(h7 >> 28) & 0x0F] + HEX_CHARS[(h7 >> 24) & 0x0F] + HEX_CHARS[(h7 >> 20) & 0x0F] + HEX_CHARS[(h7 >> 16) & 0x0F] + HEX_CHARS[(h7 >> 12) & 0x0F] + HEX_CHARS[(h7 >> 8) & 0x0F] + HEX_CHARS[(h7 >> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
  };
  return function(message) {
    return new Sha256().update(message).hex();
  };
})();

const HELLO_WORLD_API_KEY = 'lxmusic';
const HELLO_WORLD_SECRET_KEY = 'JaJ?a7Nwk_Fgj?2o:znAkst';
const HELLO_WORLD_SCRIPT_MD5 = '1888f9865338afe6d5534b35171c61a4';
const HELLO_WORLD_API_URL = 'https://88.lxmusic.xn--fiqs8s';

const helloWorldSign = (requestPath) => sha256(requestPath + HELLO_WORLD_SCRIPT_MD5 + HELLO_WORLD_SECRET_KEY);

const HYW_API_BASE = 'http://103.79.184.97';
const HYW_CARD_KEY = 'MOLAN-BAIJI';

// ==================== QQ 音乐音质文件映射 ====================

const TX_FILE_CONFIG = {
  '128k': { s: 'M500', e: '.mp3', br: '128k' },
  '320k': { s: 'M800', e: '.mp3', br: '320k' },
  flac: { s: 'F000', e: '.flac', br: 'flac' },
  flac24bit: { s: 'AI00', e: '.flac', br: 'flac24bit' },
  hires: { s: 'AI00', e: '.flac', br: 'hires' },
  atmos: { s: 'AI00', e: '.flac', br: 'atmos' },
  atmos_plus: { s: 'AI00', e: '.flac', br: 'atmos' },
  master: { s: 'AI00', e: '.flac', br: 'master' },
}

// ==================== 网易云音质映射 ====================

const WY_LEVEL_MAP = {
  '128k': 'standard',
  '320k': 'exhigh',
  flac: 'lossless',
  flac24bit: 'hires',
  hires: 'hires',
  atmos: 'sky',
  master: 'jymaster',
}

const WY_BR_MAP = {
  '128k': 128000,
  '320k': 320000,
  flac: 999000,
  flac24bit: 999000,
  hires: 999001,
  atmos: 999002,
  master: 999003,
}

// ==================== 酷我音质Level映射（笒鬼鬼等专用） ====================

const KW_LEVEL_MAP = {
  '128k': '128k',
  '192k': '128k',
  '320k': '320k',
  flac: 'lossless',
  flac24bit: 'lossless',
}

// ==================== 酷狗音质Level映射（长青SVIP音源二改版专用） ====================

const KG_LEVEL_MAP = {
  '128k': 'standard',
  '192k': 'standard',
  '320k': 'exhigh',
  flac: 'lossless',
  flac24bit: 'hires',
  hires: 'hires',
  atmos: 'atmos',
  atmos_plus: 'atmos',
  master: 'clear',
}

// ==================== 酷我流媒体音质Level映射（175.27.166.236:8928 专用） ====================

const KW_STREAM_LEVEL_MAP = {
  '128k': '128k',
  '192k': '128k',
  '320k': '320k',
  flac: 'flac',
  flac24bit: 'flac',
  hires: 'hires',
  atmos: 'atmos',
  atmos_plus: 'atmos_plus',
  master: 'master',
}

// ==================== Fish API 签名工具 ====================

const FISH_DOMAIN = 'music.gdstudio.xyz'
const FISH_VERSION = '20260510'

const fishSign = async (secret) => {
  const timeRes = await httpFetch('https://' + FISH_DOMAIN + '/time', { method: 'GET', timeout: 10000 })
  const timeStr = String(Number(timeRes.body) || Date.now()).slice(0, 9)
  const signInput = FISH_DOMAIN + '|' + FISH_VERSION + '|' + timeStr + '|' + secret
  return md5(signInput).slice(-8).toUpperCase()
}

const fishPost = async (params, secret) => {
  const sign = await fishSign(secret)
  params.s = sign
  const body = objToForm(params)
  const res = await httpFetch('https://' + FISH_DOMAIN + '/api.php', {
    method: 'POST',
    timeout: 15000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: 'https://' + FISH_DOMAIN,
      Referer: 'https://' + FISH_DOMAIN + '/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body,
  })
  return res.body
}

// ==================== 新增后端函数（取自星澜聚合音源 v3.1.1.1） ====================

// -------- QQ越权（3重策略） --------
const getQQExploit = async (songId, quality, musicInfo) => {
  const songmid = songId || musicInfo?.songmid || musicInfo?.id
  if (!songmid) throw new Error('QQ越权: 缺少 songmid')
  const mediaMid = musicInfo?.mediaMid || musicInfo?.strMediaMid || musicInfo?.media_mid || ''
  const prefixMap = { '128k':'M500','192k':'M800','320k':'M800','flac':'F000','flac24bit':'RS01','hires':'RS01','atmos':'atmosphere','atmos_plus':'atmosphere','master':'AIM00' }
  const prefix = prefixMap[quality] || 'M800'
  const extMap = { 'M500':'mp3','M800':'mp3','F000':'flac','RS01':'flac','AIM00':'mflac','atmosphere':'flac' }
  const ext = extMap[prefix] || 'mp3'
  const midForFile = mediaMid || songmid
  const qqKey = '1984LZXvCR'
  const qqUin = '1234567890'
  const pgv_pvid = Math.floor(Math.random() * 10000000000).toString()
  const qqCookie = `qm_keyst=${qqKey}; uin=o${qqUin}; pgv_pvid=${pgv_pvid}; qqmusic_key=${qqKey}; qqmusic_uin=o${qqUin}; psrf_qqaccess_token=${qqKey}; ts_uid=${pgv_pvid}; psi=${pgv_pvid}`

  // 策略A: ut.y.qq.com GetEVkey
  const filename = `${prefix}${midForFile}.${ext}`
  const bodyA = {
    comm: { ct: 19, cv: 0, guid: pgv_pvid, tmeAppID: 'qqmusic', qq: qqUin },
    hot: { method: 'CgiGetHotVkey', module: 'music.vkey.GetEVkey', param: { filename: [filename], songmid: [songmid] } },
    ekey: { method: 'GetEkey', module: 'music.vkey.GetEVkey', param: { finfo: [{ filename, mid: midForFile || '0' }] } }
  }
  try {
    const resp = await httpFetch('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST', timeout: 8000,
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://y.qq.com/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': qqCookie },
      body: JSON.stringify(bodyA)
    })
    const d = resp.body
    if (d?.hot?.data?.urls?.[0]?.purl) {
      return 'https://dl.stream.qqmusic.qq.com/' + d.hot.data.urls[0].purl
    }
  } catch (e) {}

  // 策略B: u.y.qq.com platform=23
  const variants = [
    { name: '双songmid', filename: `${prefix}${songmid}${songmid}.${ext}`, uin: qqUin, loginflag: 1 },
    { name: '单songmid', filename: `${prefix}${songmid}.${ext}`, uin: qqUin, loginflag: 1 },
    { name: '双空uin', filename: `${prefix}${songmid}${songmid}.${ext}`, uin: '', loginflag: 1 },
    { name: '单空uin', filename: `${prefix}${songmid}.${ext}`, uin: '', loginflag: 1 }
  ]
  for (const v of variants) {
    try {
      const param = { filename: [v.filename], songmid: [songmid], songtype: [0], uin: v.uin, loginflag: v.loginflag, platform: '23', firstlogin: 1, newver: 1, nohash: 0, cms: 0 }
      const apiData = JSON.stringify({
        comm: { uin: v.uin ? parseInt(v.uin) : 0, format: 'json', ct: 23, cv: 0, ...(v.uin ? { qq: v.uin } : {}) },
        req_0: { module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param }
      })
      const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(apiData)}`
      const resp = await httpFetch(url, {
        method: 'GET', timeout: 8000,
        headers: { 'Referer': 'https://y.qq.com/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': qqCookie }
      })
      const d = resp.body
      if (d?.code === 0 && d?.req_0?.data?.midurlinfo?.[0]?.purl) {
        const sip = d.req_0.data.sip?.[0] || 'https://dl.stream.qqmusic.qq.com/'
        return sip + d.req_0.data.midurlinfo[0].purl
      }
    } catch (e) {}
  }

  // 策略C: ut+key 增强
  try {
    const bodyC = {
      comm: { ct: 19, cv: 0, guid: pgv_pvid, tmeAppID: 'qqmusic', qq: qqUin },
      hot: { method: 'CgiGetHotVkey', module: 'music.vkey.GetEVkey', param: { filename: [filename], songmid: [songmid] } }
    }
    const resp = await httpFetch('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST', timeout: 8000,
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://y.qq.com/', 'User-Agent': 'Mozilla/5.0 QQMusic/2201', 'Cookie': qqCookie },
      body: JSON.stringify(bodyC)
    })
    const d = resp.body
    if (d?.hot?.data?.urls?.[0]?.purl) {
      return 'https://dl.stream.qqmusic.qq.com/' + d.hot.data.urls[0].purl
    }
  } catch (e) {}

  throw new Error('QQ越权全部失败')
}

// -------- ygking QQ（全音质） --------
const getYgkingTx = async (songId, quality, musicInfo) => {
  const mid = musicInfo?.songmid || musicInfo?.strMediaMid || musicInfo?.mediaMid || songId
  if (!mid) throw new Error('ygking: 缺少 mid')
  const qMap = { '128k':'128','192k':'320','320k':'320','flac':'flac','flac24bit':'hires','hires':'hires','master':'master','atmos':'master','atmos_plus':'master' }
  const q = qMap[quality] || '320'
  const url = `https://api.ygking.cn/api/song/url?mid=${encodeURIComponent(mid)}&quality=${q}`
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 0 && d?.data?.[mid]) {
    return d.data[mid]
  }
  throw new Error('ygking 失败')
}

// -------- 残像 WY（母带） --------
const getCanxiang = async (songId, quality, musicInfo) => {
  const id = musicInfo?.songId || musicInfo?.id || songId
  const name = musicInfo?.songName || musicInfo?.name || ''
  const singer = musicInfo?.singer || ''
  const qMap = { '128k':'128k','192k':'320k','320k':'320k','flac':'flac','flac24bit':'hires','hires':'hires','master':'jymaster','atmos':'jymaster','atmos_plus':'jymaster' }
  const type = qMap[quality] || '320k'
  const token = 'canxiang_token_2026'
  let params = { token, type }
  if (id) params.id = String(id)
  else if (name) { params.msg = name + (singer ? ' ' + singer : ''); params.n = 1 }
  else throw new Error('残像: 缺少 id 或歌名')
  const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&')
  const url = `https://api.canxiang.cn/api/wyymusic?${query}`
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.data?.url) {
    return d.data.url
  }
  throw new Error('残像 失败')
}

// -------- 星海聚合（通用） --------
const getXinghai = async (platform, songId, quality, musicInfo) => {
  const sourceMap = { kw: 'kw', kg: 'kg', mg: 'migu' }
  const source = sourceMap[platform]
  if (!source) throw new Error('星海聚合: 不支持平台 ' + platform)
  const id = platform === 'kg' ? (musicInfo?.hash || songId) : (musicInfo?.songmid || musicInfo?.rid || songId)
  if (!id) throw new Error('星海聚合: 缺少 id')
  const name = musicInfo?.name || musicInfo?.songName || ''
  const singer = musicInfo?.singer || ''
  const qMap = { '128k':'128kmp3','192k':'320kmp3','320k':'320kmp3','flac':'flac','flac24bit':'hires','hires':'hires','master':'flac','atmos':'flac','atmos_plus':'flac' }
  const qualityParam = qMap[quality] || '320kmp3'
  const url = `https://api.xinghai.com/lx/api/?source=${source}&name=${encodeURIComponent(name + ' ' + singer)}&songmid=${encodeURIComponent(id)}&quality=${qualityParam}`
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.url) return d.url
  throw new Error('星海聚合 失败')
}
const getXinghaiKw = (songId, quality, musicInfo) => getXinghai('kw', songId, quality, musicInfo)
const getXinghaiKg = (songId, quality, musicInfo) => getXinghai('kg', songId, quality, musicInfo)
const getXinghaiMg = (songId, quality, musicInfo) => getXinghai('mg', songId, quality, musicInfo)

// -------- yunmge 酷我 --------
const getYunmgeKw = async (songId, quality, musicInfo) => {
  const id = musicInfo?.rid || musicInfo?.songmid || songId
  if (!id) throw new Error('yunmge: 缺少 id')
  const brMap = { '128k':128, '192k':192, '320k':320, 'flac':2000, 'flac24bit':2000, 'hires':4000, 'master':4000 }
  const wantBr = brMap[quality] || 320
  const url = `https://api.yunmge.com/kuwo?key=yunmge_key&token=yunmge_token&id=${encodeURIComponent(id)}`
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.data?.all_bitrates) {
    const list = d.data.all_bitrates
    const brOrder = [4000, 2000, 320, 192, 128]
    for (const br of brOrder) {
      if (br < wantBr) continue
      const item = list.find(b => b.bitrate === br || String(b.bitrate) === String(br))
      if (item && item.play_url) return item.play_url
    }
    const fallback = list.find(b => b.play_url)
    if (fallback) return fallback.play_url
  }
  throw new Error('yunmge 失败')
}

// -------- 念心酷狗 --------
const getNianxinKg = async (songId, quality, musicInfo) => {
  const hash = musicInfo?.hash || musicInfo?.songmid || songId
  if (!hash) throw new Error('念心: 缺少 hash')
  const levelMap = { '128k':'128kmp3','192k':'320kmp3','320k':'320kmp3','flac':'2000kflac','flac24bit':'4000kflac','hires':'hires','master':'4000kflac','atmos':'4000kflac','atmos_plus':'4000kflac' }
  const level = levelMap[quality] || '320kmp3'
  const url = `https://mcp.nianxinxz.com/kgqq/kg.php?id=${encodeURIComponent(hash)}&level=${level}&type=mp3`
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.url) return d.url
  if (typeof d === 'string' && d.startsWith('http')) return d
  throw new Error('念心 失败')
}

// ==================== QQ音乐 后端接口列表（按优先级排列） ====================

const TX_BACKENDS = [

  // === 后端1: QQ官方接口（带Cookie可解锁VIP） ===
  {
    name: 'QQ官方',
    fetch: async (songmid, quality) => {
      const fileInfo = TX_FILE_CONFIG[quality]
      if (!fileInfo) throw new Error('不支持的音质')
      const guid = randomGuid()
      const file = fileInfo.s + songmid + fileInfo.e
      const reqData = {
        req_0: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: { filename: [file], guid, songmid: [songmid], songtype: [0], uin: '0', loginflag: HAS_TX_COOKIE ? 1 : 0, platform: '20' },
        },
        loginUin: '0',
        comm: { uin: '0', format: 'json', ct: 24, cv: 0 },
      }
      const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' }
      if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE
      const res = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers, body: JSON.stringify(reqData) })
      const d = res.body
      if (d && d.req_0 && d.req_0.data && d.req_0.data.midurlinfo && d.req_0.data.midurlinfo[0] && d.req_0.data.midurlinfo[0].purl) {
        const sip = d.req_0.data.sip || ['https://isure.stream.qqmusic.qq.com/']
        return sip[Math.floor(Math.random() * sip.length)] + d.req_0.data.midurlinfo[0].purl
      }
      throw new Error('QQ官方: 无数据')
    },
  },

  // === 后端2: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=qq&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=qq&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端4: 溯音API（oiapi.net） ===
  {
    name: '溯音QQ',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '7', '320k': '5', flac: '4', flac24bit: '1', hires: '1', atmos: '1', master: '1' }
      const br = brMap[quality] || '7'
      const res = await httpFetch('https://oiapi.net/api/QQ_Music?key=oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575&type=json&br=' + br + '&n=1&mid=' + songmid, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'music'], ['data', 'url'], ['url']])
      if (url) return url
      throw new Error('溯音QQ: 无数据')
    },
  },

  // === 后端5: xcvts API（fish源主用） ===
  {
    name: 'xcvts',
    fetch: async (songmid, quality) => {
      const apiKeys = ['78993344b9bf1105655599009cdba3d2', 'ce778eb0d1858edfb4b2071a115f1edf']
      const qualityMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }
      const q = qualityMap[quality] || 'standard'
      const errors = []
      for (const key of apiKeys) {
        try {
          const res = await httpFetch('https://api.xcvts.cn/api/music/qq?apiKey=' + key + '&mid=' + songmid + '&type=' + q, {
            method: 'GET', timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
          })
          const d = res.body
          const url = extractUrl(d, [['data', 'music'], ['data', 'url'], ['url']])
          if (url) return url
        } catch (e) { errors.push(e.message) }
      }
      throw new Error('xcvts: ' + errors.join(' | '))
    },
  },

  // === 后端6: vkeys API ===
  {
    name: 'vkeys',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '8', '320k': '9', flac: '10', flac24bit: '16', hires: '14', atmos: '13', atmos_plus: '12', master: '11' }
      const q = qualityMap[quality]
      if (!q) throw new Error('vkeys 不支持的音质')
      const res = await httpFetch('https://api.vkeys.cn/v2/music/tencent/geturl?mid=' + songmid + '&quality=' + q, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      throw new Error('vkeys: 无数据')
    },
  },

  // === 后端7: vkeys 旧版API ===
  {
    name: 'vkeys旧版',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '8', '320k': '9', flac: '10', flac24bit: '16', hires: '14', atmos: '13', atmos_plus: '12', master: '11' }
      const q = qualityMap[quality]
      if (!q) throw new Error('vkeys旧版 不支持的音质')
      const res = await httpFetch('https://api.vkeys.cn/music/tencent/song/link?mid=' + songmid + '&quality=' + q, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'url'], ['url']])
      if (url) return url
      throw new Error('vkeys旧版: 无数据')
    },
  },

  // === 后端8: 柳云API（liuyunidc） ===
  {
    name: '柳云API',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'master', hires: 'atmos', atmos: 'atmos', atmos_plus: 'atmos', master: 'master' }
      const q = qualityMap[quality] || '128k'
      // 先获取card密钥
      let card = ''
      try {
        const cardRes = await httpFetch('https://github.com/CharlesPikachu/musicdl/releases/download/keys/baimusic.txt', { method: 'GET', timeout: 5000 })
        card = String(cardRes.body || '').trim()
      } catch (e) {}
      const res = await httpFetch('https://api.liuyunidc.cn/baimusic/musicurl.php?source=tx&musicId=' + songmid + '&quality=' + q + (card ? '&card=' + encodeURIComponent(card) : ''), {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'http://api.liuyunidc.cn/baimusic/' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('柳云API: 无数据')
    },
  },

  // === 后端9: 317ak API ===
  {
    name: '317ak',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '5', '320k': '6', flac: '8', flac24bit: '7', hires: '9', atmos: '10', atmos_plus: '10', master: '10' }
      const br = brMap[quality] || '5'
      const res = await httpFetch('https://api.317ak.cn/api/yinyue/qqyinyue?ckey=ZK76QJCIH5PPICJOOXUH&i=' + songmid + '&br=' + br + '&type=json&lrc=1', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('317ak: 无数据')
    },
  },

  // === 后端10: nki.pw API（flac用） ===
  {
    name: 'nki',
    fetch: async (songmid, quality) => {
      if (quality !== 'flac') throw new Error('nki仅支持flac')
      const apiKeys = ['28fece925439b052792a97989c870ced3803a71c6b534f71e5a5338b2d31ef8', 'c4c4f5fc36bad4cacb98839e14fea40277b35ea2eb1babdad7bbde128400f3b1']
      const errors = []
      for (const key of apiKeys) {
        try {
          const res = await httpFetch('https://api.nki.pw/API/music_open_api.php?mid=' + songmid + '&apikey=' + key, {
            method: 'GET', timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
          })
          const d = res.body
          const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']])
          if (url) return url
        } catch (e) { errors.push(e.message) }
      }
      throw new Error('nki: ' + errors.join(' | '))
    },
  },

  // === 后端11: tang.api.s01s.cn（flac用） ===
  {
    name: 'tang',
    fetch: async (songmid, quality) => {
      if (quality !== 'flac') throw new Error('tang仅支持flac')
      const res = await httpFetch('https://tang.api.s01s.cn/music_open_api.php?mid=' + songmid, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']])
      if (url) return url
      throw new Error('tang: 无数据')
    },
  },

  // === 后端12: 玉宁熙API ===
  {
    name: '玉宁熙',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '标准', '320k': 'HQ', flac: 'SQ', flac24bit: '母带', hires: '母带', atmos: '母带', master: '母带' }
      const q = qualityMap[quality] || '标准'
      const res = await httpFetch('https://api-v2.yuafeng.cn/API/qqmusic.php?type=' + encodeURIComponent(q) + '&mid=' + songmid + '&apikey=3ff23523e47465224a3f48579acf41f241540ce04b6cc0b94164f37a5b6299d5', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.music) return d.data.music
      throw new Error('玉宁熙: 无数据')
    },
  },

  // === 后端13: 收集の聚合接口（cyapi） ===
  {
    name: '收集聚合',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://cyapi.top/API/qq_music.php?apikey=1ffdf5733f5d538760e63d7e46ba17438d9f7b9dfc18c51be1109386fd74c3a1&type=json&mid=' + songmid, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('收集聚合: 无数据')
    },
  },

  // === 后端14: 88.lxmusic（独家音源v3/v4） ===
  {
    name: 'lxmusic88',
    fetch: async (songmid, quality) => {
      try {
        const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/tx/' + songmid + '/' + quality, {
          method: 'GET', timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'x-request-key': 'lxmusic' },
        })
        const d = res.body
        if (d && (d.code === 0 || d.code === 200) && d.data) return d.data
        if (d && d.url) return d.url
      } catch (e) {}
      // 降级到v3
      const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv3/url/tx/' + songmid + '/' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data) return d.data
      throw new Error('lxmusic88: 无数据')
    },
  },

  // === 后端15: 长青SVIP 海棠直链 ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('http://175.27.166.236/kgqq1/qq.php?type=mp3&id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端16: nxinxz 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://music.nxinxz.com/kgqq/tx.php?id=' + songmid + '&level=' + quality + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端17: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/qq_plus?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端18: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '740', flac24bit: '999', hires: '999' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=qq&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端19: ChKsZ 聚合API ===
  {
    name: 'ChKsZ',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.chksz.top/api', {
        method: 'POST', timeout: 8000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'qq', songmid, quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('ChKsZ: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端20: Huibq API ===
  {
    name: 'Huibq',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://lxmusicapi.onrender.com/url/tx/' + songmid + '/' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Request-Key': 'share-v3' },
      })
      const d = res.body
      if (d && d.code === 0) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('Huibq: 无数据')
    },
  },

  // === 后端21: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/tx', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端22: Fish API（gdstudio POST） ===
  {
    name: 'FishAPI',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }
      const br = brMap[quality]
      if (!br) throw new Error('FishAPI 不支持的音质')
      const result = await fishPost({ types: 'url', id: songmid, source: 'qq', br: br }, encodeURIComponent(songmid))
      const url = result && result.url ? cleanUrl(String(result.url)) : ''
      if (url.startsWith('http')) return url
      throw new Error('FishAPI: 无数据')
    },
  },

  // === 后端23: 汽水VIP API ===
  {
    name: '汽水VIP',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }
      const level = levelMap[quality] || 'standard'
      const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']])
      if (url) return url
      throw new Error('汽水VIP: 无数据')
    },
  },

  // === 后端24: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=tx&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端xx: QQ越权（3重策略，取自星澜） ===
  { name: 'QQ越权', fetch: getQQExploit },

  // === 后端xx: ygking QQ（全音质，取自星澜） ===
  { name: 'ygking QQ', fetch: getYgkingTx },
]

// ==================== 网易云音乐 后端接口列表（按优先级排列） ====================

const WY_BACKENDS = [

  // === 前端1: ikun音源API（c.wwwweb.top，取自ikun音源v26） ===
  { name: 'ikun网易云', fetch: async (songmid, quality, musicInfo) => {
      const songId = musicInfo?.hash ?? songmid
      const res = await httpFetch('https://c.wwwweb.top/music/url', {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'lx-music-request/2.9.0',
          'X-Api-Key': '',
        },
        body: { source: 'wy', musicId: songId, quality: quality },
        follow_max: 5,
      })
      const d = res.body
      if (!d || isNaN(Number(d.code))) throw new Error('ikun网易云: 未知错误')
      if (d.code === 200 && d.url) return d.url
      if (d.code === 403) throw new Error('ikun网易云: 鉴权失败')
      if (d.code === 429) throw new Error('ikun网易云: 请求过速')
      throw new Error('ikun网易云: ' + (d.message || '获取URL失败'))
    },
  },

  // === 后端1: 网易云eapi官方接口（带Cookie可解锁VIP） ===
  {
    name: '网易云官方',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url/v1'
      const eapiUrl = '/api/song/enhance/player/url/v1'
      const payload = { ids: [Number(songmid)], level, encodeType: 'flac', immerseType: 'c51' }
      const encrypted = wyEapi(eapiUrl, payload)
      let cookieValue = 'os=pc; appver=; osver=; deviceId=pyncm!'
      if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue
      const res = await httpFetch(targetUrl, {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
          Referer: 'https://music.163.com/',
          Cookie: cookieValue,
        },
        form: encrypted,
      })
      const d = res.body
      if (d && d.data && d.data[0] && d.data[0].url && !d.data[0].freeTrialInfo) return d.data[0].url
      if (d && d.data && d.data[0] && d.data[0].freeTrialInfo) throw new Error('VIP歌曲仅试听（配置Cookie后可用完整版）')
      throw new Error('网易云官方: 无数据')
    },
  },

  // === 后端2: 星海音乐源VIP接口（ChKsZ） ===
  {
    name: 'ChKsZ-VIP',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://api.chksz.top/api/163_music?id=' + songmid + '&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://cp.chksz.top/' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('ChKsZ-VIP: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 笒鬼鬼API（cenguigui） ===
  {
    name: '笒鬼鬼',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://api.cenguigui.cn/api/netease/music_v1.php?id=' + songmid + '&type=json&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      throw new Error('笒鬼鬼: 无数据')
    },
  },

  // === 后端4: 溯音API（oiapi） ===
  {
    name: '溯音163',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://oiapi.net/api/Music_163?id=' + songmid + '&type=json', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('溯音163: 无数据')
    },
  },

  // === 后端5: wyapi.toubiec.cn（洛雪音乐源用） ===
  {
    name: 'toubiec',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://wyapi.toubiec.cn/api/music/url', {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          Origin: 'https://wyapi.toubiec.cn',
          Referer: 'https://wyapi.toubiec.cn/',
        },
        body: JSON.stringify({ id: songmid, level }),
      })
      const d = res.body
      if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url
      if (d && d.url) return d.url
      throw new Error('toubiec: 无数据')
    },
  },

  // === 后端6: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '740', flac24bit: '999', hires: '999' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light&types=url&source=netease&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端7: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=netease&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端8: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=netease&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端9: api.bugpk.com（多平台聚合音源） ===
  {
    name: 'bugpk',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://api.bugpk.com/api/163_music?type=json&ids=' + songmid + '&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url'], ['data', 0, 'url']])
      if (url) return url
      throw new Error('bugpk: 无数据')
    },
  },

  // === 后端10: nxinxz 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('http://music.nxinxz.com/wy.php?id=' + songmid + '&level=' + quality + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端11: 长青SVIP 直链 ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('http://175.27.166.236/wy1/wy.php?type=mp3&id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端12: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/wyvip?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端13: 88.lxmusic（独家音源v4） ===
  {
    name: 'lxmusic88',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/wy/' + songmid + '/' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'x-request-key': 'lxmusic' },
      })
      const d = res.body
      if (d && (d.code === 0 || d.code === 200)) {
        if (d.data) return d.data
        if (d.url) return d.url
      }
      throw new Error('lxmusic88: 无数据')
    },
  },

  // === 后端14: Fish API（gdstudio POST） ===
  {
    name: 'FishAPI',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }
      const br = brMap[quality]
      if (!br) throw new Error('FishAPI 不支持的音质')
      const result = await fishPost({ types: 'url', id: songmid, source: 'netease', br: br }, encodeURIComponent(songmid))
      const url = result && result.url ? cleanUrl(String(result.url)) : ''
      if (url.startsWith('http')) return url
      throw new Error('FishAPI: 无数据')
    },
  },

  // === 后端15: Huibq API ===
  {
    name: 'Huibq',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://lxmusicapi.onrender.com/url/wy/' + songmid + '/' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Request-Key': 'share-v3' },
      })
      const d = res.body
      if (d && d.code === 0) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('Huibq: 无数据')
    },
  },

  // === 后端16: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/wy', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端17: 汽水VIP API ===
  {
    name: '汽水VIP',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }
      const level = levelMap[quality] || 'standard'
      const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']])
      if (url) return url
      throw new Error('汽水VIP: 无数据')
    },
  },

  // === 后端18: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=wy&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端xx: 残像 WY（母带支持，取自星澜） ===
  { name: '残像 WY', fetch: async (songmid, quality) => {
      const info = { songId: songmid, songName: '', singer: '' }
      return getCanxiang(songmid, quality, info)
    }
  },
]

// ==================== 酷我音乐(kw) 后端接口列表（按优先级排列） ====================

const KW_BACKENDS = [

  // === 后端1: 酷我流媒体直链（175.27.166.236:8928，返回二进制音频流，取自酷我流媒体音源） ===
  // 注：该服务器atmos/atmos_plus/master返回200，其他音质返回400，但URL本身即为可播放地址，无需验证
  {
    name: '酷我流媒体',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KW_STREAM_LEVEL_MAP[quality] || 'master'
      const songIdTmp = musicInfo?.songmid || musicInfo?.id || musicInfo?.hash || musicInfo?.songId || musicInfo?.musicId || songmid
      if (!songIdTmp) throw new Error('酷我流媒体: 找不到歌曲ID')
      const songId = String(songIdTmp).trim()
      // 该URL返回二进制音频流，URL本身即为可播放地址，直接返回无需验证
      return 'http://175.27.166.236:8928/kwstream?id=' + encodeURIComponent(songId) + '&level=' + level + '&stream=1'
    },
  },

  // === 后端2: 星海音乐源主后端（yy.zddyr.top，带完整歌曲信息） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality, musicInfo) => {
      const name = musicInfo?.name || ''
      const singer = musicInfo?.singer || ''
      const interval = musicInfo?.interval || ''
      const albumName = musicInfo?.albumName || musicInfo?.album || ''
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=kw&name=' + encodeURIComponent(name) + '&singer=' + encodeURIComponent(singer) + '&songmid=' + encodeURIComponent(songmid) + '&interval=' + encodeURIComponent(interval) + '&albumName=' + encodeURIComponent(albumName) + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端2: 星海音乐源备用后端（zrcdy，带完整歌曲信息） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality, musicInfo) => {
      const name = musicInfo?.name || ''
      const singer = musicInfo?.singer || ''
      const interval = musicInfo?.interval || ''
      const albumName = musicInfo?.albumName || musicInfo?.album || ''
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=kw&name=' + encodeURIComponent(name) + '&singer=' + encodeURIComponent(singer) + '&songmid=' + encodeURIComponent(songmid) + '&interval=' + encodeURIComponent(interval) + '&albumName=' + encodeURIComponent(albumName) + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 笒鬼鬼API（cenguigui） ===
  {
    name: '笒鬼鬼',
    fetch: async (songmid, quality) => {
      const level = KW_LEVEL_MAP[quality] || '128k'
      const res = await httpFetch('https://api.cenguigui.cn/api/kuwo/music_v1.php?id=' + songmid + '&type=song&format=json&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'url'], ['url']])
      if (url) return url
      throw new Error('笒鬼鬼: 无数据')
    },
  },

  // === 后端4: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/kw', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端5: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/kwvip?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端6: 长青直链 ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('http://175.27.166.236/kgqq1/kw.php?type=mp3&id=' + songmid + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端7: 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://music.nxinxz.com/kgqq/kw.php?id=' + songmid + '&level=' + level + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端8: 酷我官方接口（KuwoDES格式，surl=1） ===
  {
    name: '酷我官方',
    fetch: async (songmid, quality, musicInfo) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我官方 不支持的音质')
      let rid = musicInfo?.rid || ''
      if (!rid && musicInfo?.musicrid) rid = String(musicInfo.musicrid).replace(/^MUSIC_/, '')
      if (!rid) rid = songmid
      // 使用KuwoDES格式，surl=1让服务器返回surl字段
      const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&rid=' + rid + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('酷我官方: 无数据')
    },
  },

  // === 后端9: 酷我手机版（不同source标识） ===
  {
    name: '酷我手机版',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我手机版 不支持的音质')
      const res = await httpFetch('https://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      throw new Error('酷我手机版: 无数据')
    },
  },

  // === 后端10: 酷我车机版（不同source标识） ===
  {
    name: '酷我车机版',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我车机版 不支持的音质')
      const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk&type=convert_url_with_sign&br=' + br + '&sig=0&rid=' + songmid, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      throw new Error('酷我车机版: 无数据')
    },
  },

  // === 后端11: 聆澜API ===
  {
    name: '聆澜',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://source.shiqianjiang.cn/api/music/url?source=kw&songId=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('聆澜: 无数据')
    },
  },

  // === 后端12: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=kw&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端13: 溯音酷我（oiapi.net，搜索式API，不依赖songmid） ===
  {
    name: '溯音酷我',
    fetch: async (songmid, quality, musicInfo) => {
      const brMap = { '128k': '7', '192k': '5', '320k': '5', flac: '1', flac24bit: '1' }
      const br = brMap[quality] || '7'
      const name = musicInfo?.name || ''
      const singer = musicInfo?.singer || ''
      const keyword = name + (singer ? ' ' + singer : '')
      if (!keyword) throw new Error('溯音酷我: 缺少歌曲名')
      const res = await httpFetch('https://oiapi.net/api/Kuwo?msg=' + encodeURIComponent(keyword) + '&n=1&br=' + br, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      throw new Error('溯音酷我: 无数据')
    },
  },

  // === 后端14: Hello World KW API（lxmusic.xn--fiqs8s，带SHA256签名） ===
  {
    name: 'HelloWorld',
    fetch: async (songmid, quality, musicInfo) => {
      const songId = musicInfo?.rid || musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!songId) throw new Error('HelloWorld: 找不到歌曲ID')
      const requestPath = '/lxmusicv4/url/kw/' + songId + '/' + quality
      const sign = helloWorldSign(requestPath)
      const url = HELLO_WORLD_API_URL + requestPath + '?sign=' + sign
      const res = await httpFetch(url, {
        method: 'GET', timeout: 10000,
        headers: {
          'accept': 'application/json',
          'x-request-key': HELLO_WORLD_API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      const d = res.body
      if (d && (d.code === 0 || d.code === 200)) {
        const musicUrl = d.data || d.url
        if (musicUrl) return musicUrl
      }
      throw new Error('HelloWorld: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端xx: yunmge酷我（多码率选择，取自星澜） ===
  { name: 'yunmge酷我', fetch: getYunmgeKw },

  // === 后端xx: 星海酷我（通用聚合，取自星澜） ===
  { name: '星海酷我', fetch: getXinghaiKw },
]

// ==================== 酷狗音乐(kg) 后端接口列表（按优先级排列） ====================

const KG_BACKENDS = [

  // === 后端1: 长青海棠主后端（musicserver.haitangw.cc，取自长青SVIP音源二改版主API） ===
  {
    name: '长青海棠',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || musicInfo?.songmid || songmid
      const res = await httpFetch('https://musicserver.haitangw.cc/v1/music/resolve-url', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'kg', rid: hash, level: level }),
      })
      const d = res.body
      // 响应格式: {code: 0, data: {url: "..."}}
      if (d && d.code === 0 && d.data && d.data.url) return d.data.url
      throw new Error('长青海棠: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端2: 长青SVIP直链（取自Hei Music，直接构造URL，不发起HTTP请求） ===
  {
    name: '长青SVIP直链',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || musicInfo?.songmid || songmid
      // 直接构造URL，该URL本身即为有效直链
      const url = 'https://music.haitangw.cc/kgqq1/kg.php?type=mp3&id=' + hash + '&level=' + level
      const res = await httpFetch(url, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青SVIP直链: 无数据')
    },
  },

  // === 后端3: 长青直链（175.27.166.236，备用） ===
  {
    name: '长青直链',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || songmid
      const res = await httpFetch('http://175.27.166.236/kgqq1/kg.php?type=mp3&id=' + hash + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端4: 长青POST（175.27.166.236 POST接口） ===
  {
    name: '长青POST',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || songmid
      const res = await httpFetch('http://175.27.166.236/kgqq1/kg.php', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'kg', id: hash, level: level }),
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('长青POST: 无数据')
    },
  },

  // === 后端5: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || (musicInfo?._types?.[quality]?.hash) || songmid
      const albumId = musicInfo?.albumId || ''
      const mainHash = hash
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=kg&quality=' + quality + '&songmid=' + (musicInfo?.songmid || songmid) + '&albumId=' + albumId + '&mainHash=' + mainHash + '&hash=' + hash, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端6: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=kg&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端7: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/kg', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端8: Hello World KG API（lxmusic.xn--fiqs8s，带SHA256签名） ===
  {
    name: 'HelloWorld',
    fetch: async (songmid, quality, musicInfo) => {
      const songId = musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!songId) throw new Error('HelloWorld: 找不到歌曲ID')
      const requestPath = '/lxmusicv4/url/kg/' + songId + '/' + quality
      const sign = helloWorldSign(requestPath)
      const url = HELLO_WORLD_API_URL + requestPath + '?sign=' + sign
      const res = await httpFetch(url, {
        method: 'GET', timeout: 10000,
        headers: {
          'accept': 'application/json',
          'x-request-key': HELLO_WORLD_API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      const d = res.body
      if (d && (d.code === 0 || d.code === 200)) {
        const musicUrl = d.data || d.url
        if (musicUrl) return musicUrl
      }
      throw new Error('HelloWorld: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端9: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/kgvip?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端10: 念心KG ===
  {
    name: '念心KG',
    fetch: async (songmid, quality) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://music.nxinxz.com/kgqq/kg.php?id=' + songmid + '&level=' + level + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      throw new Error('念心KG: 无数据')
    },
  },

  // === 后端11: ChKsZ 聚合API ===
  {
    name: 'ChKsZ',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.chksz.top/api', {
        method: 'POST', timeout: 8000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'kg', songmid, quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('ChKsZ: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端12: 海棠API（使用KG_LEVEL_MAP修正master音质） ===
  {
    name: '海棠API',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || (musicInfo?._types?.[quality]?.hash) || songmid
      const res = await httpFetch('https://musicapi.haitangw.net/kgqq/kg.php?type=json&id=' + hash + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('海棠API: 无数据')
    },
  },

  // === 后端13: 酷狗官方API（直接调用酷狗官方接口） ===
  {
    name: '酷狗官方',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || songmid
      const albumId = musicInfo?.albumId || ''
      const res = await httpFetch('https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + hash + '&platid=4&album_id=' + albumId + '&mid=00000000000000000000000000000000', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.kugou.com/' },
      })
      const d = res.body
      if (d && d.status === 1 && d.data && d.data.play_backup_url) return d.data.play_backup_url
      if (d && d.status === 1 && d.data && d.data.play_url) return d.data.play_url
      throw new Error('酷狗官方: 无数据')
    },
  },

  // === 后端14: 聆澜API ===
  {
    name: '聆澜',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://source.shiqianjiang.cn/api/music/url?source=kg&songId=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('聆澜: 无数据')
    },
  },

  // === 后端15: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=kg&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端16: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '740', flac24bit: '999', hires: '999' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=kg&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端xx: 星海酷狗（通用聚合，取自星澜） ===
  { name: '星海酷狗', fetch: getXinghaiKg },

  // === 后端xx: 念心酷狗（多码率，取自星澜） ===
  { name: '念心酷狗', fetch: getNianxinKg },
]

// ==================== 咪咕音乐(mg) 后端接口列表（按优先级排列） ====================

const MG_BACKENDS = [

  // === 后端1: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=migu&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端2: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=migu&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/mg', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端4: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '1000' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=migu&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端5: Migu直接源（Hei Music） ===
  {
    name: 'Migu直接源',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?copyrightId=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Referer: 'https://music.migu.cn/' },
      })
      const d = res.body
      if (d && d.data && d.data.playUrl) return d.data.playUrl
      if (d && d.url) return d.url
      if (d && d.playUrl) return d.playUrl
      throw new Error('Migu直接源: 无数据')
    },
  },

  // === 后端6: Migu API（Hei Music） ===
  {
    name: 'Migu API',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'PQ', '320k': 'HQ', flac: 'SQ', flac24bit: 'ZQ' }
      const level = levelMap[quality] || 'HQ'
      const res = await httpFetch('https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?copyrightId=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36', Referer: 'https://app.c.nf.migu.cn/' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      if (d && d.data && d.data.playUrl) return d.data.playUrl
      throw new Error('Migu API: 无数据')
    },
  },

  // === 后端7: 星海后端（Hei Music xhbackend） ===
  {
    name: '星海后端',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://api.xinghai-backend.cn/migu?id=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('星海后端: 无数据')
    },
  },

  // === 后端8: 长青直链（haitangw） ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://music.haitangw.cc/musicapi/mg.php?type=mp3&id=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端9: 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('http://music.nxinxz.com/mg.php?id=' + encodeURIComponent(String(songmid)) + '&level=' + level + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端10: 聆澜API ===
  {
    name: '聆澜',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://source.shiqianjiang.cn/api/music/url?source=mg&songId=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('聆澜: 无数据')
    },
  },

  // === 后端11: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=mg&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端xx: 星海咪咕（通用聚合，取自星澜） ===
  { name: '星海咪咕', fetch: getXinghaiMg },
]

// ==================== 获取音乐URL（优先级窗口并发，语义与原串行一致） ====================

// 杰翔安全加速：把后端按「优先级窗口」并发请求，但只采纳「最小索引(最高优先级)成功者」。
// 这样最终返回的 URL 与「串行按优先级逐个尝试」在数学上完全一致（不会让快但失效的低优先级后端抢先），
// 仅把「逐个等」变成「每窗口并行等」，大幅缩短等待；不改变洛雪对 musicUrl 的校验语义。
// 纪律：单个后端的 fetch/签名逻辑原样调用 —— 不并发竞速(firstSuccess)、不拦 4xx、不硬拒 URL、不动 KW 索引选择。
const CONCURRENCY = 4 // 单窗口同时发起的后端数；本窗口全军覆没才降级到下一窗口，避免无效等待
const isPlayableUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()) // 仅做「像不像直链」的兜底，不替代洛雪自身的可达性探测

const handleGetMusicUrl = async (source, musicInfo, quality) => {
  const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id
  if (!songId) throw new Error('无法获取歌曲ID')

  let backends = {
    tx: TX_BACKENDS,
    wy: WY_BACKENDS,
    kw: KW_BACKENDS,
    kg: KG_BACKENDS,
    mg: MG_BACKENDS,
  }[source]

  if (!backends) throw new Error('未知音源: ' + source)

  // 酷我音乐：高音质（atmos/atmos_plus/master）走流媒体直链，普通音质走星海等其他后端（保持原版索引逻辑不变）
  if (source === 'kw') {
    const highQuality = ['atmos', 'atmos_plus', 'master']
    if (highQuality.includes(quality)) {
      backends = [backends[0]]
    } else {
      backends = backends.filter((_, i) => i !== 0)
    }
  }

  const errors = []
  const B = backends.length

  // 优先级竞价窗口：每窗口最多 CONCURRENCY 个后端并发请求，但一旦「最高优先级(最小索引)成功者」可确定就立即返回，
  // 不再等同窗口内排在它后面的慢后端——这正是此前比原版慢的根因（Promise.allSettled 会傻等窗口里最慢的那个）。
  // 返回结果与「串行按优先级逐个尝试」完全一致：只有 backends[0..i-1] 全失败且 backends[i] 成功才采用 i，不改变洛雪对 musicUrl 的校验语义。
  const raceWindow = (indices) => new Promise((resolve) => {
    const outcomes = {} // i -> url(成功) | null(失败/非直链)
    const decide = () => {
      for (const i of indices) {
        if (!(i in outcomes)) return        // 更低优先级的后端还没结果，不能下结论，继续等
        if (outcomes[i]) {                   // 当前最低优先级已成功 -> 采用它（更高优先级无需再等）
          console.log('[' + source + '] ' + backends[i].name + ' 成功')
          resolve(outcomes[i])
          return
        }
        // 当前最低优先级失败 -> 看下一个更高优先级
      }
      resolve(null) // 本窗口全部失败
    }
    indices.forEach((i) => {
      backends[i].fetch(songId, quality, musicInfo).then(
        (url) => {
          const u = isPlayableUrl(url) ? url : null
          if (!u) { errors.push(backends[i].name + ': 返回非直链'); console.log('[' + source + '] ' + backends[i].name + ' 返回非直链') }
          outcomes[i] = u
          decide()
        },
        (e) => {
          const msg = e && e.message ? e.message : String(e)
          errors.push(backends[i].name + ': ' + msg)
          console.log('[' + source + '] ' + backends[i].name + ' 失败: ' + msg)
          outcomes[i] = null
          decide()
        }
      )
    })
  })

  for (let start = 0; start < B; start += CONCURRENCY) {
    const end = Math.min(start + CONCURRENCY, B)
    const indices = []
    for (let i = start; i < end; i++) indices.push(i)
    const win = await raceWindow(indices) // 本窗口内有成功则立即返回；全失败才降级下一窗口
    if (win) return win
  }

  throw new Error('所有后端均失败（共' + B + '个）\n' + errors.join('\n'))
}

// ==================== 注册请求事件 ====================

on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case 'musicUrl':
      return handleGetMusicUrl(source, info.musicInfo, info.type)
        .then((data) => Promise.resolve(data))
        .catch((err) => Promise.reject(err))
    default:
      return Promise.reject('action not support: ' + action)
  }
})

// ==================== 初始化音源 ====================

const musicSources = {}
MUSIC_SOURCE.forEach((item) => {
  const nameMap = {
    tx: 'QQ音乐',
    wy: '网易云音乐',
    kw: '酷我音乐',
    kg: '酷狗音乐',
    mg: '咪咕音乐',
  }
  musicSources[item] = {
    name: nameMap[item] || item,
    type: 'music',
    actions: ['musicUrl'],
    qualitys: MUSIC_QUALITY[item],
  }
})

send(EVENT_NAMES.inited, {
  status: true,
  openDevTools: false,
  sources: musicSources,
})

console.log('[QQ音乐+网易云音乐+酷我+酷狗+咪咕聚合音源 v4.4.1] 已加载完成')
console.log('[QQ音乐] 后端数: ' + TX_BACKENDS.length + ' Cookie: ' + (HAS_TX_COOKIE ? '已配置' : '未配置'))
console.log('[网易云音乐] 后端数: ' + WY_BACKENDS.length + ' Cookie: ' + (HAS_WY_COOKIE ? '已配置' : '未配置'))
console.log('[酷我音乐] 后端数: ' + KW_BACKENDS.length)
console.log('[酷狗音乐] 后端数: ' + KG_BACKENDS.length + ' 主API: 长青海棠')
console.log('[咪咕音乐] 后端数: ' + MG_BACKENDS.length)

})(__SUB_REGISTER("jiexiang", "/*!\n * @name 杰翔聚合音源\n * @description 全平台支持flac，wy，qq，kw，kg支持母带\n * @version 2.3.0\n * @author https://qm.qq.com/cgi-bin/qm/qr?k=dEBGYbmu1lIRp7bAgHFim0W1uDsYl9v5&jump_from=webapi&authKey=fmTG96MhfqDQ5KARA/OvnuWAigCAloClvYhtSiEQd0jQneXmGons54BwlAh1+bUi\n * @homepage https://github.com/haonanren118/jiexiang-Music-Source\n * @license MIT\n * @update 2026-09-13\n * @changelog\n    1.修复wy音源\n    2.新增QQ越权\n */"));

// ==================== 子源: qingliang ====================
;(function (__lx) {
/**
 * @name 轻量音源（四平台多源并行）
 * @description QQ/网易/酷狗/酷我多线路并发取链，谁先通过音频头校验用谁；含超时取消与冷却。
 * @version 2.1.0
 * @author 本地定制
 * @license MIT
 */
(function () {
  'use strict';
  var lx = __lx;
  if (!lx || !lx.request || !lx.on || !lx.send) throw new Error('播放器未提供 LX 音源接口');

  // 当前默认只显示 QQ/网易，并关闭跨平台换歌。
  // 需要旧版的五平台同曲兜底时，可将下面两项分别改为 false / true。
  var DEFAULTS = {
    focusQQWY: false,
    allowSameSongFallback: true,
    requestTimeoutMs: 3000,
    headTimeoutMs: 1500,
    totalTimeoutMs: 6000,
    hedgeDelayMs: 0,
    cooldownMs: 45000,
    cacheTtlMs: 75000,
    cacheRecheckMs: 20000,
    maxCacheEntries: 96,
    maxHttpRequests: 5,
    maxResolverJobs: 3,
    disabledProviders: [],
    // wy-ffapi 与 wy-bileizhen 已适配，但本次有超时样本，默认不排入队列。
    extraProviders: ['qq-lzm', 'wy-yutang', 'wy-kangqi', 'wy-qjqq', 'wy-lzm']
  };
  // 可选的宿主配置，仅覆盖已知键；不使用浏览器或 Node API。
  var CONFIG = Object.assign({}, DEFAULTS);
  var override = globalThis.__QINGLIU_CONFIG__;
  if (override) Object.keys(DEFAULTS).forEach(function (key) {
    if (override[key] !== undefined) CONFIG[key] = override[key];
  });

  var UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36';
  var aliases = { qq: 'tx', tencent: 'tx', netease: 'wy', kuwo: 'kw', kugou: 'kg', migu: 'mg' };
  var names = { tx: 'QQ音乐', wy: '网易云音乐', kw: '酷我音乐', kg: '酷狗音乐', mg: '咪咕音乐' };
  var cache = new Map(), pending = new Map(), health = new Map();
  var httpActive = 0, httpQueue = [], gdTimes = [];

  function fail(message, kind) {
    var error = new Error(message);
    error.kind = kind || 'network';
    return error;
  }
  function first(info, fields) {
    for (var i = 0; i < fields.length; i++) {
      var value = info[fields[i]];
      if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim();
      if (info.meta) {
        value = info.meta[fields[i]];
        if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim();
      }
    }
    return '';
  }
  function getId(source, info) {
    var fields = source === 'kg' ? ['hash', 'songmid', 'id'] :
      source === 'mg' ? ['copyrightId', 'songmid', 'id'] :
      source === 'kw' ? ['rid', 'songmid', 'id', 'hash'] : ['songmid', 'mid', 'id', 'hash'];
    return first(info, fields).replace(source === 'kw' ? /^MUSIC_/ : /$^/, '');
  }
  function duration(info) {
    var value = info.interval || info.duration || info.DURATION || 0;
    if (typeof value === 'string' && value.indexOf(':') >= 0) {
      return value.split(':').reduce(function (a, b) { return a * 60 + Number(b); }, 0) || 0;
    }
    value = Number(value) || 0;
    return value > 10000 ? value / 1000 : value;
  }
  function normalized(value) {
    return String(value || '').toLowerCase().replace(/&nbsp;/gi, '').replace(/（/g, '(').replace(/）/g, ')').replace(/\s+/g, '');
  }
  function singerKey(value) {
    return String(value || '').split(/\s*[、/&＆;,，]\s*/).map(normalized).filter(Boolean).sort().join('|');
  }
  function query(values) {
    return Object.keys(values).map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(values[key]); }).join('&');
  }
  function json(value) {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch (_) { throw fail('接口未返回 JSON', 'business'); }
    }
    return value;
  }
  function searchJson(text) {
    if (typeof text !== 'string') return text;
    try { return JSON.parse(text); } catch (_) {}
    // 旧搜索 API 使用单引号字符串；逐字符转义为 JSON，绝不 eval。
    var out = '', i = 0;
    while (i < text.length) {
      var ch = text[i++];
      if (ch === "'" || ch === '"') {
        var quote = ch, value = '', closed = false;
        while (i < text.length) {
          ch = text[i++];
          if (ch === quote) { closed = true; break; }
          if (ch !== '\\') { value += ch; continue; }
          ch = text[i++];
          var simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '\\': '\\', "'": "'", '"': '"', '/': '/' };
          if (Object.prototype.hasOwnProperty.call(simple, ch)) value += simple[ch];
          else if ((ch === 'u' && /^[0-9a-f]{4}$/i.test(text.slice(i, i + 4))) || (ch === 'x' && /^[0-9a-f]{2}$/i.test(text.slice(i, i + 2)))) {
            var length = ch === 'u' ? 4 : 2;
            value += String.fromCharCode(parseInt(text.slice(i, i + length), 16));
            i += length;
          } else value += '\\' + ch;
        }
        if (!closed) throw fail('备用搜索返回不完整', 'business');
        out += JSON.stringify(value);
      } else if (/[A-Za-z_]/.test(ch)) {
        var word = ch;
        while (i < text.length && /[A-Za-z_]/.test(text[i])) word += text[i++];
        out += ({ True: 'true', False: 'false', None: 'null' })[word] || word;
      } else out += ch;
    }
    try { return JSON.parse(out); } catch (_) { throw fail('备用搜索格式无法解析', 'business'); }
  }
  function urlFrom(data) {
    data = json(data);
    if (!data || typeof data !== 'object') throw fail('接口返回空数据', 'business');
    if (data.code === 429 || data.code === 401 || data.code === 403 || data.code === 'APP_UPGRADE_REQUIRED') {
      throw fail('接口限流或需要授权', 'limited');
    }
    var url = data.url || (data.data && data.data.url);
    if (typeof url !== 'string' || !/^https?:\/\/[^\s]+$/i.test(url.trim())) throw fail('该接口无可用歌曲', 'business');
    return url.trim();
  }
  function makeContext() {
    var listeners = [];
    return {
      stopped: false,
      deadline: Date.now() + CONFIG.totalTimeoutMs,
      add: function (fn) { listeners.push(fn); return fn; },
      remove: function (fn) { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
      stop: function () {
        if (this.stopped) return;
        this.stopped = true;
        listeners.slice().forEach(function (fn) { fn(); });
        listeners = [];
      }
    };
  }
  function drain() {
    while (httpActive < CONFIG.maxHttpRequests && httpQueue.length) {
      var item = httpQueue.shift();
      if (!item.done()) item.start();
    }
  }
  function http(ctx, url, options, timeout) {
    return new Promise(function (resolve, reject) {
      var settled = false, started = false, abort = null;
      var remaining = ctx.deadline - Date.now();
      var wanted = timeout || CONFIG.requestTimeoutMs;
      var wait = Math.min(wanted, remaining);
      var deadlineLimited = remaining <= wanted;
      var timer;
      function finish(error, response, cancel) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ctx.remove(onCancel);
        if (cancel && typeof abort === 'function') { try { abort(); } catch (_) {} }
        if (started) httpActive--;
        if (error) reject(error); else resolve(response);
        drain();
      }
      function onCancel() { finish(fail('请求已取消', 'cancel'), null, true); }
      var item = {
        done: function () { return settled || ctx.stopped; },
        start: function () {
          started = true;
          httpActive++;
          try {
            abort = lx.request(url, Object.assign({ method: 'GET', headers: { 'User-Agent': UA }, timeout: wait }, options || {}), function (error, response, body) {
              if (error) return finish(fail('网络请求失败', 'network'));
              response = response || {};
              if (response.body === undefined) response.body = body;
              if (Number(response.statusCode) === 429) return finish(fail('接口限流', 'limited'));
              if (Number(response.statusCode) >= 400) return finish(fail('HTTP ' + response.statusCode, Number(response.statusCode) >= 500 ? 'network' : 'business'));
              finish(null, response);
            });
          } catch (_) { finish(fail('宿主请求异常', 'network')); }
          // 兼容同步 callback 以及宿主随后才返回取消句柄的情况。
          if (settled && ctx.stopped && typeof abort === 'function') { try { abort(); } catch (_) {} }
        }
      };
      if (ctx.stopped || wait <= 0) return reject(fail('总等待时间已用完', 'cancel'));
      ctx.add(onCancel);
      timer = setTimeout(function () {
        if (deadlineLimited) ctx.stop();
        else finish(fail('接口超时', started ? 'network' : 'cancel'), null, true);
      }, wait);
      httpQueue.push(item);
      drain();
    });
  }
  function header(headers, name) {
    headers = headers || {};
    var keys = Object.keys(headers);
    for (var i = 0; i < keys.length; i++) if (keys[i].toLowerCase() === name) return String(headers[keys[i]]);
    return '';
  }
  function verify(ctx, url, info) {
    return http(ctx, url, { method: 'HEAD', headers: { 'User-Agent': UA } }, CONFIG.headTimeoutMs).then(function (response) {
      if (![200, 206].includes(Number(response.statusCode))) throw fail('音频链接状态异常', 'media');
      var type = header(response.headers, 'content-type').toLowerCase();
      if (!/audio|octet-stream|application\/ogg/.test(type) || /html|json|text\//.test(type)) throw fail('返回的不是音频', 'media');
      var size = Number(header(response.headers, 'content-length')) || 0;
      var seconds = duration(info);
      // 阻止错误提示音及明显短于目标曲目的试听片段；这不是完整音轨/编码校验。
      var minimum = Math.max(128000, seconds * 3000);
      if (size > 0 && size < minimum) throw fail('返回的是短片段或提示音', 'media');
      return url;
    }).catch(function (error) {
      if (error.kind === 'business' && /HTTP 40[13]/.test(error.message)) error.kind = 'media';
      throw error;
    });
  }
  function post(ctx, url, body) {
    return http(ctx, url, { method: 'POST', headers: { 'User-Agent': 'lx-music-mobile/2.0.0', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return urlFrom(r.body); });
  }
  function wwwweb(ctx, source, info, quality) {
    return post(ctx, 'https://c.wwwweb.top/music/url', { source: source, musicId: getId(source, info), quality: quality });
  }
  function qqResolve(ctx, info) {
    return http(ctx, 'https://api.xunhuisi.store/API/QQMusic/Song.php?' + query({ mid: getId('tx', info), type: 'json' })).then(function (r) {
      var data = json(r.body);
      if (!data || Number(data.code) !== 200 || typeof data.music_url !== 'string') throw fail('QQ 专用接口没有可播音频', 'business');
      var url = data.music_url.trim();
      if (!/^https?:\/\/[^\s]+$/i.test(url)) throw fail('QQ 音频地址无效', 'business');
      return url;
    });
  }
  function pathValue(data, path) {
    var keys = path.split('.');
    for (var i = 0; i < keys.length; i++) {
      if (data === null || data === undefined) return undefined;
      data = data[keys[i]];
    }
    return data;
  }
  function apiUrl(response, paths) {
    var data = json(response.body);
    if (!data || typeof data !== 'object') throw fail('备用接口无歌曲数据', 'business');
    var code = data.code === undefined ? data.status : data.code;
    if ([401, 403, 429].indexOf(Number(code)) >= 0) throw fail('备用接口需要授权或被限流', 'limited');
    for (var i = 0; i < paths.length; i++) {
      var value = pathValue(data, paths[i]);
      if (typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value.trim())) return value.trim();
    }
    throw fail('备用接口没有音频地址', 'business');
  }
  function formRequest(ctx, url, values, referer) {
    var headers = { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' };
    if (referer) headers.Referer = referer;
    return http(ctx, url, { method: 'POST', headers: headers, body: query(values) });
  }
  // 不使用共享账号卡密；每个接口只读取明确的音频字段。
  var EXTRA = {
    'qq-lzm': { source: 'tx', qualities: ['128k', '320k'], run: function (ctx, info) {
      return formRequest(ctx, 'https://music.lzmhhh.com/api/music/url', { id: getId('tx', info), type: 'qq' }, 'https://music.lzmhhh.com/').then(function (r) { return apiUrl(r, ['data', 'data.url']); });
    } },
    'wy-yutang': { source: 'wy', qualities: ['128k', '320k', 'flac'], run: function (ctx, info, quality) {
      return http(ctx, 'https://api.yutangxiaowu.cn/api/music/Song_V1?' + query({ url: getId('wy', info), level: level(quality), type: 'json' })).then(function (r) { return apiUrl(r, ['url', 'data.url']); });
    } },
    'wy-kangqi': { source: 'wy', qualities: ['128k', '320k', 'flac'], run: function (ctx, info, quality) {
      return formRequest(ctx, 'https://ncm.kangqiovo.com/Song_V1', { url: getId('wy', info), level: level(quality), type: 'json' }, 'https://ncm.kangqiovo.com/').then(function (r) { return apiUrl(r, ['data.url', 'url']); });
    } },
    'wy-qjqq': { source: 'wy', qualities: ['128k', '320k', 'flac'], run: function (ctx, info, quality) {
      return formRequest(ctx, 'https://metings.qjqq.cn/Song_V1', { url: getId('wy', info), level: level(quality), type: 'json' }).then(function (r) { return apiUrl(r, ['data.url', 'url']); });
    } },
    'wy-ffapi': { source: 'wy', qualities: ['128k', '320k', 'flac'], run: function (ctx, info, quality) {
      return http(ctx, 'https://ffapi.cn/int/v1/netease_url?' + query({ id: getId('wy', info), quality: level(quality) })).then(function (r) { return apiUrl(r, ['url', 'data.url']); });
    } },
    'wy-bileizhen': { source: 'wy', qualities: ['128k', '320k', 'flac'], run: function (ctx, info, quality) {
      // 这是音频流型接口；直接交给统一 HEAD 校验，不能先下载整首再当 JSON 解析。
      return Promise.resolve('https://api.bileizhen.top/api/netease?' + query({ id: getId('wy', info), level: level(quality) }));
    } },
    'wy-lzm': { source: 'wy', qualities: ['320k'], run: function (ctx, info) {
      // 该接口固定返回其服务端音质，不把它当作 FLAC 或低码率专线。
      return formRequest(ctx, 'https://music.lzmhhh.com/api/music/url', { id: getId('wy', info), type: 'wy' }, 'https://music.lzmhhh.com/').then(function (r) { return apiUrl(r, ['data', 'data.url']); });
    } }
  };
  function level(quality) { return { '128k': 'standard', '320k': 'exhigh', flac: 'lossless' }[quality]; }

  // ==== 酷狗（kg）直连通道 ====
  function kugouMobile(ctx, info) {
    var hash = getId('kg', info);
    if (!hash) return Promise.reject(fail('酷狗歌曲缺少 hash', 'business'));
    return http(ctx, 'https://m.kugou.com/app/i/getSongInfo.php?' + query({ cmd: 'playInfo', hash: hash }), {
      headers: { 'User-Agent': UA, 'Referer': 'https://m.kugou.com/' }
    }).then(function (r) {
      var data = json(r.body);
      var url = data && (data.url || (data.data && data.data.url));
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw fail('酷狗 playInfo 没有返回播放地址', 'business');
      return url;
    });
  }
  function kugouWebApi(ctx, info) {
    var hash = getId('kg', info);
    if (!hash) return Promise.reject(fail('酷狗歌曲缺少 hash', 'business'));
    var mid = ''; for (var i = 0; i < 32; i++) mid += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    var dfid = '1' + Math.random().toString(16).slice(2, 10) + '9';
    var albumId = first(info, ['albumId', 'album_id', 'albumid']);
    return http(ctx, 'https://wwwapi.kugou.com/yy/index.php?' + query({ r: 'play/getdata', hash: hash, album_id: albumId, dfid: dfid, mid: mid, platid: '4' }), {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.kugou.com/', 'Cookie': 'kg_mid=' + mid + '; kg_dfid=' + dfid + ';' }
    }).then(function (r) {
      var data = json(r.body);
      var url = data && data.data && (data.data.play_url || data.data.play_backup_url);
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw fail('酷狗接口没有返回播放地址', 'business');
      return url;
    });
  }
  function kuwoDirect(ctx, info, quality) {
    var br = { '128k': '128kmp3', '320k': '320kmp3', flac: '2000kflac' }[quality];
    return http(ctx, 'http://nmobi.kuwo.cn/mobi.s?' + query({ f: 'web', user: 0, source: 'kwplayerhd_ar_1.1.4.5_tianbao_T1A_qirui.apk', type: 'convert_url_with_sign', rid: getId('kw', info), br: br })).then(function (r) { return urlFrom(r.body); });
  }
  function gd(ctx, info, quality) {
    var now = Date.now();
    gdTimes = gdTimes.filter(function (t) { return now - t < 300000; });
    if (gdTimes.length >= 40) return Promise.reject(fail('GD 公共接口暂缓请求', 'limited'));
    gdTimes.push(now);
    return http(ctx, 'https://music-api.gdstudio.xyz/api.php?' + query({ types: 'url', source: 'netease', id: getId('wy', info), br: { '128k': 128, '320k': 320, flac: 740 }[quality] })).then(function (r) { return urlFrom(r.body); });
  }
  function sameSong(info, candidate) {
    var title = normalized(info.name || info.songname || info.songName);
    var artist = singerKey(info.singer || info.artist);
    // 使用 SONGNAME 保留伴奏/现场/片段标记，不能只看接口的通用 NAME 字段。
    if (!title || !artist || title !== normalized(candidate.SONGNAME || candidate.NAME) || artist !== singerKey(candidate.ARTIST)) return false;
    var targetDuration = duration(info), candidateDuration = duration(candidate);
    if (targetDuration && candidateDuration && Math.abs(targetDuration - candidateDuration) > 4) return false;
    var album = normalized(info.albumName || info.album);
    var candidateAlbum = normalized(candidate.ALBUM);
    if (album && candidateAlbum && album !== candidateAlbum) return false;
    // 没有时长可交叉核对时，必须有相同专辑。
    if (!(targetDuration && candidateDuration) && !(album && candidateAlbum && album === candidateAlbum)) return false;
    return true;
  }
  function matchKuwo(ctx, info) {
    var title = info.name || info.songname || info.songName;
    var artist = info.singer || info.artist;
    if (!title || !artist) return Promise.reject(fail('缺少歌名或歌手，未启用同曲换源', 'business'));
    return http(ctx, 'https://search.kuwo.cn/r.s?' + query({ all: title + ' ' + artist, ft: 'music', itemset: 'web_2013', client: 'kt', pn: 0, rn: 8, rformat: 'json', encoding: 'utf8' })).then(function (r) {
      var data = searchJson(r.body);
      var candidates = data && data.abslist || [];
      var found = candidates.filter(function (item) { return sameSong(info, item); })[0];
      if (!found) throw fail('没有找到歌名、歌手和版本一致的备用歌曲', 'business');
      return Object.assign({}, info, { rid: String(found.MUSICRID).replace(/^MUSIC_/, ''), hash: '', songmid: '', id: '' });
    });
  }
  function state(key) {
    if (!health.has(key)) health.set(key, { failures: 0, until: 0 });
    return health.get(key);
  }
  function note(key, error) {
    var s = state(key);
    if (!error) { s.failures = 0; s.until = 0; return; }
    if (error.kind === 'cancel' || error.kind === 'business') return;
    s.failures++;
    if (error.kind === 'limited' || s.failures >= 2) s.until = Date.now() + CONFIG.cooldownMs;
  }
  function jobs(ctx, source, info, quality) {
    var result = [], gdAdded = false;
    function add(key, run) {
      var disabled = Array.isArray(CONFIG.disabledProviders) && CONFIG.disabledProviders.some(function (id) { return key === id || key.indexOf(id + ':') === 0; });
      if (disabled) return;
      if (state(key).until <= Date.now()) result.push({ key: key, run: run });
    }
    if (source === 'tx' && quality === '128k') add('qq-dedicated', function () { return qqResolve(ctx, info); });
    if (source !== 'mg' && source !== 'tx') add('wwwweb:' + source + ':' + quality, function () { return wwwweb(ctx, source, info, quality); });
    // 快速候选排在旧的公共备用之前。这里只是候选队列，不会同时请求全部接口。
    (Array.isArray(CONFIG.extraProviders) ? CONFIG.extraProviders : []).forEach(function (id) {
      var provider = EXTRA[id];
      if (provider && provider.source === source && provider.qualities.indexOf(quality) >= 0) {
        add(id + ':' + quality, function () { return provider.run(ctx, info, quality); });
        if (source === 'wy' && !gdAdded) {
          add('gd:' + quality, function () { return gd(ctx, info, quality); });
          gdAdded = true;
        }
      }
    });
    if (source === 'tx') add('wwwweb:' + source + ':' + quality, function () { return wwwweb(ctx, source, info, quality); });
    if (source === 'kw') add('kuwo-direct:' + quality, function () { return kuwoDirect(ctx, info, quality); });
    if (source === 'kg') {
      add('kg-mobile:' + quality, function () { return kugouMobile(ctx, info); });
      add('kg-webapi:' + quality, function () { return kugouWebApi(ctx, info); });
    }
    if (source === 'wy') {
      if (!gdAdded) add('gd:' + quality, function () { return gd(ctx, info, quality); });
      if (quality === '128k') add('netease-free', function () { return Promise.resolve('https://music.163.com/song/media/outer/url?id=' + encodeURIComponent(getId('wy', info)) + '.mp3'); });
    }
    if (source !== 'kw' && CONFIG.allowSameSongFallback) {
      var match;
      function matched() { if (!match) match = matchKuwo(ctx, info); return match; }
      add('same-song:wwwweb:' + quality, function () { return matched().then(function (candidate) { return wwwweb(ctx, 'kw', candidate, quality); }); });
      add('same-song:kuwo-direct:' + quality, function () { return matched().then(function (candidate) { return kuwoDirect(ctx, candidate, quality); }); });
    }
    return result;
  }
  function race(ctx, candidates, info) {
    return new Promise(function (resolve, reject) {
      var count = candidates.length, complete = false, errors = [], timers = [];
      var next = 0, active = 0, hedged = false;
      if (!count) return reject(fail('没有可用候选：接口已停用或冷却中', 'business'));
      function finish(error, url) {
        if (complete) return;
        complete = true;
        timers.forEach(clearTimeout);
        ctx.stop();
        if (error) reject(error); else resolve(url);
      }
      timers.push(setTimeout(function () { finish(fail('取链超过 ' + (CONFIG.totalTimeoutMs / 1000) + ' 秒，已停止等待')); }, Math.max(1, ctx.deadline - Date.now())));
      function pump() {
        if (complete) return;
        var limit = hedged ? Math.max(1, Math.min(2, CONFIG.maxResolverJobs)) : 1;
        while (active < limit && next < candidates.length) launch(candidates[next++]);
      }
      function launch(candidate) {
          if (complete) return;
          active++;
          Promise.resolve().then(candidate.run).then(function (url) { return verify(ctx, url, info); }).then(function (url) {
            if (complete) return;
            note(candidate.key, null);
            finish(null, url);
          }, function (error) {
            if (complete) return;
            if (ctx.stopped) return finish(fail('取链超过 ' + (CONFIG.totalTimeoutMs / 1000) + ' 秒，已停止等待'));
            active--;
            note(candidate.key, error);
            errors.push(candidate.key + ': ' + error.message);
            if (--count === 0) finish(fail('当前歌曲未找到可播链接：' + errors.join('；'), 'business'));
            else pump();
          });
      }
      // 解析任务包括取链和 HEAD 校验。最多两条任务占位，避免大量 API 请求把已拿到的音频校验堵在队尾。
      timers.push(setTimeout(function () { hedged = true; pump(); }, CONFIG.hedgeDelayMs));
      pump();
    });
  }
  function store(key, url) {
    cache.delete(key);
    cache.set(key, { url: url, at: Date.now() });
    while (cache.size > CONFIG.maxCacheEntries) cache.delete(cache.keys().next().value);
  }
  function resolveMusic(source, info, quality) {
    source = aliases[source] || source;
    if (!names[source] || (CONFIG.focusQQWY && source !== 'tx' && source !== 'wy')) return Promise.reject(fail('本版重点支持 QQ 和网易云', 'business'));
    if (['128k', '320k', 'flac'].indexOf(quality) < 0) return Promise.reject(fail('请使用标准、320k 或 FLAC 音质', 'business'));
    var id = getId(source, info);
    if (!id) return Promise.reject(fail('歌曲缺少平台 ID，请重新搜索', 'business'));
    var key = [source, id, quality, info.name || '', info.singer || ''].join('|');
    if (pending.has(key)) return pending.get(key);
    var ctx = makeContext(), cached = cache.get(key);
    var work, fresh = false;
    if (cached && Date.now() - cached.at < CONFIG.cacheTtlMs) {
      work = Date.now() - cached.at < CONFIG.cacheRecheckMs ? Promise.resolve(cached.url) : verify(ctx, cached.url, info).then(function (url) { fresh = true; return url; });
      work = work.catch(function () { cache.delete(key); return race(ctx, jobs(ctx, source, info, quality), info).then(function (url) { fresh = true; return url; }); });
    } else work = race(ctx, jobs(ctx, source, info, quality), info).then(function (url) { fresh = true; return url; });
    work = work.then(function (url) { ctx.stop(); if (fresh) store(key, url); pending.delete(key); return url; }, function (error) { ctx.stop(); pending.delete(key); cache.delete(key); throw error; });
    pending.set(key, work);
    return work;
  }
  lx.on(lx.EVENT_NAMES.request, function (event) {
    if (!event || event.action !== 'musicUrl') return Promise.reject(fail('仅支持歌曲播放取链', 'business'));
    return resolveMusic(event.source, event.info && event.info.musicInfo || {}, event.info && event.info.type || '128k');
  });
  var sources = {};
  (CONFIG.focusQQWY ? ['tx', 'wy'] : ['tx', 'wy', 'kw', 'kg']).forEach(function (source) {
    sources[source] = { name: names[source], type: 'music', actions: ['musicUrl'], qualitys: source === 'tx' ? ['128k'] : ['128k', '320k', 'flac'] };
  });
  lx.send(lx.EVENT_NAMES.inited, { status: true, sources: sources });
})();

})(__SUB_REGISTER("qingliang", ""));

// ==================== 子源: xinglan ====================
;(function (__lx) {
/*!
 * @name 星澜聚合音源 (StellarWave)
 * @description 星澜 v4.0.2 与墨澜 v2.3.6 融合版：落月 QQ 主线路 + 云记（海堂）/HYWmusic/星海/念心等备用后端，支持母带/全景声/汽水音乐
 * @version v4.0.2
 * @author 星澜团队
 * @homepage https://github.com/your-repo/StellarWave
 * @license MIT
 * @update 2026-11-06
 * @changelog
 *   - v4.0.2 (2026-11-06)
 *     · QQ 音乐主线路改为「落月」API（api.vkeys.cn），v2 geturl 失败自动降级到 v3 song/link
 *     · 落月音质映射：6=128k 8=320k 10=flac 11=hires 13=atmos 16=atmos_plus 14=master
 *     · 修复 HYWmusic 后端：卡密 6C1F-53W0-GRKI-EVFG，完整 musicInfo 参数（对齐 HYWmusic v1.2.0）
 *     · QQ / 酷狗后端池 HYWmusic 提升到可用位置
 *     · QQ 官方后端从 Cookie 提取真实 uin，检测试听片段（freeTrialInfo / RS0），避免只播放几秒
 *     · 各平台 HYWmusic 后端统一 getHYWMusicUrl 实现，按平台做音质降级映射
 *     · 白姬KG 卡密同步更新为 6C1F-53W0-GRKI-EVFG
 *   - v4.0.1 (2026-11-05) 修复与合并版本
 *     · 融合墨澜 v2.3.5：QQ / 咪咕 / 酷狗采用云记（海堂）resolve-url 为主线路
 *     · 新增汽水音乐 (qs) 音源（星海汽水双线路）
 *     · 咪咕：云记主线路 + 音质路径改写与降级探测
 *     · 网易云官方 enhance/player/url/v1：ids 改为 "[id]" 字符串，immerseType 仅 sky 携带
 *     · QQ 官方文件前缀：臻品母带 AI00、臻品音质 Q000、全景声 Q001/Q003
 *     · 移除 QQ 越权后端；URL 缓存 20 分钟；并发合并；滑动窗口限流
 *     · 请求 body 统一序列化为 JSON，全部请求增加超时兜底
 *     · 酷我：高音质走流媒体直链，普通音质跳过流媒体直链
 */

const { EVENT_NAMES, request, on, send, utils, env, version, currentScriptInfo } = __lx

// ==================== URL 解码函数 ====================
const _u = (str) => str.split('').map(c => String.fromCharCode(c.charCodeAt(0) + 5)).join('');

// ==================== 解析头部注解（支持 Cookie） ====================
const currentScript = currentScriptInfo
  ? currentScriptInfo.rawScript
  : (typeof document !== 'undefined' ? document.currentScript?.textContent || '' : '')

const parseHeader = (str) => {
  const comment = /^\/\*!(?:.|\n)+?\*\//.exec(str)?.[0]
  if (!comment) return {}
  const result = {}
  const pairs = [
    { key: 'tx_cookie', regex: /\*\s*@tx_cookie\s+(.+)/ },
    { key: 'wy_cookie', regex: /\*\s*@wy_cookie\s+(.+)/ },
  ]
  for (const { key, regex } of pairs) {
    const match = regex.exec(comment)
    const val = match?.[1]?.trim()
    result[key] = (!val || val === 'null') ? '' : val
  }
  return result
}

const config = parseHeader(currentScript)
const TX_COOKIE = config.tx_cookie
const WY_COOKIE = config.wy_cookie
const HAS_TX_COOKIE = !!TX_COOKIE
const HAS_WY_COOKIE = !!WY_COOKIE

// ==================== 音质列表（每平台独立） ====================
const MUSIC_QUALITY = {
  tx: ['128k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master'],
  wy: HAS_WY_COOKIE
    ? ['128k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'master']
    : ['128k', '320k', 'flac'],
  kw: ['128k', '192k', '320k', 'flac', 'flac24bit'],
  kg: ['128k', '320k', 'flac', 'hires', 'atmos', 'master'],
  mg: ['128k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'master'],
  qs: ['128k', '320k', 'flac', 'spatial', 'hires'],
}

const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY)

// ==================== 工具函数 ====================
const isBufferLike = (obj) => obj && typeof obj === 'object' && (
  (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(obj)) ||
  (typeof obj.constructor === 'function' && obj.constructor.name === 'Buffer')
)

const parseBody = (body) => {
  if (body == null) return body
  const tryJson = (str) => {
    if (typeof str !== 'string') return str
    const trimmed = str.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
      try { return JSON.parse(trimmed) } catch (e) {}
    }
    return str
  }
  if (typeof body === 'string') return tryJson(body)
  if (isBufferLike(body)) {
    try {
      const text = __lx?.utils?.buffer?.bufToString
        ? __lx.utils.buffer.bufToString(body, 'utf-8')
        : (typeof Buffer !== 'undefined' ? Buffer.from(body).toString('utf-8') : String(body))
      return tryJson(text)
    } catch (e) {
      return body
    }
  }
  return body
}

const normalizeOptions = (options) => {
  const opts = { ...options }
  if (opts.body != null && typeof opts.body === 'object' && !isBufferLike(opts.body)) {
    opts.body = JSON.stringify(opts.body)
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  }
  return opts
}

const httpFetch = (url, options = { method: 'GET' }) => new Promise((resolve, reject) => {
  const timeout = options.timeout || 15000
  let settled = false
  const timer = setTimeout(() => {
    if (settled) return
    settled = true
    reject(new Error('请求超时 ' + timeout + 'ms'))
  }, timeout)
  request(url, { ...normalizeOptions(options), timeout }, (err, resp) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (err) return reject(err)
    resolve({ body: parseBody(resp.body), statusCode: resp.statusCode, headers: resp.headers || {} })
  })
})

const md5 = (str) => utils.crypto.md5(str)

const randomGuid = () => {
  const hex = '0123456789abcdef'
  let guid = ''
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)]
  return guid
}

const aesEncrypt = (data, key, iv, mode) => {
  if (!version) mode = mode.split('-').pop()
  return utils.crypto.aesEncrypt(data, mode, key, iv)
}

const buf2hex = (buffer) => {
  return version
    ? utils.buffer.bufToString(buffer, 'hex')
    : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

const wyEapi = (url, object) => {
  const eapiKey = 'e82ckenh8dichen8'
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt')
  const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest
  return { params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase() }
}

const objToForm = (obj) => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&')

const extractUrl = (obj, paths) => {
  const candidates = []
  for (const path of paths) {
    let val = obj
    for (const key of path) {
      if (val == null) { val = undefined; break }
      val = val[key]
    }
    if (Array.isArray(val)) candidates.push(...val)
    else if (val != null) candidates.push(val)
  }
  for (const val of candidates) {
    if (typeof val !== 'string') continue
    if (val.startsWith('http://') || val.startsWith('https://')) return val
    if (val.startsWith('//')) return 'https:' + val
  }
  return ''
}

const cleanUrl = (url) => {
  if (!url) return ''
  const s = String(url).replace(/\\?u0026/gi, '&').replace(/\\&/g, '&').replace(/\$/g, '&')
  const idx = s.indexOf('?')
  return idx > 0 ? s.substring(0, idx) : s
}

const qualityToLevel = (quality) => {
  const map = {
    '128k': 'standard', '192k': 'standard', '320k': 'exhigh',
    'flac': 'lossless', 'flac24bit': 'lossless', 'hires': 'lossless',
    'atmos': 'lossless', 'atmos_plus': 'lossless', 'master': 'lossless',
  }
  return map[quality] || 'standard'
}

// ==================== SHA256 工具 ====================
const sha256 = (function () {
  const HEX_CHARS = '0123456789abcdef'.split('');
  function Sha256() {
    this.blocks = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    this.h0 = 0x6a09e667; this.h1 = 0xbb67ae85; this.h2 = 0x3c6ef372; this.h3 = 0xa54ff53a;
    this.h4 = 0x510e527f; this.h5 = 0x9b05688c; this.h6 = 0x1f83d9ab; this.h7 = 0x5be0cd19;
    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false; this.first = true;
  }
  Sha256.prototype.update = function (message) {
    if (this.finalized) return;
    const notString = typeof message !== 'string';
    const blocks = this.blocks;
    for (let i = 0; i < message.length; i++) {
      if (this.hashed) {
        this.hashed = false; blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }
      const code = notString ? message[i] : message.charCodeAt(i);
      blocks[this.start >> 2] |= code << (24 - (this.start % 4) * 8);
      this.start++;
      if (this.start === 64) {
        this.block = blocks[16]; this.start = 0; this.hash(); this.hashed = true;
      }
    }
    this.bytes += message.length;
    if (this.bytes > 4294967295) { this.hBytes += this.bytes / 4294967296 << 0; this.bytes = this.bytes % 4294967296; }
    return this;
  };
  Sha256.prototype.finalize = function () {
    if (this.finalized) return;
    this.finalized = true;
    const blocks = this.blocks;
    let i = this.start;
    blocks[16] = this.block;
    blocks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) this.hash();
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };
  Sha256.prototype.hash = function () {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    let a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7;
    const blocks = this.blocks;
    for (let j = 0; j < 64; j++) {
      if (j >= 16) {
        const w0 = blocks[j - 15], w1 = blocks[j - 2];
        const s0 = ((w0 >>> 7) | (w0 << 25)) ^ ((w0 >>> 18) | (w0 << 14)) ^ (w0 >>> 3);
        const s1 = ((w1 >>> 17) | (w1 << 15)) ^ ((w1 >>> 19) | (w1 << 13)) ^ (w1 >>> 10);
        blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1;
      }
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = h + S1 + ch + K[j] + (blocks[j] >>> 0);
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = S0 + maj;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    this.h0 = (this.h0 + a) >>> 0; this.h1 = (this.h1 + b) >>> 0;
    this.h2 = (this.h2 + c) >>> 0; this.h3 = (this.h3 + d) >>> 0;
    this.h4 = (this.h4 + e) >>> 0; this.h5 = (this.h5 + f) >>> 0;
    this.h6 = (this.h6 + g) >>> 0; this.h7 = (this.h7 + h) >>> 0;
  };
  Sha256.prototype.hex = function () {
    this.finalize();
    const { h0, h1, h2, h3, h4, h5, h6, h7 } = this;
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(x =>
      HEX_CHARS[(x >> 28) & 0x0F] + HEX_CHARS[(x >> 24) & 0x0F] + HEX_CHARS[(x >> 20) & 0x0F] + HEX_CHARS[(x >> 16) & 0x0F] +
      HEX_CHARS[(x >> 12) & 0x0F] + HEX_CHARS[(x >> 8) & 0x0F] + HEX_CHARS[(x >> 4) & 0x0F] + HEX_CHARS[x & 0x0F]
    ).join('');
  };
  return function (message) { return new Sha256().update(message).hex(); };
})();

const HELLO_WORLD_SECRET_KEY = 'JaJ?a7Nwk_Fgj?2o:znAkst';
const HELLO_WORLD_SCRIPT_MD5 = '1888f9865338afe6d5534b35171c61a4';
const HYW_API_BASE = 'https://103.79.184.97'
const HYW_CARD_KEY = '6C1F-53W0-GRKI-EVFG'

// ==================== HYWmusic 通用参数收集 & 请求（对齐 HYWmusic v1.2.0） ====================

const collectMusicInfoParams = (musicInfo, platform) => {
  if (!musicInfo) return {}
  const params = {}
  const songId = musicInfo.songmid || musicInfo.songId || musicInfo.id || musicInfo.hash
    || musicInfo.rid || musicInfo.musicId || musicInfo.copyrightId || musicInfo.songid || ''
  if (songId) params.songId = songId
  if (musicInfo.songmid) params.songmid = musicInfo.songmid
  if (musicInfo.hash) params.hash = musicInfo.hash

  const fields = ['albumAudioId', 'strMediaMid', 'mediaMid', 'copyrightId', 'rid', 'musicId',
    'albumId', 'albumName', 'albumMid', 'songname', 'songName', 'name', 'singer', 'singers', 'artist']
  for (const f of fields) {
    if (musicInfo[f] !== undefined && musicInfo[f] !== null && musicInfo[f] !== '') params[f] = musicInfo[f]
    if (musicInfo.meta && musicInfo.meta[f] !== undefined && musicInfo.meta[f] !== null && musicInfo.meta[f] !== '') params[f] = musicInfo.meta[f]
  }
  params.platform = platform
  params.source = platform
  return params
}

const HYW_QUALITY_MAP = {
  tx: { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'flac24bit', hires: 'flac24bit', atmos: 'flac24bit', atmos_plus: 'flac24bit', master: 'flac24bit' },
  kg: { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'flac24bit', hires: 'flac24bit', atmos: 'flac24bit', atmos_plus: 'flac24bit', master: 'flac24bit' },
  wy: { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'flac24bit', hires: 'flac24bit', atmos: 'flac24bit', master: 'flac24bit' },
  kw: { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'flac24bit' },
  mg: { '128k': '128k', '320k': '320k' },
}

const getHYWMusicUrl = async (source, songmid, quality, musicInfo) => {
  const params = collectMusicInfoParams(musicInfo, source)
  if (!params.songId && songmid) params.songId = songmid
  if (quality) {
    const map = HYW_QUALITY_MAP[source]
    params.quality = (map && map[quality]) ? map[quality] : quality
  }
  if (HYW_CARD_KEY) params.key = HYW_CARD_KEY

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => k + '=' + encodeURIComponent(String(v)))
    .join('&')
  const url = HYW_API_BASE + '/api/music/url' + (query ? '?' + query : '')

  const res = await httpFetch(url, {
    method: 'GET', timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  })
  const d = res.body
  if (!d || typeof d !== 'object') throw new Error('HYWmusic: 空响应')
  if (d.code === 200) {
    if (d.url) return d.url
    if (d.data && d.data.url) return d.data.url
    if (typeof d.data === 'string' && d.data.startsWith('http')) return d.data
  }
  if (d.code === 401 || d.code === 403) throw new Error('HYWmusic: 鉴权失败')
  if (d.code === 429) throw new Error('HYWmusic: 请求过速')
  throw new Error('HYWmusic: ' + (d.message || d.msg || ('code=' + d.code)))
}

const extractUinFromCookie = (cookie) => {
  if (!cookie) return '0'
  const match = /(?:^|;\s*)uin=o?(\d+)/.exec(cookie)
  return match ? match[1] : '0'
}

// ==================== 音质映射表 ====================
const TX_FILE_CONFIG = {
  '128k': { s: 'M500', e: '.mp3' }, '320k': { s: 'M800', e: '.mp3' },
  flac: { s: 'F000', e: '.flac' }, flac24bit: { s: 'Q000', e: '.flac' },
  hires: { s: 'Q000', e: '.flac' }, atmos: { s: 'Q001', e: '.flac' },
  atmos_plus: { s: 'Q003', e: '.flac' }, master: { s: 'AI00', e: '.flac' },
}
const WY_LEVEL_MAP = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires', hires: 'hires', atmos: 'sky', master: 'jymaster' }
const KW_LEVEL_MAP = { '128k': '128k', '192k': '128k', '320k': '320k', flac: 'lossless', flac24bit: 'lossless' }
const KG_LEVEL_MAP = { '128k': 'standard', '192k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires', hires: 'hires', atmos: 'atmos', atmos_plus: 'atmos', master: 'clear' }
const KW_STREAM_LEVEL_MAP = { '128k': '128k', '192k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'flac', hires: 'hires', atmos: 'atmos', atmos_plus: 'atmos_plus', master: 'master' }

// 落月 QQ 音质 → 落月 quality 参数
const LUOYUE_TX_QUALITY = {
  '128k': 6,
  '320k': 8,
  flac: 10,
  flac24bit: 10,
  hires: 11,
  atmos: 13,
  atmos_plus: 16,
  master: 14,
}

// ==================== 运行参数（缓存 / 限流） ====================

const CACHE_TTL = 1200000
const CACHE_MAX_ENTRIES = 500
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 1000
const RATE_LIMIT_MAX_WAIT = 1500
const LOG_DEBUG = false

const DEBUGLog = (...args) => {
  if (LOG_DEBUG) console.log('[星澜-DEBUG]', ...args)
}

// ==================== baimusic QQ 加密工具（备用后端） ====================

const _u8 = (arr) => {
  const bytes = new Uint8Array(arr.length)
  for (let i = 0; i < arr.length; i++) bytes[i] = arr[i]
  return bytes
}

const _utf8Encode = (str) => {
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i++
      }
    }
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63))
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
  }
  return _u8(bytes)
}

const _base64Encode = (bytes) => {
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    out += b64[b0 >> 2]
    out += b64[((b0 & 3) << 4) | (b1 >> 4)]
    out += i + 1 < bytes.length ? b64[((b1 & 15) << 2) | (b2 >> 6)] : '='
    out += i + 2 < bytes.length ? b64[b2 & 63] : '='
  }
  return out
}

const _base64Decode = (str) => {
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const map = {}
  for (let i = 0; i < b64.length; i++) map[b64[i]] = i
  str = str.replace(/=+$/, '')
  const out = []
  let buffer = 0, bits = 0
  for (let i = 0; i < str.length; i++) {
    buffer = (buffer << 6) | map[str[i]]
    bits += 6
    if (bits >= 8) { bits -= 8; out.push((buffer >> bits) & 0xff) }
  }
  return _u8(out)
}

const _hexDecode = (hex) => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

const _sha256 = (bytes) => {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]
  const l = bytes.length
  const bitLen = l * 8
  const padded = new Uint8Array(((l + 8) >> 6 << 6) + 64)
  padded.set(bytes)
  padded[l] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 4, bitLen >>> 0, false)
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false)
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
  const w = new Array(64)
  const rotr = (x, n) => (x >>> n) | (x << (32 - n))
  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false)
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0
      h = g; g = f; f = e; e = (d + temp1) | 0
      d = c; c = b; b = a; a = (temp1 + temp2) | 0
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0
  }
  const toHex = (x) => ('00000000' + (x >>> 0).toString(16)).slice(-8)
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)
}

const _hmacSha256Hex = (key, msg) => {
  const k = key.length > 64 ? _hexDecode(_sha256(key)) : key
  const ipad = new Uint8Array(64)
  const opad = new Uint8Array(64)
  for (let i = 0; i < 64; i++) ipad[i] = 0x36
  for (let i = 0; i < 64; i++) opad[i] = 0x5c
  for (let i = 0; i < k.length; i++) { ipad[i] ^= k[i]; opad[i] ^= k[i] }
  const inner = new Uint8Array(ipad.length + msg.length)
  inner.set(ipad); inner.set(msg, ipad.length)
  const outer = new Uint8Array(opad.length + 32)
  outer.set(opad); outer.set(_hexDecode(_sha256(inner)), opad.length)
  return _sha256(outer)
}

const _SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]

const _buildMagicSbox = () => {
  const s = _SBOX.slice()
  const swaps = [[0, 99], [82, 120], [160, 224], [27, 212]]
  for (const [a, b] of swaps) { const t = s[a]; s[a] = s[b]; s[b] = t }
  return s
}

const _REQ_KEY = _u8([0x4b, 0x72, 0x9a, 0xf3, 0x1d, 0x88, 0xc5, 0x07, 0xbe, 0x34, 0x61, 0xaa, 0x09, 0x55, 0xe2, 0x7c])
const _REQ_IV = _u8([0x3f, 0x91, 0x6d, 0x04, 0xba, 0x27, 0xcc, 0x58, 0x14, 0xf9, 0x8b, 0xe0, 0x72, 0x4a, 0xd6, 0x01])
const _RESP_KEY = _u8([0x9c, 0x4e, 0x71, 0xb2, 0xda, 0x38, 0x06, 0xf5, 0x83, 0xcc, 0x1a, 0x47, 0x29, 0xe8, 0x5d, 0xbf])
const _HMAC_KEY = _u8([0x5a, 0x1f, 0x8e, 0x3c, 0xb7, 0x92, 0x64, 0x0d, 0xfa, 0x48, 0x15, 0x7b, 0xe3, 0xc9, 0x2a, 0x86])

const _magicAesEncrypt = (plaintext) => {
  const bytes = _utf8Encode(plaintext)
  const padLen = 16 - (bytes.length % 16)
  const padByte = padLen ^ 90
  const padded = new Uint8Array(bytes.length + padLen)
  padded.set(bytes)
  for (let i = bytes.length; i < padded.length; i++) padded[i] = padByte
  const sbox = _buildMagicSbox()
  const key = _REQ_KEY
  const iv = _REQ_IV.slice()
  const out = new Uint8Array(padded.length)
  for (let i = 0; i < padded.length; i += 16) {
    const block = new Array(16)
    for (let j = 0; j < 16; j++) block[j] = (padded[i + j] & 0xff) ^ iv[j]
    for (let j = 0; j < 16; j++) block[j] = sbox[block[j]]
    for (let j = 0; j < 16; j++) block[j] = block[j] ^ key[j]
    const shifted = new Array(16)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) shifted[r * 4 + c] = block[r * 4 + ((c + r) % 4)]
    for (let j = 0; j < 16; j++) { out[i + j] = shifted[j]; iv[j] = shifted[j] }
  }
  return _base64Encode(out)
}

const _rc4Decrypt = (b64) => {
  const data = _base64Decode(b64)
  const key = _RESP_KEY
  const s = new Array(256)
  for (let i = 0; i < 256; i++) s[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff
    const t = s[i]; s[i] = s[j]; s[j] = t
  }
  const out = new Uint8Array(data.length)
  let i = 0; j = 0
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 0xff
    j = (j + s[i]) & 0xff
    const t = s[i]; s[i] = s[j]; s[j] = t
    out[k] = data[k] ^ s[(s[i] + s[j]) & 0xff]
  }
  let result = ''
  for (let ci = 0; ci < out.length;) {
    const b = out[ci]
    if (b < 0x80) { result += String.fromCharCode(b); ci++ }
    else if (b >= 0xc0 && b < 0xe0) { result += String.fromCharCode(((b & 31) << 6) | (out[ci + 1] & 63)); ci += 2 }
    else if (b >= 0xe0 && b < 0xf0) { result += String.fromCharCode(((b & 15) << 12) | ((out[ci + 1] & 63) << 6) | (out[ci + 2] & 63)); ci += 3 }
    else { const cp = ((b & 7) << 18) | ((out[ci + 1] & 63) << 12) | ((out[ci + 2] & 63) << 6) | (out[ci + 3] & 63); result += String.fromCharCode(0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 1023)); ci += 4 }
  }
  return result
}

// ==================== 云记（海堂）通用接口 ====================

const HTS_API_HOSTS = [
  'https://musicserver.haitangw.cc/v1/',
  'https://qt.haitangw.net/v1/',
]

const HTS_UA = 'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

const genRequestId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 10; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return 'qm-muwat0on-' + suffix
}

const HTS_TX_LEVEL = {
  '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires',
  hires: 'hires', atmos: 'hires', atmos_plus: 'sur', master: 'jymaster',
}

const htsResolveUrl = async (source, rid, level) => {
  const errors = []
  for (const host of HTS_API_HOSTS) {
    try {
      const res = await httpFetch(host + 'music/resolve-url', {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': HTS_UA,
          'x-request-id': genRequestId(),
        },
        body: { source: source, rid: String(rid), level: level },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      errors.push(host + ' -> ' + ((d && (d.message || d.msg)) || ('HTTP ' + res.statusCode)))
    } catch (e) {
      errors.push(host + ' -> ' + e.message)
    }
  }
  throw new Error(errors.join(' | ') || '无可用播放链接')
}

// ==================== 咪咕音质路径重写（取自云记） ====================
const MG_PATH_DEFAULT = '标清高清/MP3_128_16_Stero'

const MG_QUALITY_PATH = {
  '128k': { dir: MG_PATH_DEFAULT, ext: '.mp3' },
  '320k': { dir: '标清高清/MP3_320_16_Stero', ext: '.mp3' },
  flac: { dir: '歌曲下载/flac', ext: '.flac' },
  flac24bit: { dir: '歌曲下载/flac_24bit', ext: '.flac' },
  hires: { dir: '歌曲下载/flac_24bit', ext: '.flac' },
  atmos: { dir: '歌曲下载/wav_3d', ext: '.wav' },
  master: { dir: '歌曲下载/wav_32bit', ext: '.wav' },
}

const rewriteMiguUrl = (rawUrl, quality) => {
  if (typeof rawUrl !== 'string' || !rawUrl) return rawUrl
  const target = MG_QUALITY_PATH[quality]
  if (!target) return rawUrl
  try {
    let u = decodeURIComponent(rawUrl).split('?')[0]
    const before = u
    u = u.replace(MG_PATH_DEFAULT, target.dir)
    u = u.replace(/\.mp3$/, target.ext)
    if (u === before && quality !== '128k') {
      console.log('[mg] 云记咪咕: 链接未命中音质路径，返回原始链接（可能仍为 128k）')
    }
    return encodeURI(u)
  } catch (e) {
    DEBUGLog('[mg] URL 重写失败，返回原始链接', e.message)
    return rawUrl
  }
}

const MG_QUALITY_CHAIN = {
  master: ['master', 'flac', '320k', '128k'],
  atmos: ['atmos', 'flac', '320k', '128k'],
  hires: ['hires', 'flac', '320k', '128k'],
  flac24bit: ['flac24bit', 'flac', '320k', '128k'],
  flac: ['flac', '320k', '128k'],
  '320k': ['320k', '128k'],
  '128k': ['128k'],
}

const probePlayable = async (url) => {
  try {
    const res = await httpFetch(url, {
      method: 'HEAD', timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' },
    })
    return res.statusCode >= 200 && res.statusCode < 400
  } catch (e) { return true }
}

const resolveMiguUrl = async (rawUrl, quality) => {
  if (typeof rawUrl !== 'string' || !rawUrl) return rawUrl
  const chain = MG_QUALITY_CHAIN[quality] || [quality]
  let lastUrl = rawUrl
  for (let i = 0; i < chain.length; i++) {
    const url = rewriteMiguUrl(rawUrl, chain[i])
    if (!url) continue
    if (url === lastUrl && i > 0) continue
    lastUrl = url
    if (url === rawUrl) return url
    if (i === chain.length - 1) return url
    if (await probePlayable(url)) return url
    DEBUGLog('[mg] 档位不可用，降级重试:', chain[i], '->', chain[i + 1])
  }
  return lastUrl
}

// ==================== Fish API ====================
const FISH_DOMAIN = 'music.gdstudio.xyz'
const FISH_VERSION = '20260510'
const fishSign = async (secret) => {
  const timeRes = await httpFetch(_u('cookn5**') + FISH_DOMAIN + '/time', { method: 'GET', timeout: 10000 })
  const timeStr = String(Number(timeRes.body) || Date.now()).slice(0, 9)
  const signInput = FISH_DOMAIN + '|' + FISH_VERSION + '|' + timeStr + '|' + secret
  return md5(signInput).slice(-8).toUpperCase()
}
const fishPost = async (params, secret) => {
  const sign = await fishSign(secret)
  params.s = sign
  const body = objToForm(params)
  const res = await httpFetch(_u('cookn5**') + FISH_DOMAIN + '/api.php', {
    method: 'POST', timeout: 15000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: _u('cookn5**') + FISH_DOMAIN,
      Referer: _u('cookn5**') + FISH_DOMAIN + '/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  return res.body
}

// -------- ygking QQ --------
const getYgkingTx = async (songId, quality, musicInfo) => {
  const mid = musicInfo?.songmid || musicInfo?.strMediaMid || musicInfo?.mediaMid || songId
  if (!mid) throw new Error('ygking: 缺少 mid')
  const qMap = { '128k':'128','192k':'320','320k':'320','flac':'flac','flac24bit':'hires','hires':'hires','master':'master','atmos':'master','atmos_plus':'master' }
  const q = qMap[quality] || '320'
  const url = _u('cookn5**\\kd)tbfdib)^i*\\kd*njib*pmg:hd_8') + encodeURIComponent(mid) + _u('!lp\\gdot8') + q
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 0 && d?.data?.[mid]) return d.data[mid]
  throw new Error('ygking 失败')
}

// -------- 残像 WY --------
const getCanxiang = async (songId, quality, musicInfo) => {
  const id = musicInfo?.songId || musicInfo?.id || songId
  const name = musicInfo?.songName || musicInfo?.name || ''
  const singer = musicInfo?.singer || ''
  const qMap = { '128k':'128k','192k':'320k','320k':'320k','flac':'flac','flac24bit':'hires','hires':'hires','master':'jymaster','atmos':'jymaster','atmos_plus':'jymaster' }
  const type = qMap[quality] || '320k'
  const token = 'canxiang_token_2026'
  const params = { token, type }
  if (id) params.id = String(id)
  else if (name) { params.msg = name + (singer ? ' ' + singer : ''); params.n = 1 }
  else throw new Error('残像: 缺少 id 或歌名')
  const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&')
  const url = _u('cookn5**\\kd)^\\isd\\ib)^i*\\kd*rtthpnd^:') + query
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.data?.url) return d.data.url
  throw new Error('残像 失败')
}

// -------- 星海聚合（通用） --------
const getXinghai = async (platform, songId, quality, musicInfo) => {
  const sourceMap = { kw: 'kw', kg: 'kg', mg: 'migu' }
  const source = sourceMap[platform]
  if (!source) throw new Error('星海聚合: 不支持平台 ' + platform)
  const id = platform === 'kg' ? (musicInfo?.hash || songId) : (musicInfo?.songmid || musicInfo?.rid || songId)
  if (!id) throw new Error('星海聚合: 缺少 id')
  const name = musicInfo?.name || musicInfo?.songName || ''
  const singer = musicInfo?.singer || ''
  const qMap = { '128k':'128kmp3','192k':'320kmp3','320k':'320kmp3','flac':'flac','flac24bit':'hires','hires':'hires','master':'flac','atmos':'flac','atmos_plus':'flac' }
  const qualityParam = qMap[quality] || '320kmp3'
  const url = _u('cookn5**\\kd)sdibc\\d)^jh*gs*\\kd*:njpm^`8') + source + _u('!i\\h`8') + encodeURIComponent(name + ' ' + singer) + _u('!njibhd_8') + encodeURIComponent(id) + _u('!lp\\gdot8') + qualityParam
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.url) return d.url
  throw new Error('星海聚合 失败')
}
const getXinghaiKw = (s, q, m) => getXinghai('kw', s, q, m)
const getXinghaiKg = (s, q, m) => getXinghai('kg', s, q, m)
const getXinghaiMg = (s, q, m) => getXinghai('mg', s, q, m)

// -------- yunmge 酷我 --------
const getYunmgeKw = async (songId, quality, musicInfo) => {
  const id = musicInfo?.rid || musicInfo?.songmid || songId
  if (!id) throw new Error('yunmge: 缺少 id')
  const brMap = { '128k':128, '192k':192, '320k':320, 'flac':2000, 'flac24bit':2000, 'hires':4000, 'master':4000 }
  const wantBr = brMap[quality] || 320
  const url = _u('cookn5**\\kd)tpihb`)^jh*fprj:f`t8tpihb`Zf`t!ojf`i8tpihb`Zojf`i!d_8') + encodeURIComponent(id)
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.data?.all_bitrates) {
    const list = d.data.all_bitrates
    for (const br of [4000, 2000, 320, 192, 128]) {
      if (br < wantBr) continue
      const item = list.find(b => b.bitrate === br || String(b.bitrate) === String(br))
      if (item && item.play_url) return item.play_url
    }
    const fallback = list.find(b => b.play_url)
    if (fallback) return fallback.play_url
  }
  throw new Error('yunmge 失败')
}

// -------- 念心酷狗 --------
const getNianxinKg = async (songId, quality, musicInfo) => {
  const hash = musicInfo?.hash || musicInfo?.songmid || songId
  if (!hash) throw new Error('念心: 缺少 hash')
  const levelMap = { '128k':'128kmp3','192k':'320kmp3','320k':'320kmp3','flac':'2000kflac','flac24bit':'4000kflac','hires':'hires','master':'4000kflac','atmos':'4000kflac','atmos_plus':'4000kflac' }
  const level = levelMap[quality] || '320kmp3'
  const url = _u('cookn5**h^k)id\\isdisu)^jh*fbll*fb)kck:d_8') + encodeURIComponent(hash) + _u('!g`q`g8') + level + _u('!otk`8hk.')
  const resp = await httpFetch(url, { method: 'GET', timeout: 8000 })
  const d = resp.body
  if (d?.code === 200 && d?.url) return d.url
  if (typeof d === 'string' && d.startsWith('http')) return d
  throw new Error('念心 失败')
}

// ==================== FFAPI 通用 ====================
const extractFFURL = (d) => {
  if (!d || typeof d !== 'object') return ''
  if (typeof d.url === 'string' && d.url.startsWith('http')) return d.url
  if (d.data) {
    if (typeof d.data === 'string' && d.data.startsWith('http')) return d.data
    if (typeof d.data.url === 'string' && d.data.url.startsWith('http')) return d.data.url
    if (typeof d.data.play_url === 'string' && d.data.play_url.startsWith('http')) return d.data.play_url
    if (d.data.vipmusic && typeof d.data.vipmusic.url === 'string' && d.data.vipmusic.url.startsWith('http')) return d.data.vipmusic.url
    if (Array.isArray(d.data) && d.data[0]) {
      if (typeof d.data[0].url === 'string' && d.data[0].url.startsWith('http')) return d.data[0].url
      if (typeof d.data[0] === 'string' && d.data[0].startsWith('http')) return d.data[0]
    }
  }
  return ''
}
const getFFAPI = async (songmid, quality, musicInfo) => {
  const src = (musicInfo && musicInfo.source) || ''
  const id = songmid || ''
  if (!id) return ''
  let page = ''
  if (src === 'tx') page = 'https://y.qq.com/n/ryqq/songDetail/' + id
  else if (src === 'wy') page = 'https://music.163.com/song?id=' + id
  else if (src === 'kw') page = 'https://www.kuwo.cn/play_detail/' + id
  else if (src === 'kg') page = 'https://www.kugou.com/song/#hash=' + id
  else if (src === 'mg') page = 'https://music.migu.cn/v3/music/song/' + id
  else return ''
  const res = await httpFetch('https://ffapi.cn/int/v2/songurl?url=' + encodeURIComponent(page), { method: 'GET', timeout: 10000 })
  const d = res && res.body
  if (typeof d === 'string') {
    try { return extractFFURL(JSON.parse(d)) } catch (e) { return '' }
  }
  return extractFFURL(d)
}

// ==================== QQ 音乐后端池（v4.0.2 落月主线路） ====================
const TX_BACKENDS = [
  // === 主接口: 落月 QQ（api.vkeys.cn，v4.0.2 重写） ===
  {
    name: '落月QQ',
    fetch: async (songmid, quality, musicInfo) => {
      const mid = String(musicInfo?.songmid || musicInfo?.strMediaMid || musicInfo?.mediaMid || songmid || '')
      if (!mid) throw new Error('落月QQ: 缺少歌曲 mid')
      const q = LUOYUE_TX_QUALITY[quality]
      if (!q) throw new Error('落月QQ: 不支持音质 ' + quality)
      // 线路1: v2 geturl
      try {
        const res = await httpFetch(`https://api.vkeys.cn/v2/music/tencent/geturl?mid=${encodeURIComponent(mid)}&quality=${q}`, {
          method: 'GET', timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        })
        const d = res.body
        const url = d?.data?.url || (typeof d?.data === 'string' && d.data.startsWith('http') ? d.data : '')
        if (url && isHttpUrl(url)) return url
      } catch (e) {
        DEBUGLog('[落月QQ] v2 geturl 失败:', e.message)
      }
      // 线路2: v3 song/link
      try {
        const res = await httpFetch(`https://api.vkeys.cn/music/tencent/song/link?mid=${encodeURIComponent(mid)}&quality=${q}`, {
          method: 'GET', timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        })
        const d = res.body
        const url = d?.data?.url || (typeof d?.data === 'string' && d.data.startsWith('http') ? d.data : '')
        if (url && isHttpUrl(url)) return url
      } catch (e) {
        DEBUGLog('[落月QQ] v3 song/link 失败:', e.message)
      }
      throw new Error('落月QQ: 两线路均未返回有效 URL')
    },
  },

  // === 备用接口: 云记（海堂） ===
  {
    name: '云记QQ(海堂)',
    fetch: async (songmid, quality, musicInfo) => {
      const mid = String(musicInfo?.songmid || musicInfo?.id || songmid || '')
      if (!mid) throw new Error('云记QQ: 缺少歌曲ID')
      const level = HTS_TX_LEVEL[quality]
      if (!level) throw new Error('云记QQ: 不支持音质 ' + quality)
      return await htsResolveUrl('tx', mid, level)
    },
  },

  // === 备用接口: HYWmusic QQ ===
  {
    name: 'HYWmusic QQ',
    fetch: async (songmid, quality, musicInfo) => {
      return await getHYWMusicUrl('tx', songmid, quality, musicInfo)
    },
  },

  // === 备用接口: baimusic QQ ===
  {
    name: 'baimusic QQ',
    fetch: async (songmid, quality, musicInfo) => {
      const mid = String(musicInfo?.songmid ?? '')
      if (!mid) throw new Error('baimusic QQ: 缺少歌曲ID')
      const q = quality === 'hires' ? 'flac24bit' : quality
      const plain = JSON.stringify({ mid: mid, quality: q })
      const enc = _magicAesEncrypt(plain)
      const sig = _hmacSha256Hex(_HMAC_KEY, _utf8Encode(enc))
      const res = await httpFetch('http://106.55.0.102/baimusic/qqhoturl.php', {
        method: 'POST', timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 15; V2453A Build/AP3A.240905.015.A2_V000L1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.5 Mobile Safari/537.36',
          Accept: '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Content-Type': 'application/octet-stream',
          'X-Sig': sig,
        },
        body: enc,
      })
      const d = res.body
      if (!d || typeof d !== 'object' || !d.d) {
        throw new Error('baimusic QQ: 响应缺少d字段' + (d?.error ? ': ' + d.error : ''))
      }
      const dec = JSON.parse(_rc4Decrypt(d.d))
      if (!dec.url) throw new Error('baimusic QQ: ' + (dec.error || '获取URL失败'))
      return dec.url
    },
  },

  {
    name: 'QQ官方',
    fetch: async (songmid, quality) => {
      const fileInfo = TX_FILE_CONFIG[quality]
      if (!fileInfo) throw new Error('不支持的音质')
      const guid = randomGuid()
      const file = fileInfo.s + songmid + fileInfo.e
      const uin = HAS_TX_COOKIE ? extractUinFromCookie(TX_COOKIE) : '0'
      const reqData = {
        req_0: {
          module: 'vkey.GetVkeyServer', method: 'CgiGetVkey',
          param: { filename: [file], guid, songmid: [songmid], songtype: [0], uin, loginflag: HAS_TX_COOKIE ? 1 : 0, platform: '20' },
        },
        loginUin: uin,
        comm: { uin, format: 'json', ct: 24, cv: 0 },
      }
      const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: _u('cookn5**t)ll)^jh*') }
      if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE
      const res = await httpFetch(_u('cookn5**p)t)ll)^jh*^bd(]di*hpnd^p)a^b'), { method: 'POST', headers, body: JSON.stringify(reqData) })
      const d = res.body
      const info = d?.req_0?.data?.midurlinfo?.[0]
      if (info?.purl) {
        if (info.freeTrialInfo || /RS0/i.test(info.purl)) {
          throw new Error('QQ官方: 仅返回试听片段（VIP歌曲需在头部配置 @tx_cookie）')
        }
        const sip = d.req_0.data.sip || [_u('cookn5**dnpm`)nom`\\h)llhpnd^)ll)^jh*')]
        return sip[Math.floor(Math.random() * sip.length)] + info.purl
      }
      throw new Error('QQ官方: 无数据')
    },
  },
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(_u('cookn5**tt)u__tm)ojk*gs*\\kd*:njpm^`8ll!njibhd_8') + songmid + '&quality=' + quality, { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: 'HelloWorld QQ',
    fetch: async (songmid, quality, musicInfo) => {
      const keyword = encodeURIComponent(musicInfo?.name || musicInfo?.songName || '')
      if (!keyword) throw new Error('HelloWorld QQ: 缺少歌曲名')
      const qMap = { '128k': '0', '320k': '1', flac: '4', master: '5' }
      const type = qMap[quality] || '1'
      const url = _u('cookn5**\\)\\\\)^\\]*ll)hpnd^:hnb8') + keyword + _u('!i8,!otk`8') + type
      const res = await httpFetch(url, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
      const d = res.body
      if (d?.data?.music?.startsWith?.('http')) return d.data.music
      if (d?.playUrl?.startsWith?.('http')) return d.playUrl
      if (d?.url?.startsWith?.('http')) return d.url
      if (d?.data?.url?.startsWith?.('http')) return d.data.url
      throw new Error('HelloWorld QQ: 无有效链接')
    },
  },
  {
    name: 'vkeys',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '8', '320k': '9', flac: '10', flac24bit: '16', hires: '14', atmos: '13', atmos_plus: '12', master: '11' }
      const q = qualityMap[quality]
      if (!q) throw new Error('vkeys 不支持的音质')
      const res = await httpFetch(_u('cookn5**\\kd)qf`tn)^i*q-*hpnd^*o`i^`io*b`opmg:hd_8') + songmid + '&quality=' + q, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
      const d = res.body
      if (d?.data?.url) return d.data.url
      if (d?.url) return d.url
      throw new Error('vkeys: 无数据')
    },
  },
  {
    name: '317ak',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '5', '320k': '6', flac: '8', flac24bit: '7', hires: '9', atmos: '10', atmos_plus: '10', master: '10' }
      const br = brMap[quality] || '5'
      const res = await httpFetch(_u('cookn5**\\kd).,2\\f)^i*\\kd*tditp`*lltditp`:^f`t8UF21LE>DC0KKD>EJJSPC!d8') + songmid + '&br=' + br + '&type=json&lrc=1', { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
      const url = extractUrl(res.body, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('317ak: 无数据')
    },
  },
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(_u('cookn5**hpnd^)isdisu)^jh*fbll*os)kck:d_8') + songmid + '&level=' + quality + '&type=mp3', { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith(_u('cook5**')) || d.startsWith(_u('cookn5**')))) return d
      if (d?.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },
  {
    name: 'FishAPI',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }
      const br = brMap[quality]
      if (!br) throw new Error('FishAPI 不支持的音质')
      const result = await fishPost({ types: 'url', id: songmid, source: 'qq', br }, encodeURIComponent(songmid))
      const url = result && result.url ? cleanUrl(String(result.url)) : ''
      if (url.startsWith('http')) return url
      throw new Error('FishAPI: 无数据')
    },
  },
  { name: 'ygking QQ', fetch: getYgkingTx },
  { name: 'FFAPI', fetch: getFFAPI },
]

// ==================== 网易云后端池 ====================
const WY_BACKENDS = [
  {
    name: '网易云官方',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const targetUrl = _u('cookn5**dio`ma\\^`.)hpnd^),1.)^jh*`\\kd*njib*`ic\\i^`*kg\\t`m*pmg*q,')
      const eapiUrl = '/api/song/enhance/player/url/v1'
      const payload = { ids: '[' + String(songmid) + ']', level, encodeType: 'flac' }
      if (level === 'sky') payload.immerseType = 'c51'
      const encrypted = wyEapi(eapiUrl, payload)
      let cookieValue = 'os=pc; appver=2.10.2.200154; osver=; deviceId=pyncm!'
      if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue
      const res = await httpFetch(targetUrl, {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
          Referer: _u('cookn5**hpnd^),1.)^jh*'),
          Cookie: cookieValue,
        },
        body: 'params=' + encrypted.params,
      })
      const d = res.body
      if (d?.data?.[0]?.url && !d.data[0].freeTrialInfo) return d.data[0].url
      if (d?.data?.[0]?.freeTrialInfo) throw new Error('VIP歌曲仅试听（配置Cookie后可用完整版）')
      if (d?.code && d.code !== 200) throw new Error('网易云官方: code ' + d.code + ' ' + (d.message || ''))
      throw new Error('网易云官方: 无数据')
    },
  },
  {
    name: 'ikun网易云',
    fetch: async (songmid, quality, musicInfo) => {
      const songId = musicInfo?.hash ?? songmid
      const res = await httpFetch(_u('cookn5**^)rrrr`])ojk*hpnd^*pmg'), {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'lx-music-request/2.9.0', 'X-Api-Key': '' },
        body: JSON.stringify({ source: 'wy', musicId: songId, quality }),
        follow_max: 5,
      })
      const d = res.body
      if (!d || isNaN(Number(d.code))) throw new Error('ikun网易云: 未知错误')
      if (d.code === 200 && d.url) return d.url
      if (d.code === 403) throw new Error('ikun网易云: 鉴权失败')
      if (d.code === 429) throw new Error('ikun网易云: 请求过速')
      throw new Error('ikun网易云: ' + (d.message || '获取URL失败'))
    },
  },
  {
    name: '笒鬼鬼',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch(_u('cookn5**\\kd)^`ibpdbpd)^i*\\kd*i`o`\\n`*hpnd^Zq,)kck:d_8') + songmid + '&type=json&level=' + level, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
      const d = res.body
      if (d?.data?.url) return d.data.url
      if (d?.url) return d.url
      throw new Error('笒鬼鬼: 无数据')
    },
  },
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(_u('cookn5**tt)u__tm)ojk*gs*\\kd*:njpm^`8i`o`\\n`!njibhd_8') + songmid + '&quality=' + quality, { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(_u('cook5**hpnd^)isdisu)^jh*rt)kck:d_8') + songmid + '&level=' + quality + '&type=mp3', { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith(_u('cook5**')) || d.startsWith(_u('cookn5**')))) return d
      if (d?.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },
  {
    name: 'FishAPI',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }
      const br = brMap[quality]
      if (!br) throw new Error('FishAPI 不支持的音质')
      const result = await fishPost({ types: 'url', id: songmid, source: 'netease', br }, encodeURIComponent(songmid))
      const url = result && result.url ? cleanUrl(String(result.url)) : ''
      if (url.startsWith('http')) return url
      throw new Error('FishAPI: 无数据')
    },
  },
  {
    name: 'HYWmusic WY',
    fetch: async (songmid, quality, musicInfo) => {
      return await getHYWMusicUrl('wy', songmid, quality, musicInfo)
    },
  },
  { name: '残像 WY', fetch: (songmid, quality) => getCanxiang(songmid, quality, { songId: songmid, songName: '', singer: '' }) },
  { name: 'FFAPI', fetch: getFFAPI },
]

// ==================== 酷我后端池 ====================
const KW_BACKENDS = [
  {
    name: '酷我流媒体',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KW_STREAM_LEVEL_MAP[quality] || 'master'
      const songIdTmp = musicInfo?.songmid || musicInfo?.id || musicInfo?.hash || musicInfo?.songId || musicInfo?.musicId || songmid
      if (!songIdTmp) throw new Error('酷我流媒体: 找不到歌曲ID')
      const songId = String(songIdTmp).trim()
      return _u('cook5**,20)-2),11)-.1534-3*frnom`\\h:d_8') + encodeURIComponent(songId) + '&level=' + level + '&stream=1'
    },
  },
  {
    name: '星海主后端',
    fetch: async (songmid, quality, musicInfo) => {
      const name = musicInfo?.name || '', singer = musicInfo?.singer || '', interval = musicInfo?.interval || '', albumName = musicInfo?.albumName || musicInfo?.album || ''
      const res = await httpFetch(_u('cookn5**tt)u__tm)ojk*gs*\\kd*:njpm^`8fr!i\\h`8') + encodeURIComponent(name) + '&singer=' + encodeURIComponent(singer) + '&songmid=' + encodeURIComponent(songmid) + '&interval=' + encodeURIComponent(interval) + '&albumName=' + encodeURIComponent(albumName) + '&quality=' + quality, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: 'HelloWorld KW 主API',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || musicInfo?.songmid || musicInfo?.rid || musicInfo?.id || songmid
      if (!hash) throw new Error('HelloWorld KW 主API: 找不到歌曲ID')
      const levelMap = { atmos: 'atmos', atmos_plus: 'atmos_plus', master: 'master' }
      const level = levelMap[quality]
      if (!level) throw new Error('HelloWorld KW 主API: 不支持音质')
      const res = await httpFetch('https://musicserver.haitangw.cc/v1/music/resolve-url', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: { source: 'kw', rid: hash, level: level },
      })
      const d = res.body
      if (d?.data?.url) return d.data.url
      throw new Error('HelloWorld KW 主API: 无数据')
    },
  },
  {
    name: 'HelloWorld KW 备用API',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || musicInfo?.songmid || musicInfo?.rid || musicInfo?.id || songmid
      if (!hash) throw new Error('HelloWorld KW 备用API: 找不到歌曲ID')
      const qMap = { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'flac24bit', hires: 'hires' }
      const q = qMap[quality]
      if (!q) throw new Error('HelloWorld KW 备用API: 不支持音质')
      const res = await httpFetch('https://c.wwwweb.top/music/url', {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'lx-music-desktop/2.10.1',
          'X-Api-Key': '',
        },
        body: { source: 'kw', musicId: hash, quality: q },
        follow_max: 5,
      })
      const d = res.body
      if (!d || isNaN(Number(d.code))) throw new Error('HelloWorld KW 备用API: 未知错误')
      if (d.code === 200 && d.url) return d.url
      if (d.code === 403) throw new Error('HelloWorld KW 备用API: 鉴权失败')
      if (d.code === 429) throw new Error('HelloWorld KW 备用API: 请求过速')
      throw new Error('HelloWorld KW 备用API: ' + (d.message || '获取URL失败'))
    },
  },
  {
    name: '酷我官方',
    fetch: async (songmid, quality, musicInfo) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我官方 不支持的音质')
      let rid = musicInfo?.rid || ''
      if (!rid && musicInfo?.musicrid) rid = String(musicInfo.musicrid).replace(/^MUSIC_/, '')
      if (!rid) rid = songmid
      const res = await httpFetch(_u('cookn5**hj]d)fprj)^i*hj]d)n:a8r`]!md_8') + rid + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36' } })
      const d = res.body
      if (d?.code === 200 && d?.data?.surl) return d.data.surl
      if (d?.code === 200 && d?.data?.url) return d.data.url
      throw new Error('酷我官方: 无数据')
    },
  },
  {
    name: '酷我手机版',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我手机版 不支持的音质')
      const res = await httpFetch(_u('cookn5**ihj]d)fprj)^i*hj]d)n:a8r`]!pn`m8+!njpm^`8frkg\\t`mc_Z\\mZ/).)+)3Zod\\i]\\jZO,<Zldmpd)\\kf!otk`8^jiq`moZpmgZrdocZndbi!md_8') + songmid + '&br=' + br, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' } })
      const d = res.body
      if (d?.code === 200 && d?.data?.url) return d.data.url
      if (d?.code === 200 && d?.data?.surl) return d.data.surl
      throw new Error('酷我手机版: 无数据')
    },
  },
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch(_u('cookn5**hpnd^)isdisu)^jh*fbll*fr)kck:d_8') + songmid + '&level=' + level + '&type=mp3', { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith(_u('cook5**')) || d.startsWith(_u('cookn5**')))) return d
      if (d?.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },
  {
    name: 'HYWmusic KW',
    fetch: async (songmid, quality, musicInfo) => {
      return await getHYWMusicUrl('kw', songmid, quality, musicInfo)
    },
  },
  { name: 'yunmge酷我', fetch: getYunmgeKw },
  { name: '星海酷我', fetch: getXinghaiKw },
  { name: 'FFAPI', fetch: getFFAPI },
]

// ==================== 酷狗后端池 ====================
const KG_BACKENDS = [
  {
    name: '海堂KG',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!hash) throw new Error('海堂KG: 找不到歌曲ID')
      const levelMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', hires: 'hires', atmos: 'atmos', master: 'clear' }
      const level = levelMap[quality]
      if (!level) throw new Error('海堂KG: 不支持音质')
      const res = await httpFetch('https://musicserver.haitangw.cc/v1/music/resolve-url', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: { source: 'kg', rid: hash, level: level },
      })
      const d = res.body
      if (d?.data?.url) return d.data.url
      throw new Error('海堂KG: 无数据')
    },
  },
  {
    name: 'HYWmusic KG',
    fetch: async (songmid, quality, musicInfo) => {
      return await getHYWMusicUrl('kg', songmid, quality, musicInfo)
    },
  },
  {
    name: '白姬KG',
    fetch: async (songmid, quality, musicInfo) => {
      const id = musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!id) throw new Error('白姬KG: 找不到歌曲ID')
      const qMap = { '128k': '128k', '320k': '320k', flac: 'flac' }
      const q = qMap[quality]
      if (!q) throw new Error('白姬KG: 不支持音质')
      const url = 'https://103.79.184.97/api/music/url?source=kg&songId={id}&quality={quality}&key=6C1F-53W0-GRKI-EVFG'
        .replace('{id}', encodeURIComponent(id))
        .replace('{quality}', encodeURIComponent(q))
      const res = await httpFetch(url, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('白姬KG: 无数据')
    },
  },
  {
    name: '星海KG',
    fetch: async (songmid, quality, musicInfo) => {
      const id = musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!id) throw new Error('星海KG: 找不到歌曲ID')
      const qMap = { '128k': '128k', '320k': '320k', flac: 'flac', hires: 'hires', atmos: 'atmos', master: 'master' }
      const q = qMap[quality]
      if (!q) throw new Error('星海KG: 不支持音质')
      const url = 'https://yy.zddyr.top/lx/api/?source=kg&quality={quality}&mainHash={id}'
        .replace('{id}', encodeURIComponent(id))
        .replace('{quality}', encodeURIComponent(q))
      const res = await httpFetch(url, { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.url) return d.url
      throw new Error('星海KG: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: '星海主后端',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || (musicInfo?._types?.[quality]?.hash) || songmid
      const albumId = musicInfo?.albumId || ''
      const res = await httpFetch(_u('cookn5**tt)u__tm)ojk*gs*\\kd*:njpm^`8fb!lp\\gdot8') + quality + '&songmid=' + (musicInfo?.songmid || songmid) + '&albumId=' + albumId + '&mainHash=' + hash + '&hash=' + hash, { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: '长青海棠',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || musicInfo?.songmid || songmid
      const res = await httpFetch(_u('cookn5**hpnd^n`mq`m)c\\do\\ibr)^^*q,*hpnd^*m`njgq`(pmg'), { method: 'POST', timeout: 10000, headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify({ source: 'kg', rid: hash, level }) })
      const d = res.body
      if (d?.code === 0 && d?.data?.url) return d.data.url
      throw new Error('长青海棠: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: '酷狗官方',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || songmid
      const albumId = musicInfo?.albumId || ''
      const res = await httpFetch(_u('cookn5**rrr\\kd)fpbjp)^jh*tt*di_`s)kck:m8kg\\t*b`o_\\o\\!c\\nc8') + hash + '&platid=4&album_id=' + albumId + '&mid=00000000000000000000000000000000', { method: 'GET', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', Referer: _u('cookn5**rrr)fpbjp)^jh*') } })
      const d = res.body
      if (d?.status === 1 && d?.data?.play_backup_url) return d.data.play_backup_url
      if (d?.status === 1 && d?.data?.play_url) return d.data.play_url
      throw new Error('酷狗官方: 无数据')
    },
  },
  {
    name: '念心KG',
    fetch: async (songmid, quality) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch(_u('cookn5**hpnd^)isdisu)^jh*fbll*fb)kck:d_8') + songmid + '&level=' + level + '&type=mp3', { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.code === 200 && d.url) return d.url
      if (typeof d === 'string' && (d.startsWith(_u('cook5**')) || d.startsWith(_u('cookn5**')))) return d
      throw new Error('念心KG: 无数据')
    },
  },
  { name: '星海酷狗', fetch: getXinghaiKg },
  { name: '念心酷狗', fetch: getNianxinKg },
  { name: 'FFAPI', fetch: getFFAPI },
]

// ==================== 咪咕后端池 ====================
const MG_BACKENDS = [
  {
    name: '云记咪咕(海堂)',
    fetch: async (songmid, quality, musicInfo) => {
      const rid = String(musicInfo?.songmid || musicInfo?.id || songmid || '')
      if (!rid) throw new Error('云记咪咕: 缺少歌曲ID')
      const rawUrl = await htsResolveUrl('mg', rid, 'standard')
      return await resolveMiguUrl(rawUrl, quality)
    },
  },
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(_u('cookn5**tt)u__tm)ojk*gs*\\kd*:njpm^`8hdbp!njibhd_8') + songmid + '&quality=' + quality, { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      const d = res.body
      if (d?.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },
  {
    name: 'Migu直接源',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch(_u('cookn5**hpnd^)hdbp)^i*q.*\\kd*hpnd^*\\p_djKg\\t`m*b`oKg\\tDiaj:^jktmdbcoD_8') + encodeURIComponent(String(songmid)) + '&level=' + level, { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Referer: _u('cookn5**hpnd^)hdbp)^i*') } })
      const d = res.body
      if (d?.data?.playUrl) return d.data.playUrl
      if (d?.url) return d.url
      if (d?.playUrl) return d.playUrl
      throw new Error('Migu直接源: 无数据')
    },
  },
  {
    name: 'Migu API',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'PQ', '320k': 'HQ', flac: 'SQ', flac24bit: 'ZQ' }
      const level = levelMap[quality] || 'HQ'
      const res = await httpFetch(_u('cookn5**\\kk)^)ia)hdbp)^i*HDBPH-)+*nom\\o`bt*gdno`i(pmg*q-)-:^jktmdbcoD_8') + encodeURIComponent(String(songmid)) + '&quality=' + level, { method: 'GET', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36', Referer: _u('cookn5**\\kk)^)ia)hdbp)^i*') } })
      const d = res.body
      if (d?.data?.url) return d.data.url
      if (d?.url) return d.url
      if (d?.data?.playUrl) return d.data.playUrl
      throw new Error('Migu API: 无数据')
    },
  },
  {
    name: 'HYWmusic MG',
    fetch: async (songmid, quality, musicInfo) => {
      return await getHYWMusicUrl('mg', songmid, quality, musicInfo)
    },
  },
  { name: '星海咪咕', fetch: getXinghaiMg },
  { name: 'FFAPI', fetch: getFFAPI },
]

// ==================== 汽水音乐(qs) 后端接口列表 ====================
const createXinghaiQsBackend = (name, host) => ({
  name: name,
  fetch: async (songmid, quality, musicInfo) => {
    const id = String(musicInfo?.songmid || musicInfo?.id || songmid || '')
    if (!id) throw new Error(name + ': 缺少歌曲ID')
    const params = {
      source: 'qs',
      name: musicInfo?.name || '',
      singer: musicInfo?.singer || '',
      songmid: id,
      interval: musicInfo?.interval || '',
      albumName: musicInfo?.albumName || musicInfo?.album || '',
      quality: quality || '',
    }
    const query = Object.keys(params)
      .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&')
    const res = await httpFetch('https://' + host + '/lx/api/?' + query, {
      method: 'GET', timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Client': 'XingHaiMusicSource' },
    })
    const d = res.body
    if (!d || Number(d.code) !== 200) {
      throw new Error(name + ': ' + ((d && d.msg) || '接口无数据'))
    }
    const data = d.data || {}
    let streamUrl = data.url || ''
    if (streamUrl && data.key && !/[?&]key=/.test(streamUrl)) {
      streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(data.key)
    }
    if (!streamUrl) streamUrl = data.source_url || ''
    if (!streamUrl) throw new Error(name + ': 未返回流媒体链接')
    return streamUrl
  },
})

const QS_BACKENDS = [
  createXinghaiQsBackend('星海汽水主线路', 'yy.zddyr.top'),
  createXinghaiQsBackend('星海汽水备用线路', 'zrcdy.dpdns.org'),
]

// ==================== URL 缓存 + 限流 ====================

const URL_CACHE = new Map()
const INFLIGHT = new Map()
const requestTimeList = []

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const acquireRateSlot = async () => {
  const deadline = Date.now() + RATE_LIMIT_MAX_WAIT
  for (;;) {
    const now = Date.now()
    while (requestTimeList.length > 0 && now - requestTimeList[0] >= RATE_LIMIT_WINDOW) {
      requestTimeList.shift()
    }
    if (requestTimeList.length < RATE_LIMIT_MAX) {
      requestTimeList.push(now)
      return
    }
    const wait = RATE_LIMIT_WINDOW - (now - requestTimeList[0]) + 10
    if (Date.now() + wait > deadline) {
      throw new Error('请求过于频繁，限制' + RATE_LIMIT_MAX + '次/' + (RATE_LIMIT_WINDOW / 1000) + '秒，请稍后重试')
    }
    DEBUGLog('[限流] 窗口已满，等待', wait, 'ms')
    await sleep(wait)
  }
}

const pruneCache = () => {
  const now = Date.now()
  for (const [key, val] of URL_CACHE) {
    if (val.expire <= now) URL_CACHE.delete(key)
  }
  while (URL_CACHE.size > CACHE_MAX_ENTRIES) {
    const oldest = URL_CACHE.keys().next()
    if (oldest.done) break
    URL_CACHE.delete(oldest.value)
  }
}

const withUrlCache = async (cacheKey, loader) => {
  const now = Date.now()
  const cached = URL_CACHE.get(cacheKey)
  if (cached) {
    if (cached.expire > now) return cached.url
    URL_CACHE.delete(cacheKey)
  }
  const pending = INFLIGHT.get(cacheKey)
  if (pending) return pending
  const task = (async () => {
    await acquireRateSlot()
    const url = await loader()
    URL_CACHE.set(cacheKey, { url: url, expire: Date.now() + CACHE_TTL })
    if (URL_CACHE.size > CACHE_MAX_ENTRIES) pruneCache()
    return url
  })()
  INFLIGHT.set(cacheKey, task)
  try { return await task }
  finally { INFLIGHT.delete(cacheKey) }
}

// ==================== 后端池与选择 ====================

const BACKEND_POOLS = { tx: TX_BACKENDS, wy: WY_BACKENDS, kw: KW_BACKENDS, kg: KG_BACKENDS, mg: MG_BACKENDS, qs: QS_BACKENDS }
const KW_HIGH_QUALITY = ['atmos', 'atmos_plus', 'master']
const KW_STREAM_BACKEND = '酷我流媒体'

const isHttpUrl = (u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))

const pickBackends = (source, quality, backends) => {
  if (source !== 'kw') return backends
  if (KW_HIGH_QUALITY.includes(quality)) return backends.filter((b) => b.name === KW_STREAM_BACKEND)
  return backends.filter((b) => b.name !== KW_STREAM_BACKEND)
}

const resolveFromBackends = async (backends, songId, quality, musicInfo) => {
  if (!backends.length) throw new Error('无可用后端')
  const errors = []
  const head = backends.slice(0, 3)
  const tail = backends.slice(3)

  if (head.length) {
    try {
      return await Promise.any(head.map(async (backend) => {
        try {
          const url = await backend.fetch(songId, quality, musicInfo)
          if (isHttpUrl(url)) return url
          throw new Error('返回无效URL')
        } catch (e) {
          throw new Error(backend.name + ': ' + e.message)
        }
      }))
    } catch (err) {
      if (err && err.errors) err.errors.forEach((e) => errors.push(e.message))
      else errors.push(err.message)
    }
  }

  for (const backend of tail) {
    try {
      const url = await backend.fetch(songId, quality, musicInfo)
      if (isHttpUrl(url)) return url
      errors.push(backend.name + ': 返回无效URL')
    } catch (e) {
      errors.push(backend.name + ': ' + e.message)
    }
  }

  throw new Error('所有后端均失败（共 ' + backends.length + ' 个）\n' + errors.join('\n'))
}

// ==================== 获取音乐URL ====================

const handleGetMusicUrl = async (source, musicInfo, quality) => {
  const songId = musicInfo?.hash ?? musicInfo?.songmid ?? musicInfo?.id
  if (!songId) throw new Error('无法获取歌曲ID')

  const pool = BACKEND_POOLS[source]
  if (!pool) throw new Error('未知音源: ' + source)

  const supported = MUSIC_QUALITY[source] || ['128k']
  const targetQuality = supported.includes(quality) ? quality : (supported[supported.length - 1] || '128k')

  const cacheKey = source + '-' + songId + '-' + targetQuality
  return withUrlCache(cacheKey, () =>
    resolveFromBackends(pickBackends(source, targetQuality, pool), String(songId), targetQuality, musicInfo)
  )
}

// ==================== 注册请求事件 ====================

on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case 'musicUrl':
      return handleGetMusicUrl(source, info.musicInfo, info.type)
    default:
      return Promise.reject('action not support: ' + action)
  }
})

// ==================== 初始化音源 ====================

const SOURCE_NAMES = { tx: 'QQ音乐', wy: '网易云音乐', kw: '酷我音乐', kg: '酷狗音乐', mg: '咪咕音乐', qs: '汽水音乐' }
const musicSources = {}
MUSIC_SOURCE.forEach((item) => {
  musicSources[item] = {
    name: SOURCE_NAMES[item] || item,
    type: 'music',
    actions: ['musicUrl'],
    qualitys: MUSIC_QUALITY[item],
  }
})

send(EVENT_NAMES.inited, { status: true, openDevTools: false, sources: musicSources })

console.log('[星澜] v4.0.2 聚合音源已加载完成')
console.log('[星澜] 平台: ' + MUSIC_SOURCE.join(', '))
console.log('[星澜] QQ 主线路: 落月（api.vkeys.cn）；备用: 云记 / HYWmusic / baimusic / 官方 / 星海 / vkeys 等')
console.log('[星澜] 后端数 QQ:' + TX_BACKENDS.length + ' 网易:' + WY_BACKENDS.length + ' 酷我:' + KW_BACKENDS.length + ' 酷狗:' + KG_BACKENDS.length + ' 咪咕:' + MG_BACKENDS.length + ' 汽水:' + QS_BACKENDS.length)
console.log('[星澜] QQ Cookie: ' + (HAS_TX_COOKIE ? '已配置' : '未配置') + ' | 网易 Cookie: ' + (HAS_WY_COOKIE ? '已配置' : '未配置'))
console.log('[星澜] 缓存 ' + (CACHE_TTL / 60000) + ' 分钟 | 限流 ' + RATE_LIMIT_MAX + ' 次/' + (RATE_LIMIT_WINDOW / 1000) + ' 秒')
})(__SUB_REGISTER("xinglan", "/*!\n * @name 星澜聚合音源 (StellarWave)\n * @description 星澜 v4.0.2 与墨澜 v2.3.6 融合版：落月 QQ 主线路 + 云记（海堂）/HYWmusic/星海/念心等备用后端，支持母带/全景声/汽水音乐\n * @version v4.0.2\n * @author 星澜团队\n * @homepage https://github.com/your-repo/StellarWave\n * @license MIT\n * @update 2026-11-06\n * @changelog\n *   - v4.0.2 (2026-11-06)\n *     · QQ 音乐主线路改为「落月」API（api.vkeys.cn），v2 geturl 失败自动降级到 v3 song/link\n *     · 落月音质映射：6=128k 8=320k 10=flac 11=hires 13=atmos 16=atmos_plus 14=master\n *     · 修复 HYWmusic 后端：卡密 6C1F-53W0-GRKI-EVFG，完整 musicInfo 参数（对齐 HYWmusic v1.2.0）\n *     · QQ / 酷狗后端池 HYWmusic 提升到可用位置\n *     · QQ 官方后端从 Cookie 提取真实 uin，检测试听片段（freeTrialInfo / RS0），避免只播放几秒\n *     · 各平台 HYWmusic 后端统一 getHYWMusicUrl 实现，按平台做音质降级映射\n *     · 白姬KG 卡密同步更新为 6C1F-53W0-GRKI-EVFG\n *   - v4.0.1 (2026-11-05) 修复与合并版本\n *     · 融合墨澜 v2.3.5：QQ / 咪咕 / 酷狗采用云记（海堂）resolve-url 为主线路\n *     · 新增汽水音乐 (qs) 音源（星海汽水双线路）\n *     · 咪咕：云记主线路 + 音质路径改写与降级探测\n *     · 网易云官方 enhance/player/url/v1：ids 改为 \"[id]\" 字符串，immerseType 仅 sky 携带\n *     · QQ 官方文件前缀：臻品母带 AI00、臻品音质 Q000、全景声 Q001/Q003\n *     · 移除 QQ 越权后端；URL 缓存 20 分钟；并发合并；滑动窗口限流\n *     · 请求 body 统一序列化为 JSON，全部请求增加超时兜底\n *     · 酷我：高音质走流媒体直链，普通音质跳过流媒体直链\n */"));

// ==================== 子源: xinghai ====================
;(function (__lx) {
/*!
 * @name         星海音乐源
 * @description  GDAPI | 聚合 | ChKSz API | 全平台支持 24bit FLAC，网易、酷狗、QQ 最高支持母带｜建议与反馈：https://yy.zddyr.top/survey.php?k=192ee708d4721bc9077f8f1738296c1b
 * @version      v3.2.18
 * @author       万去了了 / 科学大魔王
 * @homepage     https://zddyr.top/
 * @see          http://gc.kxwa.top/
 * @lastUpdate   2026-11-08
 * @update       优化酷我：修复部分歌曲取链接失败
 * @update       使用体验反馈：https://yy.zddyr.top/survey.php?k=192ee708d4721bc9077f8f1738296c1b
 * @license      仅供学习交流，请支持正版
 */

const { EVENT_NAMES, request, on, send, env } = __lx;

// ==================== 用户配置区域 ====================
const KW_DECRYPT_PROXY = {
    url: '',
    allowEncryptedLossless: false,
    urlParamName: 'url',
    ekeyParamName: 'ekey',
};

const CHKSZ_CONFIG = {
    apikey: '',
    enableNetease: true,
    enableQQ: true,
};

// 卡密（可选）：填了就能用 QQ 等「仅认证用户」音源，不填只能走基础音源
const LICENSE_CONFIG = {
    code: '',
};
// ====================================================

const URL_CONFIG = {
    domains: {
        primary: 'yy.zddyr.top',
        gdStudio: 'music-api.gdstudio.xyz',
        chkszNew: 'api.chksz.com'
    },
    paths: {
        backend: '/lx/api/',
        version: '/lx/versionh2.php',
        update: '/lx/vers.php',
        ip: '/ip.php',
        gdApi: '/api.php',
        chkszNetease: '/api/163_music',
        chkszQQ: '/api/qq_music'
    },
    gdParams: 'use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light'
};

const buildUrl = (domainKey, pathKey, extraQuery = '') => {
    const domain = URL_CONFIG.domains[domainKey];
    const path = URL_CONFIG.paths[pathKey];
    if (!domain || !path) throw new Error(`URL配置错误: ${domainKey} / ${pathKey}`);
    let url = `https://${domain}${path}`;
    if (extraQuery) {
        if (extraQuery.startsWith('&') && !path.includes('?')) {
            url += '?' + extraQuery.substring(1);
        } else {
            url += extraQuery;
        }
    }
    return url;
};

const SCRIPT_VERSION = 'v3.2.18';
const SCRIPT_NAME = 'XingHaiMusicSource';
const SOURCE_MAP = { tx: 'qq', mg: 'migu', kw: 'kw', kg: 'kg', qs: 'qs' };
const PLATFORM_NAMES = { wy: '网易云音乐', tx: 'QQ音乐', kw: '酷我音乐', kg: '酷狗音乐', mg: '咪咕音乐', qs: '汽水音乐' };
const MUSIC_QUALITIES = {
    wy: ['128k','320k','flac','hires','atmos','master'],
    tx: ['128k','192k','320k','flac','hires','atmos','atmos_plus','master'],
    // 上游没有真母带：master / hires 与 flac 拿到的是同一个文件（16bit/44.1kHz），
    // 有全景声资源的曲子还会给 4 声道有损 Ogg，兼容性反而更差。最高只留无损。
    kw: ['128k','320k','flac'],
    kg: ['128k','320k','flac','hires','atmos','master'],
    mg: ['128k','320k','flac'],
    qs: ['128k','320k','flac','spatial','hires']
};

const CHKSZ_NETEASE_LEVEL_MAP = {
    '128k': 'standard', '320k': 'exhigh', 'flac': 'lossless',
    'hires': 'hires', 'atmos': 'jymaster', 'master': 'jymaster'
};

const CHKSZ_QQ_SIZE_MAP = {
    '128k': '128k', '192k': '320k', '320k': '320k',
    'flac': 'flac', 'hires': 'hires',
    'atmos': 'master', 'atmos_plus': 'master', 'master': 'master'
};

const GD_BR_MAP = { '128k':'128', '320k':'320', 'flac':'740', 'hires':'999' };
const GD_SUPPORTED_QUALITIES = new Set(['128k','320k','flac','hires']);

const TOKEN_TTL = 4 * 60 * 1000;   // 服务端有效期 5 分钟，本地提前 1 分钟换新，避开边界过期

let userIp = null;
let userToken = '';
let tokenTimestamp = 0;
let clientHeader = '';
let deviceId = '';
let availablePlatforms = [];
let backendAggBlocked = false;
const extraCache = new Map();

// -------------------- 工具函数 --------------------
function isBuffer(obj) {
    return obj && typeof obj === 'object' &&
        ((typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) ||
        (typeof obj.constructor === 'function' && obj.constructor.name === 'Buffer'));
}

function safeParseBody(body) {
    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (/^[{["]/.test(trimmed)) { try { return JSON.parse(trimmed); } catch (e) {} }
        return body;
    }
    if (typeof body === 'object' && body !== null) {
        try { if (typeof body.toString === 'function' && body.toString() !== '[object Object]') body = body.toString('utf-8'); } catch (e) {}
        if (typeof body === 'object' && !isBuffer(body)) return body;
    }
    try {
        if (isBuffer(body)) {
            if (__lx?.utils?.buffer?.bufToString) body = __lx.utils.buffer.bufToString(body, 'utf-8');
            else if (typeof Buffer !== 'undefined') body = Buffer.from(body).toString('utf-8');
            else body = String(body);
        }
    } catch (e) {}
    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (/^[{["]/.test(trimmed)) { try { return JSON.parse(trimmed); } catch (e) {} }
    }
    return body;
}

function safeBase64Encode(str) {
    try {
        if (__lx?.utils?.buffer?.from) {
            const buf = __lx.utils.buffer.from(str, 'utf-8');
            return __lx.utils.buffer.bufToString(buf, 'base64');
        }
        if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf-8').toString('base64');
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return str;
    }
}

function simpleGetQueryParam(url, key) {
    if (typeof url !== 'string' || !url) return null;
    const qIdx = url.indexOf('?');
    if (qIdx < 0) return null;
    let query = url.substring(qIdx + 1);
    const hashIdx = query.indexOf('#');
    if (hashIdx >= 0) query = query.substring(0, hashIdx);
    const pairs = query.split('&');
    for (const p of pairs) {
        const eq = p.indexOf('=');
        if (eq < 0) continue;
        if (p.substring(0, eq) === key) {
            try { return decodeURIComponent(p.substring(eq + 1)); } catch (e) { return p.substring(eq + 1); }
        }
    }
    return null;
}

function generateDeviceId() {
    return 'lx-online-' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4);
}

function buildClientHeader() {
    let deviceType = 'unknown';
    try {
        const p = (env?.platform || '').toLowerCase();
        if (p.includes('android')) deviceType = 'Android';
        else if (p.includes('ios')) deviceType = 'iOS';
        else if (p.includes('win')) deviceType = 'Windows';
        else if (p.includes('mac')) deviceType = 'macOS';
        else if (p.includes('linux')) deviceType = 'Linux';
    } catch (e) {}
    return `${SCRIPT_NAME}/${SCRIPT_VERSION} (${deviceType})`;
}

// 令牌只能由服务器签发（/lx/api/token.php）。
// 以前是本地拼一段 base64 就当令牌，服务端从 2026-11 起不再承认这种自签令牌，
// 必须拿服务器用私有密钥签出的 xh3. 令牌，否则一律 403。
let tokenPromise = null;

function fetchServerToken() {
    if (!deviceId) deviceId = generateDeviceId();
    const url = `${buildUrl('primary', 'backend')}token.php?device_id=${encodeURIComponent(deviceId)}`;
    return new Promise((resolve) => {
        request(url, {
            method: 'GET',
            timeout: 6000,
            headers: { 'User-Agent': 'lx-music', 'X-Client': clientHeader || 'LX-Music-Mobile' }
        }, (err, resp) => {
            if (err) return resolve('');
            try {
                const b = safeParseBody(resp.body);
                const tk = b && b.data && b.data.token;
                resolve(typeof tk === 'string' ? tk : '');
            } catch (e) { resolve(''); }
        });
    });
}

async function ensureTokenFresh(force = false) {
    if (!force && userToken && (Date.now() - tokenTimestamp) <= TOKEN_TTL) return;
    if (!tokenPromise) tokenPromise = fetchServerToken();
    let tk = '';
    try { tk = await tokenPromise; } catch (e) { tk = ''; }
    tokenPromise = null;
    if (tk) {
        userToken = tk;
        tokenTimestamp = Date.now();
    }
}

// 服务端判定令牌不可用（过期 / 换网导致 IP 不符 / 非服务器签发）时刷新一次重试
function needRefreshToken(resp) {
    const a = resp && resp.body && resp.body.auth;
    if (!a) return false;
    if (a.tk_mismatch === true) return true;
    if (a.device_id === 'untrusted-token' || a.tk_error) return true;
    return false;
}

// 所有请求都必须带服务器签发的令牌。
// 拿不到令牌就不发请求 —— 没有令牌的请求服务端一律按未授权处理，
// 与其发出去被拒，不如把原因直接抛给上层。
const httpFetch = async (url, options = {}, retried = false) => {
    await ensureTokenFresh();
    if (!userToken) throw new Error('获取服务器令牌失败，请检查网络后重试');
    const headers = { ...(options.headers || {}) };
    headers['X-Token'] = userToken;
    if (clientHeader) headers['X-Client'] = clientHeader;
    const code = (LICENSE_CONFIG.code || '').trim();
    if (code) headers['X-License'] = code;
    if (!headers['User-Agent']) headers['User-Agent'] = 'lx-music';
    const out = await new Promise((resolve, reject) => {
        request(url, { ...options, headers }, (err, resp) => {
            if (err) return reject(err);
            resolve({ body: safeParseBody(resp.body), statusCode: resp.statusCode, headers: resp.headers || {} });
        });
    });
    if (!retried && needRefreshToken(out)) {
        userToken = '';
        tokenTimestamp = 0;
        tokenPromise = null;
        await ensureTokenFresh(true);
        return httpFetch(url, options, true);
    }
    return out;
};

function mapQuality(target, avail) {
    const pm = {
        '臻品母带': 'jymaster', '臻品音质2.0': 'sky', '臻品音质AI': 'jyeffect',
        '臻品音质': 'jyeffect', 'Hires 无损24-Bit': 'hires', 'Hi-Res': 'hires',
        'FLAC': 'flac', '320k': '320k', '192k': '192k', '128k': '128k',
        '空间音频': 'spatial', 'Spatial': 'spatial'
    };
    if (avail.includes(target)) return target;
    const m = pm[target]; if (m && avail.includes(m)) return m;
    const order = ['jymaster', 'sky', 'jyeffect', 'hires', 'flac24bit', 'spatial', 'master', 'flac', '320k', '192k', '128k'];
    for (const q of order) if (avail.includes(q)) return q;
    return avail[0] || '128k';
}

// -------------------- 酷我加密链接处理 --------------------
function processKwEncryptedUrl(data, source) {
    if (source !== 'kw' || !KW_DECRYPT_PROXY.allowEncryptedLossless) {
        return data?.url || '';
    }
    let ekey = null;
    if (data?.ekey) {
        ekey = typeof data.ekey === 'string' ? data.ekey.trim() : String(data.ekey).trim();
    }
    if (!ekey && data?.url && typeof data.url === 'string') {
        ekey = simpleGetQueryParam(data.url, 'ekey');
    }
    if (!ekey || !KW_DECRYPT_PROXY.url) {
        return data?.url || '';
    }
    const rawUrl = typeof data.url === 'string' ? data.url : String(data.url);
    try {
        return `${KW_DECRYPT_PROXY.url}?${KW_DECRYPT_PROXY.urlParamName}=${encodeURIComponent(rawUrl)}&${KW_DECRYPT_PROXY.ekeyParamName}=${encodeURIComponent(ekey)}`;
    } catch (e) {
        return rawUrl;
    }
}

// -------------------- 网络接口 --------------------
async function fetchIp() {
    try {
        const r = await httpFetch(buildUrl('primary', 'ip'), { timeout: 3000 });
        if (r.body?.ip) {
            userIp = r.body.ip;
        }
    } catch (e) {}
}

async function getWyChkszUrl(id, quality) {
    const level = CHKSZ_NETEASE_LEVEL_MAP[quality];
    if (!level) throw new Error('chksz不支持该品质');
    const url = `https://${URL_CONFIG.domains.chkszNew}${URL_CONFIG.paths.chkszNetease}?id=${id}&level=${level}&apikey=${encodeURIComponent(CHKSZ_CONFIG.apikey)}`;
    const resp = await httpFetch(url, { headers: { 'User-Agent': 'LX-Music-Mobile' }, timeout: 8000 });
    if (resp.statusCode !== 200 || resp.body.code !== 200 || !resp.body.data?.url) {
        throw new Error(`chksz网易失败(${resp.statusCode}): ${resp.body?.msg || '未返回url'}`);
    }
    return { url: resp.body.data.url, lyric: null, cover: resp.body.data.picUrl || null };
}

async function getTxChkszUrl(musicInfo, quality) {
    const size = CHKSZ_QQ_SIZE_MAP[quality];
    if (!size) throw new Error('chksz不支持该品质');
    const mid = musicInfo.songmid || musicInfo.id;
    if (!mid) throw new Error('缺少QQ mid');
    const url = `https://${URL_CONFIG.domains.chkszNew}${URL_CONFIG.paths.chkszQQ}?mid=${mid}&size=${size}&type=json&apikey=${encodeURIComponent(CHKSZ_CONFIG.apikey)}`;
    const resp = await httpFetch(url, { headers: { 'User-Agent': 'LX-Music-Mobile' }, timeout: 8000 });
    if (resp.statusCode !== 200 || resp.body.code !== 200 || !resp.body.url) {
        throw new Error(`chksz QQ失败(${resp.statusCode}): ${resp.body?.msg || '未返回url'}`);
    }
    return { url: resp.body.url, lyric: resp.body.lrc || null, cover: resp.body.cover || null };
}

async function getWyGDUrl(id, q) {
    const br = GD_BR_MAP[q] || '320';
    const url = buildUrl('gdStudio', 'gdApi', `&${URL_CONFIG.gdParams}&types=url&source=netease&id=${id}&br=${br}`);
    let resp = await httpFetch(url, { headers: { 'User-Agent': 'LX-Music-Mobile' }, timeout: 8000 });
    if (q === 'hires' && (resp.statusCode !== 200 || !resp.body.url)) {
        const fallbackUrl = buildUrl('gdStudio', 'gdApi', `&${URL_CONFIG.gdParams}&types=url&source=netease&id=${id}&br=740`);
        resp = await httpFetch(fallbackUrl, { headers: { 'User-Agent': 'LX-Music-Mobile' }, timeout: 8000 });
    }
    if (resp.statusCode !== 200 || !resp.body.url) {
        throw new Error(`GD接口状态${resp.statusCode}，未返回音频`);
    }
    return { url: resp.body.url, lyric: null, cover: null };
}

// 自建后端接口（通用）
async function getUrlFromBackend(source, musicInfo, quality) {
    const backendSource = SOURCE_MAP[source] || source;
    const baseUrl = buildUrl('primary', 'backend');
    const params = {};
    if (backendSource === 'kg') {
        const types = musicInfo._types || {};
        params.source = 'kg';
        params.quality = quality || '';
        params.songmid = musicInfo.songmid || musicInfo.id || '';
        params.albumId = musicInfo.albumId || '';
        params.mainHash = musicInfo.hash || '';
        if (types[quality]?.hash) params.hash = types[quality].hash;
    } else {
        params.source = backendSource;
        params.name = musicInfo.name || '';
        params.singer = musicInfo.singer || '';
        params.songmid = musicInfo.songmid || musicInfo.id || '';
        params.interval = musicInfo.interval || '';
        params.albumName = musicInfo.albumName || musicInfo.album || '';
        params.quality = quality || '';
    }
    const query = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const url = `${baseUrl}?${query}`;
    const resp = await httpFetch(url, { method: 'GET', timeout: 8000 });

    if (resp.statusCode === 403) {
        backendAggBlocked = true;
        throw new Error('后端聚合接口返回403，已屏蔽');
    }

    if (resp.statusCode !== 200) throw new Error(`后端接口状态${resp.statusCode}`);

    const data = resp.body;
    if (data.code !== 200) throw new Error(data.msg || '后端无可用链接');

    // 汽水音乐专用分支 —— 抖音加密流
    if (backendSource === 'qs') {
        const d = data.data || {};
        let streamUrl = d.url || '';

        if (streamUrl && d.key && !/[?&]key=/.test(streamUrl)) {
            streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(d.key);
        }

        if (!streamUrl) streamUrl = d.source_url || '';
        if (!streamUrl) throw new Error('汽水后端未返回流媒体链接');

        return {
            url: streamUrl,
            lyric: d.lyric || d.lrc || null,
            cover: d.cover || d.picture || d.album_pic || null,
        };
    }

    if (!data.url) throw new Error(data.msg || '后端无可用链接');
    const finalUrl = processKwEncryptedUrl(data, backendSource);
    return { url: finalUrl, lyric: data.lrc || null, cover: data.picture || null };
}

// -------------------- 核心：获取音乐URL --------------------
async function fetchMusicUrl(source, musicInfo, quality) {
    const id = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
    if (!id) throw new Error('缺少 songId');
    let actualQuality = mapQuality(quality, MUSIC_QUALITIES[source] || ['128k','320k','flac']);

    if (source === 'kw' && !KW_DECRYPT_PROXY.allowEncryptedLossless) {
        actualQuality = mapQuality(quality, ['128k','320k','flac']);
    }

    let result = { url: '', lyric: null, cover: null };
    let lastError = '';
    const chkszEnabled = !!(CHKSZ_CONFIG.apikey && CHKSZ_CONFIG.apikey.trim());

    // --- 酷我音乐 ---
    if (source === 'kw') {
        // 统一走本站取链：音质兜底、短链签名、加密解密都在服务端完成，
        // 插件里不再直连酷我，避免本地链路失效时整首放不出来。
        try {
            result = await getUrlFromBackend('kw', musicInfo, actualQuality);
        } catch (e) {
            lastError = `酷我取链失败: ${e.message}`;
        }
    }
    // --- 网易云音乐 ---
    else if (source === 'wy') {
        if (chkszEnabled && CHKSZ_CONFIG.enableNetease) {
            try {
                result = await getWyChkszUrl(id, actualQuality);
            } catch (e) {
                lastError = `chksz网易失败: ${e.message}`;
            }
        }

        if (!result.url && !backendAggBlocked) {
            try {
                result = await getUrlFromBackend('wy', musicInfo, actualQuality);
            } catch (e) {
                lastError = `后端聚合失败: ${e.message}`;
            }
        }

        if (!result.url && GD_SUPPORTED_QUALITIES.has(actualQuality)) {
            try {
                result = await getWyGDUrl(id, actualQuality);
            } catch (e) {
                lastError = `GD接口失败: ${e.message}`;
            }
        }
    }
    // --- QQ 音乐 ---
    else if (source === 'tx') {
        if (chkszEnabled && CHKSZ_CONFIG.enableQQ) {
            try {
                result = await getTxChkszUrl(musicInfo, actualQuality);
            } catch (e) { lastError = `chksz QQ失败: ${e.message}`; }
        }

        if (!result.url) {
            try {
                result = await getUrlFromBackend(source, musicInfo, actualQuality);
            } catch (e) { lastError = `后端失败: ${e.message}`; }
        }
    }
    // --- 汽水音乐 ---
    else if (source === 'qs') {
        try {
            result = await getUrlFromBackend('qs', musicInfo, actualQuality);
        } catch (e) {
            lastError = `汽水后端失败: ${e.message}`;
        }
    }
    // --- 其他平台 ---
    else {
        try {
            result = await getUrlFromBackend(source, musicInfo, actualQuality);
        } catch (e) { lastError = `后端失败: ${e.message}`; }
    }

    extraCache.set(id, { lyric: result.lyric, cover: result.cover });

    const trimmedUrl = typeof result.url === 'string' ? result.url.trim() : '';
    if (typeof result.url !== 'string' || trimmedUrl.length < 1 || !trimmedUrl.match(/^https?:\/\//i)) {
        throw new Error(lastError || '获取播放链接失败');
    }

    return trimmedUrl;
}

// -------------------- 更新检查 --------------------
async function checkUpdate() {
    try {
        const resp = await httpFetch(
            buildUrl('primary', 'version') + '?ver=' + encodeURIComponent(SCRIPT_VERSION),
            { timeout: 5000 }
        );
        if (resp.statusCode === 200 && resp.body && resp.body.update_url) {
            send(EVENT_NAMES.updateAlert, {
                log: resp.body.changelog || resp.body.message || `发现新版本 ${resp.body.version || ''}`,
                updateUrl: resp.body.update_url
            });
        }
    } catch (e) {}
}

// -------------------- 事件处理 --------------------
on(EVENT_NAMES.request, async ({ action, source, info }) => {
    if (!source || !MUSIC_QUALITIES[source]) throw new Error(`不支持的音乐源: ${source}`);

    if (action === 'musicUrl') {
        if (!info?.musicInfo || !info.type) throw new Error('参数不完整');
        return fetchMusicUrl(source, info.musicInfo, info.type);
    }

    const id = info?.musicInfo?.hash ?? info?.musicInfo?.songmid ?? info?.musicInfo?.id;
    const cached = extraCache.get(id);
    if (action === 'lyric') return cached?.lyric ? { lyric: cached.lyric, tlyric: '' } : null;
    if (action === 'pic') return cached?.cover || null;
    throw new Error(`不支持的操作: ${action}`);
});

// -------------------- 启动 --------------------
(async () => {
    deviceId = generateDeviceId();
    clientHeader = buildClientHeader();
    ensureTokenFresh();
    availablePlatforms = ['wy', 'tx', 'kg', 'kw', 'mg', 'qs'];
    const sources = {};
    availablePlatforms.forEach(p => { sources[p] = { name: PLATFORM_NAMES[p], type: 'music', actions: ['musicUrl', 'lyric', 'pic'], qualitys: MUSIC_QUALITIES[p] }; });
    send(EVENT_NAMES.inited, { openDevMode: false, status: true, sources });
    fetchIp();
    checkUpdate();
})();
})(__SUB_REGISTER("xinghai", "/*!\n * @name         星海音乐源\n * @description  GDAPI | 聚合 | ChKSz API | 全平台支持 24bit FLAC，网易、酷狗、QQ 最高支持母带｜建议与反馈：https://yy.zddyr.top/survey.php?k=192ee708d4721bc9077f8f1738296c1b\n * @version      v3.2.18\n * @author       万去了了 / 科学大魔王\n * @homepage     https://zddyr.top/\n * @see          http://gc.kxwa.top/\n * @lastUpdate   2026-11-08\n * @update       优化酷我：修复部分歌曲取链接失败\n * @update       使用体验反馈：https://yy.zddyr.top/survey.php?k=192ee708d4721bc9077f8f1738296c1b\n * @license      仅供学习交流，请支持正版\n */"));

  // ==================== 平台声明：取第一优先源，不做合并 ====================
  var merged = {}
  var order = []
  var loaded = []
  var owner = {}

  for (var i = 0; i < SUBS.length; i++) {
    var st = SUBS[i]
    if (!st.inited || !st.inited.sources) continue
    loaded.push(st.name)
    var srcs = st.inited.sources
    for (var k in srcs) {
      if (!Object.prototype.hasOwnProperty.call(srcs, k)) continue
      if (merged[k]) continue
      var s = srcs[k]
      merged[k] = {
        name: s.name,
        type: s.type || 'music',
        actions: (s.actions || ['musicUrl']).slice(),
        qualitys: (s.qualitys || []).slice()
      }
      owner[k] = st.name
      order.push(k)
    }
  }

  try {
    console.log('[洋仔聚合] 可用子源 ' + loaded.length + '/' + SUBS.length + ': ' + loaded.join(' / '))
    var report = []
    for (var oi = 0; oi < order.length; oi++) {
      var pk = order[oi]
      report.push(pk + '(' + owner[pk] + ')')
    }
    console.log('[洋仔聚合] 平台归属: ' + (report.join(', ') || '无'))
    console.log('[洋仔聚合] 调度: 串行 fallback, 单源 ' + PER_TIMEOUT + 'ms, 总 ' + TOTAL_TIMEOUT + 'ms')
  } catch (e) {}

  if (!order.length) {
    __lx.send(EV_INIT, {
      status: false,
      message: '[洋仔聚合] 所有子源初始化失败，请换用单个音源',
      openDevTools: false,
      sources: {}
    })
    return
  }

  function isUsableUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u.trim()) && u.trim().length > 12
  }

  function candidatesFor(source, quality) {
    var strict = []
    var loose = []
    for (var i = 0; i < SUBS.length; i++) {
      var st = SUBS[i]
      if (!st.ok || !st.handler || !st.inited.sources) continue
      var decl = st.inited.sources[source]
      if (!decl) continue
      loose.push(st)
      if (!quality) { strict.push(st); continue }
      var qs = decl.qualitys || []
      if (!qs.length || qs.indexOf(quality) >= 0) strict.push(st)
    }
    return strict.length ? strict : loose
  }

  function handleRequest(payload) {
    var source = payload && payload.source
    var info = (payload && payload.info) || {}
    var quality = info.type
    var cands = candidatesFor(source, quality)
    if (!cands.length) {
      return Promise.reject(new Error('[洋仔聚合] 没有支持 ' + source + ' 的可用子源'))
    }

    var errors = []
    var t0 = Date.now()

    return new Promise(function (resolve, reject) {
      var idx = 0
      var globalTimer = setTimeout(function () {
        reject(new Error('[洋仔聚合] 总超时 ' + TOTAL_TIMEOUT + 'ms\n' + errors.join('\n')))
      }, TOTAL_TIMEOUT)

      function done(err, url) {
        clearTimeout(globalTimer)
        if (err) reject(err)
        else resolve(url)
      }

      function attempt() {
        if (idx >= cands.length) {
          return done(new Error('[洋仔聚合] 全部音源失败（' + cands.length + ' 个）\n' + errors.join('\n')))
        }
        var st = cands[idx++]
        var settled = false
        var timer = setTimeout(function () {
          if (settled) return
          settled = true
          errors.push('  ' + st.name + ': 超时(' + PER_TIMEOUT + 'ms)')
          attempt()
        }, PER_TIMEOUT)

        function finish(err, url) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          if (err) {
            errors.push('  ' + st.name + ': ' + ((err && err.message) || err))
            return attempt()
          }
          if (!isUsableUrl(url)) {
            errors.push('  ' + st.name + ': 返回非法地址 ' + String(url).slice(0, 60))
            return attempt()
          }
          try { console.log('[洋仔聚合] ' + source + '/' + quality + ' 命中 ' + st.name + ' ' + (Date.now() - t0) + 'ms') } catch (e) {}
          done(null, String(url).trim())
        }

        var ret
        try {
          ret = st.handler(payload)
        } catch (e) {
          return finish(e)
        }
        if (ret && typeof ret.then === 'function') {
          ret.then(function (u) { finish(null, u) }, function (e) { finish(e) })
        } else {
          finish(null, ret)
        }
      }

      attempt()
    })
  }

  __lx.on(EV_REQ, handleRequest)

  __lx.send(EV_INIT, {
    status: true,
    openDevTools: false,
    sources: merged
  })
})()
