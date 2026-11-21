# 洛雪音乐音源合集（自建镜像）

**仓库地址**：<https://github.com/szyshr199312/lx-source>

给自己的洛雪音乐（LX Music）用的音源仓库。内容采集自公开社区音源，每天对比上游更新。

用途：电视 / 手机 / 电脑三端统一从这个仓库导入音源，链接固定不变，上游挂了也不影响自己。

采集日期：2026-11-21 ｜ 上游：`pdone/lx-music-source`（11.5k star，每日 01:00 自动检测）
本地校验：20 个脚本全部 HTTP 200 下载成功，全部为合法洛雪自定义源（含 `@name` / `@version` 头，调用 `globalThis.lx`）

---

## 零、合并版（推荐）：一个链接搞定全部

嫌下面 6 条太多？**只导一条就够**。三档任选，从稳到全：

| 档位 | 链接 | 体积 | 含几个源 |
|---|---|---|---|
| **稳（先试这个）** | `.../main/jiexiang/latest.js` | 84 KB | 1 个（杰翔，内部已聚合 40+ 接口） |
| **中** | `.../main/allinone/lite.js` | 120 KB | 2 个（杰翔 + 轻量四平台） |
| **全** | `.../main/allinone/latest.js` | 214 KB | 4 个（+ 星澜 + 星海） |

完整地址前缀 `https://raw.githubusercontent.com/szyshr199312/lx-source`。

合并版覆盖 **QQ音乐 / 网易云 / 酷我 / 酷狗 / 咪咕 / 汽水** 六个平台，还带歌词和封面 action。

### 版本演进（踩过的坑，别重复踩）

**v1 — `new Function` + base64（已废弃）**
把每个子源 base64 内嵌，运行时 `new Function(src)()` 动态执行。Node 里跑得好，但 **React Native 的 Hermes 引擎默认禁用动态代码执行** —— 电视/手机上脚本根本执行不了，洛雪等不到 `send(inited)`，报"加载超时"。

**v2 — 源码级内联 + 并发竞速（已废弃）**
改成零 `eval`：每个子源包进 IIFE，源码里的 `globalThis.lx` 替换成局部参数 `__lx`。体积从 284 KB 降到 214 KB。调度改成并发竞速，解决串行叠加超时。

**v3 — 串行 fallback（已废弃）**
竞速会让"先返回"的源抢先，但先返回 ≠ 结果可用。改回串行，首源成功即返回。

**v4 — 按音质筛选源（当前版本）**
v3 遗留一个致命 bug：**音质不匹配**。

洛雪按你设置的首选音质发请求（`type: "flac"` / `"master"`）。合并版里各源支持的音质不同：

| 源 | QQ音乐支持的音质 |
|---|---|
| 杰翔聚合 | 128k / 320k / flac |
| 轻量四平台 | **只有 128k** |
| 星澜聚合 | 含 master / hires / atmos |
| 星海音乐 | 含 master |

杰翔没接住时 fallback 到"轻量四平台"，它不理解 flac 请求，返回了 `https://cdn-img.gitcode.com/db/ee/d36b953e...` —— 那是**代码托管站的 CDN 地址，根本不是音频文件**。播放器拿到这个去加载，就是"播放报错"。

v4 的修法：`candidatesFor(source, quality)` 只把**声明支持该音质**的源列为候选，请求 flac 时只支持 128k 的源直接出局。没源接住就明确报错（附每个源失败原因），绝不返回假链接。

2026-11-21 本地 mock 洛雪环境实测（Node 24，v4）：

| 请求音质 | 结果 | 耗时 | 返回域名 |
|---|---|---|---|
| 128k | ✅ | 747 ms | `ws.stream.qqmusic.qq.com` |
| 320k | ✅ | 439 ms | `ws.stream.qqmusic.qq.com` |
| flac | ✅ | 416 ms | `ws.stream.qqmusic.qq.com` |
| master | ✅ | 45 ms | `ws.stream.qqmusic.qq.com`（转由星澜/星海承接） |
| 子源加载 | ✅ 4/4 | 48 ms | 平台归属 tx/wy/kw/kg/mg → 杰翔，qs → 星澜 |

拿不到音质匹配的源时，返回的错误长这样（而不是给个坏地址）：

```
[洋仔聚合] 全部音源失败（2 个）
  jiexiang: 无法获取歌曲ID
  xinglan: 无法获取歌曲ID
```

### 还是超时怎么办

按顺序排查：

1. **换成 84 KB 的单源 `jiexiang/latest.js`**。如果这个也超时，问题不在合并脚本，在下载链路或客户端本身。
2. **改用本地文件导入**：先把 js 下到 U 盘/手机，洛雪里选「本地导入」。排除 GitHub 下载慢的因素。
3. **换 GitHub 加速域名**（**实测有效**，2026-11-21）：
   ```
   https://gh-proxy.org/https://raw.githubusercontent.com/szyshr199312/lx-source/main/allinone/lite.js
   ```
   电视端直连 `raw.githubusercontent.com` 会卡在加载阶段，套上 `gh-proxy.org/` 前缀后能正常加载。本仓库不用 jsdelivr —— 实测 `cdn.jsdelivr.net` 在国内多次 TLS 握手被重置，完全不通。
4. **看洛雪的源管理页有没有报错文案**。加载超时和播放超时是两回事：前者是脚本没在限定时间内 `send(inited)`，后者是 `musicUrl` 请求没返回。

**为什么洛雪要一条一条导？** 洛雪的自定义源机制是「一个脚本 = 一个音源」，没有订阅/批量导入功能（那是 MusicFree 的机制）。所以要么多导几条，要么用上面的合并版。

---

## 一、怎么用（三种方式，任选）

### 方式 1：在线链接导入（推荐，三端通用）

洛雪里打开 **设置 → 基础设置 → 自定义源管理 → 导入 → 在线导入**，粘贴下面对应的链接。

本仓库 2026-11-21 实测：`raw.githubusercontent.com` **直连可用**（823 ms），`gh-proxy.org` 也可用（1.2 s）；`cdn.jsdelivr.net` 在本机 TLS 握手被重置，**不可用**，别用。

**主链接（GitHub 直连）**：

```
https://raw.githubusercontent.com/szyshr199312/lx-source/main/jiexiang/latest.js
```

**备用（直连不通时，整段前面加 `https://gh-proxy.org/`）**：

```
https://gh-proxy.org/raw.githubusercontent.com/szyshr199312/lx-source/main/jiexiang/latest.js
```

其他镜像前缀（把 `gh-proxy.org` 替换掉即可）：`gh.llkk.cc`、`github.moeyy.xyz`、`ghproxy.cn`、`ghproxy.net`

六个推荐音源一次贴完：

```
https://raw.githubusercontent.com/szyshr199312/lx-source/main/jiexiang/latest.js
https://raw.githubusercontent.com/szyshr199312/lx-source/main/qingliang/latest.js
https://raw.githubusercontent.com/szyshr199312/lx-source/main/xinglan/latest.js
https://raw.githubusercontent.com/szyshr199312/lx-source/main/changqing/latest.js
https://raw.githubusercontent.com/szyshr199312/lx-source/main/fish/latest.js
https://raw.githubusercontent.com/szyshr199312/lx-source/main/xinghai/latest.js
```

### 方式 2：本地文件导入（电视上最省事）

把本仓库里的 `latest.js` 拷到 U 盘 → 电视上洛雪 **设置 → 自定义源管理 → 导入 → 本地导入** → 选文件。

注意：文件名都叫 `latest.js`，拷 U 盘前先改成 `jiexiang.js` 这类能认出的名字，否则分不清。

### 方式 3：完全不走自己的仓库（应急）

直接导上游原始链接，不需要 GitHub 账号：

```
https://gh-proxy.org/raw.githubusercontent.com/pdone/lx-music-source/main/jiexiang/latest.js
```

---

## 二、音源清单与可用性

状态取自上游每日检测（2026-11-16 01:07 最后变更）+ 本机 2026-11-21 TCP 443 实测。
**可用** = 上游判定可用且主 API 域名可达；**异常** = 上游判定异常或主域不通，仍可试。

### 第一梯队（建议先导这几个）

| 音源 | 目录 | 版本 | 体积 | 状态 | 说明 |
|---|---|---|---|---|---|
| 杰翔聚合音源 | `jiexiang/` | 2.3.0 | 89 KB | ✅ 可用 | 聚合 40+ 接口，QQ/网易/酷狗/酷我/咪咕全覆盖，最稳的一个 |
| 轻量音源（四平台多源并行） | `qingliang/` | 2.1.0 | 26 KB | ✅ 可用 | 四平台并行请求，单平台挂了不影响 |
| 星澜聚合音源 | `xinglan/` | 4.0.2 | 73 KB | ✅ 可用 | StellarWave 团队维护，聚合型 |
| 长青SVIP音源 | `changqing/` | 1.3.0 | 27 KB | ✅ 可用 | 元力菌出品，音质好 |
| fish_music | `fish/` | 1.9.0 | 625 KB | ✅ 可用 | 大鱼吃小鱼，脚本体积大、内置逻辑多 |
| 星海音乐源 | `xinghai/` | 3.2.18 | 21 KB | ✅ 可用 | 版本号更新勤 |

### 第二梯队（可用，做备份）

| 音源 | 目录 | 版本 | 体积 | 状态 |
|---|---|---|---|---|
| 非常刀 | `feichangdao/` | v5 | 17 KB | ✅ 可用 |
| HelloWorld | `helloworld/` | 260925 | 21 KB | ✅ 可用 |
| HYWmusic 公益版 | `hyw/` | v1.2.0 | 12 KB | ✅ 可用 |
| 独家音源 | `lx/` | 7 | 63 KB | ✅ 可用 |
| 全豆要聚合音源 | `qdy/` | 9.3 | 30 KB | ✅ 可用 |
| 溯音音源 | `suyin/` | v1 | 17 KB | ✅ 可用 |
| lx-玉宁熙-Pro | `yuningxi/` | v1.2.5 | 141 KB | ⚠️ 上游未纳入检测，脚本完整可试 |
| 幻音音源 | `huanyin/` | v3 | 7 KB | ⚠️ 主域 `music-dl.sayqz.com` 不通，有备用域 `api.xcvts.cn` |

### 第三梯队（上游判异常，别指望）

| 音源 | 目录 | 体积 | 问题 |
|---|---|---|---|
| 野花🌷 | `flower/` | 10 KB | 上游判异常，脚本已混淆 |
| 野草🌾 | `grass/` | 9 KB | 上游判异常 |
| Huibq | `huibq/` | 3 KB | 上游判异常（`lxmusicapi.onrender.com` 时好时坏） |
| 聚合API接口 | `juhe/` | 1 KB | 上游判异常，仅 994 B 的薄壳 |
| ikun音源 | `ikun/` | 5 KB | **已失效**，`api.ikunshare.com` 连不上 |
| 六音音源 | `sixyin/` | 325 KB | 上游已从其 README 删除死链 |

---

## 三、电视上的实操顺序

1. 洛雪打开 → **设置 → 基础设置 → 自定义源管理**
2. **导入 → 在线导入** → 粘 `jiexiang` 那条链接 → 确定
3. 回到自定义源管理，勾选刚导入的源为启用
4. 依次把 `qingliang`、`xinglan`、`changqing` 也导进去（多导几个，一个挂了自动换）
5. 回首页搜索歌名，能出结果、能播放就成

搜索没结果 = 音源没启用或全挂了；能搜到但不能播 = 该源只提供搜索不提供播放链接，换下一个源。

---

## 四、失效了怎么办

音源是消耗品。出现「搜不到 / 播放失败」时，按这个顺序排查：

1. 先换源试：洛雪搜索页可以切换音源，挨个试
2. 都失败 → 去上游看当日检测：<https://github.com/pdone/lx-music-source>
3. 上游有新版本 → 重新导一次（在线导入会覆盖同名源）
4. 上游整个仓库没了 → 这个仓库里的旧文件还能用一阵，同时找新仓库

**注意**：这个仓库只是一份快照，不会自动跟着上游更新。要更新就重跑采集脚本，或者手动从上游再下一次。

---

## 五、来源与声明

| 音源 | 上游 |
|---|---|
| Huibq | `Huibq/keep-alive` |
| 独家音源 | lxmusic.cc |
| HYWmusic 公益版 | `Macrohard0001/HYWmusic_source` |
| 杰翔聚合音源 | `haonanren118/jiexiang-Music-Source` |
| 长青SVIP | 元力菌 |
| 幻音 / 溯音 | 竹佀 |
| 星海音乐源 | 万去了了 / 科学大魔王 |
| fish_music | 大鱼吃小鱼 |
| HelloWorld | hello world |
| lx-玉宁熙-Pro | ynx |
| 非常刀 | 群主要进去 |
| 轻量音源 | 本地定制 |
| 星澜聚合音源 | 星澜团队 |

所有内容版权归原作者。仅供个人学习研究，请勿批量下载、勿商用。
