# Gemini Copilot 浏览器插件 (Chrome Manifest V3)

> 基于 Google Antigravity 架构蓝图与开源优秀实践（Voyager、Gemini Usage Bar、Usage Meter）精心打造的网页端 Gemini (`gemini.google.com`) 综合增强扩展。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-emerald)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/bundled_with-Vite-purple)

---

## 🌟 核心特性概览

### 1. 🧭 对话内悬浮时间轴导航 (P0)
- **极细悬浮圆点轨道**：吸附于视口右缘，默认状态零遮挡正文。
- **悬浮预览与跳转**：悬停任一圆点可显示该轮用户提问摘要（前 60 字）、序号与状态标签（代码块 `<//>`、数学公式 `∑`、星标 `★`）。
- **视口联动高亮**：采用 `IntersectionObserver` 实时检测当前可视轮次，并联动高亮时间轴圆点。
- **平滑定位与 1.2 秒高亮闪动**：点击直接滚动直达目标轮次，并在目标节点应用呼吸边框光晕。
- **关键词搜索与分类过滤**：展开面板支持实时关键词搜索、仅看代码块、仅看公式或仅看本地星标。
- **SPA 路由自愈与防抖**：监听 URL 对话 ID 切换自动重建索引；`MutationObserver` 200ms 防抖消除流式输出重排抖动。

### 2. ⚡ 实时用量限额胶囊 (P0)
- **顶栏自适应胶囊**：优雅内嵌于 Gemini 顶部操作栏右侧，实时展示已用百分比与微型进度条。
- **三级色彩预警**：`< 70%` 翠绿健康，`70%–89%` 琥珀黄警告，`≥ 90%` 警示红。
- **事件驱动 + 智能定时混合刷新**：
  - **回复完成即时刷新**：监听停止按钮恢复空闲状态，2 秒内触发单次精准拉取（捕获最新消费）。
  - **活跃页安全定时轮询**：默认 45 秒（15s–180s 可调），切出后台自动暂停，杜绝隐蔽消耗。
  - **Service Worker 单飞去重**：多标签页合并为单一网络请求（Single-Flight）。
  - **429 速率限制退避**：遇到限流强制 60s → 120s → 300s 指数退避保护。
- **快捷显隐与展开明细**：随时按快捷键 `Alt + U` 快速切换胶囊显隐；点击展开包含限额明细、重置倒计时与手动刷新按钮的悬浮卡片。

### 3. ✍️ 效率工具与创作增强 (P1)
- **会话草稿自动防丢**：自动按对话 ID 保存输入框未发内容，误按刷新或崩溃重进自动恢复，发送完毕自动清理。
- **发送快捷键定制**：支持开启 `Ctrl/Cmd + Enter` 发送模式，单按 `Enter` 仅换行，彻底杜绝长 Prompt 提前误发。
- **LaTeX 数学公式一键复制**：鼠标悬停 KaTeX / MathML 公式时一键提取并复制 TeX 源码至剪贴板。
- **宽屏阅读模式**：一键去除两边过宽留白，将正文流拓展至 1200px / 1400px。
- **一键导出 Markdown / JSON**：遍历对话轮次生成干净的 Markdown 文档或结构化 JSON，保留代码围栏与公式标记。

---

## 🏗️ 架构与安全铁律

本项目严格遵循 `AGENTS.md` 所规定的 Chrome MV3 架构标准：

1. **语义适配层 (`src/sites/gemini.ts`)**：所有依赖 `gemini.google.com` 页面 DOM 结构的特征选择器严格集中管理，提供多级回退机制，上层业务零硬编码。
2. **Shadow DOM 隔离 (`attachShadow({ mode: 'open' })`)**：所有注入组件完全置于 Shadow DOM 沙箱内，杜绝 Gemini 全局 CSS 污染，并自动同步宿主界面的浅色/深色主题。
3. **零外部网络通信与最小权限**：`host_permissions` 严格限制为 `https://gemini.google.com/*`，无任何第三方追踪或埋点服务器。

---

## 🚀 安装与加载指南

### 方式一：直接加载构建产物（推荐）

本项目已预先编译完整扩展至 `dist/` 目录：

1. 打开 Chrome、Edge 或 Arc 浏览器，访问扩展管理页面：
   - Chrome / Edge: `chrome://extensions/`
2. 打开页面右上角的 **「开发者模式」(Developer mode)** 开关。
3. 点击左上角的 **「加载已解压的扩展程序」(Load unpacked)** 按钮。
4. 在弹出的文件选择器中，选中本项目的 **`dist`** 文件夹并确认。
5. 打开或刷新 [Google Gemini](https://gemini.google.com/) 即可畅享所有增强功能！

---

## 🛠️ 本地开发与二次构建

```bash
# 1. 安装依赖
npm install

# 2. 生成多分辨率图标
npm run icons

# 3. 执行生产打包 (输出至 dist/)
npm run build
```

---

## 📂 工程目录一览

```
gemini-copilot-ext/
├── AGENTS.md                  # 架构铁律与 Antigravity 开发规范
├── .agents/skills/            # 专属 Agent Skill (gemini-ext-dev)
├── manifest.json              # Chrome Manifest V3 配置
├── rules/
│   └── usage_dnr.json         # declarativeNetRequest 降级解嵌规则
├── src/
│   ├── types/index.ts         # 全局数据模型与消息类型
│   ├── sites/gemini.ts        # 唯一的页面语义适配层
│   ├── core/
│   │   ├── bus.ts             # 强类型消息通信总线
│   │   ├── lifecycle.ts       # SPA 路由自愈与 Shadow DOM 挂载
│   │   └── storage.ts         # chrome.storage 缓存管理器
│   ├── features/
│   │   ├── navigator/         # 时间轴导航与搜索过滤
│   │   ├── quota/             # 用量胶囊与混合刷新引擎
│   │   ├── composer/          # 草稿防丢、按键定制与公式复制
│   │   └── exporter/          # Markdown / JSON 导出
│   ├── background/index.ts    # Service Worker 单飞调度与 Badge
│   └── popup/                 # 控制面板前端 (HTML + TS)
├── scripts/
│   ├── build.js               # Vite 多阶段打包与产物整合
│   └── generate-icons.js      # 像素级图标生成器
└── dist/                      # 最终可直接加载的完整 Chrome 插件
```

---

## 📜 开源致谢与参考

- [voyager-crew/voyager](https://github.com/voyager-crew/voyager) (语义适配层与时间轴导航架构参考)
- [Zandaland/gemini-usage-bar](https://github.com/Zandaland/gemini-usage-bar) (顶栏胶囊、回复完成事件与避让动画参考)
- [Kulver-stukas/models-usage-limits](https://github.com/Kulver-stukas/models-usage-limits) (多标签单飞去重与速率退避设计)
- [Mohammad-Aali/Unofficial-Gemini-Usage-Tracker](https://github.com/Mohammad-Aali/Unofficial-Gemini-Usage-Tracker) (MV3 降级通道与安全头规则参考)
