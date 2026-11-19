---
name: gemini-ext-dev
description: "Guidelines and techniques for developing, maintaining, and testing the Chrome MV3 Gemini Browser Extension, including Shadow DOM UI isolation, semantic site adapters, and Gemini quota monitoring."
---

# Gemini 浏览器插件开发与维护技能手册 (gemini-ext-dev)

本技能手册指导智能体与开发者针对 `gemini.google.com` 网页端进行稳定、低开销、抗改版的 Chrome MV3 浏览器扩展开发。

## 1. 语义选择器设计规范 (`src/sites/gemini.ts`)

Gemini Web 前端使用 Angular 框架，组件类名通常包含混淆哈希（例如 `_ngcontent-ng-c12345678` 或 `mat-mdc-*`）。选择器必须遵循以下层级：

1. **语义自定义标签**:
   - 对话流主容器: `main`, `chat-window`, `infinite-scroller`
   - 用户提问单元: `user-query`, `div[data-message-author-role="user"]`
   - 模型回复单元: `model-response`, `div[data-message-author-role="model"]`
   - 对话轮次项: `message-content`, `conversation-turn`, `div.conversation-container`
2. **辅助功能与语义属性 (ARIA / Role)**:
   - 发送/停止按钮: `button[aria-label*="Send"]`, `button[aria-label*="Stop"]`, `button[aria-label*="发送"]`, `button[aria-label*="停止"]`
   - 输入框: `rich-textarea`, `div[contenteditable="true"][role="textbox"]`
   - 顶部导航栏: `header`, `mat-toolbar`, `div[role="banner"]`
   - 侧边栏: `mat-sidenav`, `nav[role="navigation"]`, `div.side-nav-container`
3. **结构化回退提取**:
   - 若特定标签未命中，适配器需递归向上匹配具有文本内容的 message node。

## 2. Shadow DOM 挂载与主题同步模式

所有 Content Script 注入界面均必须遵循以下模版：

```typescript
export function createShadowContainer(id: string, styles: string): { host: HTMLElement, root: ShadowRoot } {
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
    document.body.appendChild(host);
  }
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${styles}</style><div class="extension-root"></div>`;
  return { host, root };
}
```

主题变量同步必须监听宿主页面的 class 或属性变动：
- `document.documentElement.classList.contains('dark-theme')` 或 `document.body.getAttribute('data-theme') === 'dark'`
- 在 Shadow DOM 内部根容器上添加 `.theme-dark` 或 `.theme-light` 类名。

## 3. 双层限额获取机制 (Dual Pipeline)

1. **首选通道**:
   - `fetch('https://gemini.google.com/usage', { credentials: 'include', headers: { 'Accept': 'text/html,application/json' } })`
   - 解析响应中内嵌的初始状态数据（`WIZ_global_data`、`AF_dataServiceRequests` 或 HTML 中的进度元素）。
2. **降级通道 (iframe + declarativeNetRequest)**:
   - 若直连无有效读数，创建 `iframe` 载入 `https://gemini.google.com/usage`；
   - 由 `rules/usage_dnr.json` 规则剥离 `X-Frame-Options` 与 `Content-Security-Policy` 中的 `frame-ancestors`；
   - iframe 加载完成通过 DOM 探针解析限额数字与重置时间，解析完毕立刻 `iframe.remove()`。
