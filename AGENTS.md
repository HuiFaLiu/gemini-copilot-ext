# Gemini Copilot 浏览器插件开发规范与架构铁律 (AGENTS.md)

本文件定义了针对 `gemini.google.com` 网页端 Chrome Manifest V3 (MV3) 浏览器插件的核心架构原则、代码组织规范与安全合规铁律。所有协助开发与维护此项目的 AI 代理和工程师必须严格遵守。

---

## 1. 核心架构三原则

### 1.1 语义适配层彻底解耦 (Semantic Adapter Layer)
- **绝对禁止**在业务逻辑模块（如 `features/navigator`、`features/quota`、`features/composer`）中直接硬编码 DOM 选择器（CSS selectors / XPath）。
- 所有与 `gemini.google.com` 页面 DOM 结构相关的选择器、属性探测和节点提取函数，必须集中统一维护在 `src/sites/gemini.ts` 中。
- 适配层必须针对易变混淆类名提供**多级回退策略（Multi-tier Fallbacks）**，优先采用语义属性（如 `role="presentation"`、`aria-label`、特定自定义标签名如 `<user-query>`、`<model-response>`、`<message-content>`、`data-test-id`），并以层级结构作为兜底。
- 上层功能模块只能消费适配层导出的抽象数据模型（如 `TurnNode[]`、`GeminiSiteState`）与生命周期事件。

### 1.2 严格的 Shadow DOM 沙箱隔离 (Shadow DOM Isolation)
- 任何注入到宿主页面（`gemini.google.com`）的 UI 元素（悬浮时间轴、顶栏限额胶囊、浮层菜单、提示 Toast）**必须挂载在 `ShadowRoot` 内**（模式采用 `attachShadow({ mode: 'open' })`）。
- 绝不允许将插件全局样式直接注入页面的 `<head>` 或 `<body>`，防止破坏 Gemini 原生 Angular/Material 布局，并防止 Gemini 原生全局样式污染插件 UI。
- 插件 UI 必须通过适配层动态读取宿主页面的主题模式（`dark` / `light`），并通过 CSS 变量自动继承与同步背景、文本、边框与高亮配色。

### 1.3 权限最小化与零外部网络通信 (Zero-Telemetry & Minimal Privileges)
- `manifest.json` 中的 `host_permissions` 仅限于 `https://gemini.google.com/*`。
- **严禁**向任何第三方统计、追踪或外部服务器发送网络请求或用户对话数据。
- 用户数据（会话草稿、星标轮次、本地设置）仅保存在浏览器受限的 `chrome.storage.local` / `chrome.storage.session`。

---

## 2. 限额刷新与风控防护边界 (Quota Guardrails)

Google 网页端未开放公开限额 API，数据需从已登录会话上下文获取。为避免触发 429 限流、内存泄漏或账号风控，调度引擎必须恪守以下规则：

1. **事件驱动优先 (Event-Driven Refresh)**:
   - 监听 Gemini 发送/停止按钮状态切换。当模型完成回复（按钮从 `Stop` 状态重置回 `Send` 状态）后，延迟 1.5–2 秒触发单次精准刷新（捕获最新消费）。
2. **安全定时轮询 (Smart Interval Polling)**:
   - 仅在用户处于当前活跃前台标签页（`document.visibilityState === 'visible'`）时执行定时轮询。
   - 默认轮询间隔设为 45 秒，用户自定义下限严禁低于 15 秒。
   - 标签页隐藏（切到后台或最小化）时，必须通过 `visibilitychange` 事件**立即挂起**轮询计时器。
3. **Service Worker 单飞去重 (Single-Flight Deduplication)**:
   - 用户打开多个 Gemini 标签页时，限额刷新请求统一由 Background Service Worker 集中调度；
   - 若已有正在执行的请求，其他标签页的触发直接合并等待同一次结果（Single-Flight），杜绝重复并发请求。
4. **429 速率限制指数退避 (Exponential Backoff)**:
   - 一旦收到 HTTP 429 Too Many Requests 或内部限流响应，立即强制退避（退避阶梯：60s -> 120s -> 300s），期间禁止任何自动轮询。
5. **双层通道策略 (Dual Pipeline)**:
   - **首选通道**: 同源轻量请求（内部接口/同源 `/usage` 载荷解析），零 DOM 渲染负担。
   - **降级通道**: 受控隐藏 iframe。仅在直连失效时由 `declarativeNetRequest` 规则临时解除 CSP/X-Frame-Options 限制，解析后立即销毁 iframe，且降级后轮询间隔自动拉长至 120 秒以上。

---

## 3. 目录与分层架构规范

```
src/
├── sites/
│   └── gemini.ts        # 唯一的页面语义适配层（选择器、DOM 观察器）
├── core/
│   ├── bus.ts           # Content <-> Service Worker 强类型通信总线
│   ├── lifecycle.ts     # SPA 路由补丁、插件挂载/卸载自愈
│   └── storage.ts       # chrome.storage 强类型读写封装
├── features/
│   ├── navigator/       # 对话时间轴、悬浮预览、高亮定位、过滤
│   ├── quota/           # 顶栏限额胶囊、展开卡片、双层解析器
│   ├── composer/        # 草稿防丢、Ctrl+Enter发送键定制、公式复制
│   └── exporter/        # Markdown / JSON 一键干净导出
├── background/
│   └── index.ts         # Service Worker 单飞调度、退避与图标 Badge
└── popup/
    ├── index.html       # 扩展控制面板 HTML
    └── popup.ts         # 控制面板逻辑
```

---

## 4. SPA 路由自愈与性能契约
- Gemini 是深度依赖 Angular 客户端渲染的 SPA。页面跳转不会触发整页刷新。
- 必须通过拦截 `history.pushState`、`history.replaceState` 以及监听 `popstate` 和 URL 中的 `c/<conversation_id>` 变更，在会话切换时**自动重置状态并重建时间轴索引**。
- `MutationObserver` 监听对话流时，必须施加 **200ms 防抖 (Debounce)**，流式输出期间避免无效重绘导致丢帧。
