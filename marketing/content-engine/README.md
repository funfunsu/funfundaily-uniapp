# 内容营销工作流引擎（content-engine）

给 **fungrowth 爱家** 做内容获客的一套轻量系统。主攻方向「幼小衔接/识字」，
渠道：小红书（主）+ 公众号（搜一搜SEO/承接）+ 视频号（原生导流），纯图文、零投放。

## 设计思路：分工

- **Python 脚本（`content.py`）** 做确定性的活：排期、记录数据、复盘、生成给 Claude 的 prompt。零依赖，`python3` 直接跑。
- **Claude** 做创意：起选题、写文案、定策略调整。脚本会把上下文打包成 prompt，你复制粘给 Claude（在 Claude Code 里，免费）。

> ⚠️ 关于数据：小红书没有给个人的开放 API，公众号数据要认证服务号。所以**数据靠你每周手动记 3 个数**（浏览/收藏/涨粉，外加微信后台的小程序访问量），脚本负责分析。这是最稳、零成本的做法。

## 文件

| 文件 | 作用 |
|---|---|
| `config.json` | 定位、渠道节奏、内容主题(pillar)配比、核心指标。**策略都在这里调** |
| `data/backlog.csv` | 选题库（已含 20 条起步选题），状态 idea→drafted→scheduled→published |
| `data/calendar.csv` | 发布日历 + 数据记录 |
| `drafts/` | 每篇草稿（`draft` 命令生成骨架，Claude 填内容） |
| `content.py` | 引擎 |

## 每周循环（约 30 分钟 + 写作时间）

**周一·排期（5 分钟）**
```bash
cd marketing/content-engine
python3 content.py plan          # 预览下周计划
python3 content.py plan --write  # 确认后落盘到 calendar.csv
```
输出就是你要的「这周哪天、哪个渠道、发哪个选题」。按权重自动配比（干货为主），并优先把选题排到匹配的平台。

**周一·写文案（交给 Claude）**
```bash
python3 content.py prompt write   # 复制整段输出
```
把输出粘给 Claude（本 Claude Code 会话即可），它逐篇写出成品文案 + 标题 + 配图脚本 + 导流话术。
存草稿：`python3 content.py draft T001`

**周中·发布后记数据（每篇 30 秒）**
```bash
python3 content.py log                       # 列出本周条目和行号
python3 content.py log --row 0 --published \
  --views 1500 --saves 120 --follows 8 --mp-visits 25 --url <笔记链接>
```
（也可以直接编辑 `data/calendar.csv`，列含义见表头。）

**下周一·复盘 + 调策略**
```bash
python3 content.py analyze         # 按主题/渠道排名 + 下周建议
python3 content.py prompt strategy # 把 analyze 输出粘进去一起给 Claude
```
核心指标是**收藏(saves)**，不是点赞——识字干货的价值在于「被收藏 = 有用 = 会被反复搜到」。
小程序访问量(mp_visits)每周去微信小程序后台「访问分析 → 访问来源/搜一搜」抄一个数。

## 选题库不够时
```bash
python3 content.py prompt topics --n 15   # 粘给 Claude，它回一批 add 命令，直接跑即可入库
python3 content.py backlog                 # 查看库存
```

## 配图生成（images.py，需 `pip install pillow`）

把"封面/清单/规律"等文字卡**用脚本直接生成**，截图**套手机边框**让产品图更好看。
图片尺寸 1080×1440（小红书 3:4），中文字体自动找系统的（macOS 用 STHeiti）。

四种卡：

| 类型 | 用途 | 命令示例 |
|---|---|---|
| `cover` | 封面：超大标题+副标题+角标 | `python3 images.py cover --title "笔顺易错30字" --sub "一年级·可截图自查" --corner "附正确写法"` |
| `list` | 清单/表格（自动缩放防溢出） | 见下方 batch 里的 groups |
| `rule` | 规律/步骤（编号要点） | `python3 images.py rule --title "7条笔顺规律" --point "从上到下" --point "从左到右"` |
| `frame` | 截图套手机边框 | `python3 images.py frame --shot shots/x.png --caption "输字看笔顺动画"` |

主题色：`--theme blue|amber|green|purple|plain`（对应积分/财务/学习/工具配色）。

**批量生成一篇笔记的所有图**（推荐）：把每张图写进一个 JSON，一条命令出图。
```bash
python3 images.py batch --spec specs/T001.json   # 看 specs/T001.json 这个模板
```
生成在 `out/<笔记ID>/`。改 JSON 重跑即可。

**截图美化（frame）**：
1. 微信开发者工具/真机里截小程序页面，存到 `shots/`
2. `python3 images.py frame --shot shots/stroke.png --caption "输字看笔顺动画"`
3. 想叠小程序码：把码图存 `assets/miniapp-qr.png`，加 `--qr assets/miniapp-qr.png`

> ⚠️ **小红书图里别放微信小程序码**（站外导流，易限流）——frame 不加 `--qr` 即可，导流靠简介+评论。
> 小程序码适合用在：**发家长群的图、公众号配图、视频号**。

> 小程序码哪来：微信小程序后台「设置→基本设置→小程序码」下载，或用 App 内分享生成的码截图，存成 `assets/miniapp-qr.png`。

配图工作流串起来：`prompt write` 让 Claude 写文案时，它会列出每张图画什么 →
你把这些填进 `specs/<ID>.json` → `images.py batch` 一键出图。

## 调策略（都在 config.json）
- 某主题数据好 → 调高它的 `weight`（plan 会多排它）
- 改渠道节奏 → 改 `channels.*.days`
- 改定位话术 → 改 `positioning`（会进每个 prompt 的上下文）
