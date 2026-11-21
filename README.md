# 洛雪音乐音源合集（自建镜像）

**仓库地址**：<https://github.com/szyshr199312/lx-source>

给自己的洛雪音乐（LX Music）用的音源仓库。内容采集自公开社区音源，每天对比上游更新。

用途：电视 / 手机 / 电脑三端统一从这个仓库导入音源，链接固定不变，上游挂了也不影响自己。

采集日期：2026-11-21 ｜ 上游：`pdone/lx-music-source`（11.5k star，每日 01:00 自动检测）
本地校验：20 个脚本全部 HTTP 200 下载成功，全部为合法洛雪自定义源（含 `@name` / `@version` 头，调用 `globalThis.lx`）

---

## 零、懒人版：一个链接搞定全部

嫌下面 6 条太多？**只导这一条就够**：

```
https://raw.githubusercontent.com/szyshr199312/lx-source/main/allinone/latest.js
```

`allinone/latest.js` 把 **杰翔聚合 + 轻量四平台 + 星澜聚合 + 星海音乐** 四个源打包进一个脚本，内部按顺序调用，前一个失败自动切下一个。覆盖 QQ音乐 / 网易云 / 酷我 / 酷狗 / 咪咕 五个平台，体积 284 KB。

2026-11-21 本地 mock 洛雪环境实测（Node 24）：

| 平台 | 结果 | 耗时 | 说明 |
|---|---|---|---|
| 子源加载 | ✅ 4/4 | 73 ms | 四个子源全部注册成功 |
| QQ音乐 | ✅ 出链 | 379 ms | 首个后端直接命中 |
| 酷我 | ✅ 出链 | 159 ms | |
| 网易云 | ✅ 出链 | 4,656 ms | 连试 11 个后端才通，慢但能出 |
| 酷狗 | ⚠️ 需完整 hash | — | 测试用的假 hash，属预期失败 |

单源超时 5 秒，全部失败才报错（错误信息会列出每个源失败原因）。

**为什么洛雪要一条一条导？** 洛雪的自定义源机制是「一个脚本 = 一个音源」，没有订阅/批量导入功能（那是 MusicFree 的机制）。所以要么多导几条，要么用上面这个合并版。

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
