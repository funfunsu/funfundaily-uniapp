# 微信 AI 开发模式 - SKILL 源代码

本目录是「微信小程序 AI 开发模式」SKILL 的**源代码源头**，与 uni-app 编译产物解耦。

## 为什么单独放这里

uni-app 编译目标 `mp-weixin` 每次 build 会重写 `frontend/dist/build/mp-weixin/`，
直接把 SKILL 文件放编译产物里会被覆盖。同时 SKILL 的代码是**纯原生 mp-weixin 小程序代码**
（wx.* API、wxml/wxss/原生 Component），不需要走 Vue 编译——把它放 src/ 反而会被 uni-app
当成不识别的源码处理。

所以策略是：**SKILL 在这里维护，构建后通过脚本/约定同步进 dist/build/mp-weixin/**。

## 集成路径（待 Nightly 实操验证后定型）

候选方案：

**方案 A：post-build copy + app.json patch（推荐）**
1. `frontend/wechat-ai-skill/<skill>/` → 复制到 `dist/build/mp-weixin/skills/<skill>/`
2. 后处理脚本读取 `dist/build/mp-weixin/app.json`，追加：
   ```json
   {
     "subPackages": [{ "root": "skills/checkin", "independent": true }],
     "agent": { "skills": [{ "name": "checkin", "description": "...", "path": "skills/checkin" }] }
   }
   ```
3. 在 `frontend/package.json` scripts 里加 `"build:mp-weixin": "uni build -p mp-weixin && node ../script/sync-skills.js"`
4. 优点：uni-app 主项目不动；SKILL 独立维护；可随时新增 SKILL
5. 风险：app.json patching 的字段顺序/合并要稳定

**方案 B：放 `frontend/public/skills/`（vite publicDir 透传）**
- vite 已配 `publicDir: 'public'`；files in `public/` 会原样拷到 dist 根
- 优点：无需 post-build 脚本
- 风险：仍需要单独 patch app.json（uni-app 自动生成的 app.json 不会自带 `agent` 字段）

**结论**：开 dev tool Nightly 实操后，先用方案 A 走一遍最小回路（手工 copy + 手工改 app.json），
通过后再决定要不要写自动化脚本。

## 目录约定（与微信官方一致）

```
wechat-ai-skill/
├── README.md                ← 本文件
└── <skill-name>/            ← 一个 SKILL 一个目录
    ├── SKILL.md             ← 业务文档（≤16KB，AI 看的"操作手册"）
    ├── mcp.json             ← 原子接口/组件声明（≤24KB）
    ├── index.js             ← 注册入口，wx.modelContext.createSkill(...)
    ├── apis/                ← 原子接口实现（每个 API 一个 JS）
    └── components/          ← 原子组件（每个组件一个目录：wxml/wxss/js/json）
```

## 当前 SKILL 清单

- [`checkin/`](./checkin/) — 打卡助手（首批 SKILL #1）
- _日程 / 戒断 待 checkin 验证通过后添加_
