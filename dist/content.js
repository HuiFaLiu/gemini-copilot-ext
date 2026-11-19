var N=Object.defineProperty;var _=(m,f,u)=>f in m?N(m,f,{enumerable:!0,configurable:!0,writable:!0,value:u}):m[f]=u;var l=(m,f,u)=>_(m,typeof f!="symbol"?f+"":f,u);(function(){"use strict";const v=class v{static patchHistoryNavigation(){if(this.isPatched)return;this.isPatched=!0;const t=history.pushState,e=history.replaceState;history.pushState=function(...r){const i=t.apply(this,r);return v.checkUrlChange(),i},history.replaceState=function(...r){const i=e.apply(this,r);return v.checkUrlChange(),i},window.addEventListener("popstate",()=>v.checkUrlChange()),window.addEventListener("hashchange",()=>v.checkUrlChange())}static checkUrlChange(){const t=window.location.href;if(t!==this.currentUrl){const e=this.currentUrl;this.currentUrl=t;for(const r of this.listeners)try{r(t,e)}catch(i){console.error("[Gemini Copilot Lifecycle] Listener error:",i)}}}static onRoute(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter(e=>e!==t)}}static createShadowHost(t,e){let r=document.getElementById(t);r||(r=document.createElement("div"),r.id=t,document.body.appendChild(r));let i=r.shadowRoot;i||(i=r.attachShadow({mode:"open"}));let a=i.querySelector("style");return a||(a=document.createElement("style"),i.appendChild(a)),a.textContent=e,{host:r,root:i}}};l(v,"isPatched",!1),l(v,"listeners",[]),l(v,"currentUrl",window.location.href);let m=v;const f={autoRefreshInterval:45,enableTimeline:!0,enableQuotaPill:!0,enableDraftAutoSave:!0,sendKeyMode:"enter",enableLatexCopy:!0,enableWidescreen:!1,widescreenWidth:"1200px",pillVisible:!0},u={SETTINGS:"gemini_copilot_settings",QUOTA:"gemini_copilot_quota",PILL_POSITION:"gemini_copilot_pill_pos",DRAFTS_PREFIX:"gemini_copilot_draft_",STARS_PREFIX:"gemini_copilot_stars_"};class h{static async getSettings(){try{const t=await chrome.storage.local.get(u.SETTINGS);if(t[u.SETTINGS])return{...f,...t[u.SETTINGS]}}catch(t){console.warn("[Gemini Copilot] Error reading settings from storage:",t)}return{...f}}static async saveSettings(t){const r={...await this.getSettings(),...t};return r.autoRefreshInterval<15&&(r.autoRefreshInterval=15),await chrome.storage.local.set({[u.SETTINGS]:r}),r}static onSettingsChange(t){const e=(r,i)=>{if(i==="local"&&r[u.SETTINGS]){const a={...f,...r[u.SETTINGS].newValue};t(a)}};return chrome.storage.onChanged.addListener(e),()=>chrome.storage.onChanged.removeListener(e)}static async getCachedQuota(){try{return(await chrome.storage.local.get(u.QUOTA))[u.QUOTA]||null}catch{return null}}static async saveQuota(t){await chrome.storage.local.set({[u.QUOTA]:t})}static async getPillPosition(){try{return(await chrome.storage.local.get(u.PILL_POSITION))[u.PILL_POSITION]||null}catch{return null}}static async savePillPosition(t){try{await chrome.storage.local.set({[u.PILL_POSITION]:t})}catch{}}static async getDraft(t){if(!t)return"";try{const e=`${u.DRAFTS_PREFIX}${t}`;return(await chrome.storage.local.get(e))[e]||""}catch{return""}}static async saveDraft(t,e){if(!t)return;const r=`${u.DRAFTS_PREFIX}${t}`;e.trim()?await chrome.storage.local.set({[r]:e}):await chrome.storage.local.remove(r)}static async getStars(t){if(!t)return[];try{const e=`${u.STARS_PREFIX}${t}`,r=await chrome.storage.local.get(e);return Array.isArray(r[e])?r[e]:[]}catch{return[]}}static async toggleStar(t,e){if(!t||!e)return!1;const r=await this.getStars(t),i=r.indexOf(e);let a=!1;i>=0?(r.splice(i,1),a=!1):(r.push(e),a=!0);const s=`${u.STARS_PREFIX}${t}`;return await chrome.storage.local.set({[s]:r}),a}}class p{static getConversationId(){const e=window.location.pathname.match(/\/(?:app|c)\/([a-zA-Z0-9_-]+)/);if(e&&e[1])return e[1];const r=new URLSearchParams(window.location.search),i=r.get("c")||r.get("id");return i||"default_conversation"}static getConversationContainer(){const t=["main","chat-window","infinite-scroller",".conversation-container",'div[role="main"]',".chat-history","#chat-history"];for(const e of t){const r=document.querySelector(e);if(r)return r}return document.querySelector("main")||document.body}static getTurns(){const t=this.getConversationContainer();if(!t)return[];const e=["conversation-turn","div.conversation-turn",'div[data-message-author-role="user"]',"user-query","div.user-query-container"];let r=[];for(const a of e){const s=Array.from(t.querySelectorAll(a));if(s.length>0){r=s;break}}r.length===0&&(r=Array.from(t.querySelectorAll('user-query, [data-message-author-role="user"], .query-text')));const i=[];return r.forEach((a,s)=>{var F,P,$,D;let o=a.matches('user-query, [data-message-author-role="user"]')?a:a.querySelector('user-query, [data-message-author-role="user"], .query-text, .user-query-content'),n="";if(o?n=((F=o.innerText)==null?void 0:F.trim())||"":n=((P=a.innerText)==null?void 0:P.trim())||"",!n){const w=a.querySelector("p");n=(($=w==null?void 0:w.innerText)==null?void 0:$.trim())||`Turn ${s+1}`}const c=n.replace(/\s+/g," "),b=c.length>60?c.slice(0,57)+"...":c;let g=null,x=a.nextElementSibling;if(x&&(x.matches('model-response, [data-message-author-role="model"]')||x.querySelector("model-response")))g=x.matches("model-response")?x:x.querySelector('model-response, [data-message-author-role="model"]');else{const w=a.closest("conversation-turn, .conversation-container, .turn-container");w&&(g=w.querySelector('model-response, [data-message-author-role="model"], .model-response-text, message-content'))}let U=((D=g==null?void 0:g.innerText)==null?void 0:D.trim())||"";const z=!!(g!=null&&g.querySelector("pre, code, .code-block")||a.querySelector("pre, code")),B=!!(g!=null&&g.querySelector(".katex, .math-block, math, [data-math]")||a.querySelector(".katex, math")),Q=a.getAttribute("id")||a.getAttribute("data-turn-id")||`turn-${s+1}`;i.push({id:Q,index:s+1,userPrompt:n,userSnippet:b||`轮次 ${s+1}`,modelResponse:U,hasCode:z,hasMath:B,isStarred:!1,element:a,userElement:o||a,modelElement:g||void 0})}),i}static observeConversation(t){this.turnObserver&&this.turnObserver.disconnect();const e=this.getConversationContainer()||document.body;return this.turnObserver=new MutationObserver(()=>{this.debounceTimer&&window.clearTimeout(this.debounceTimer),this.debounceTimer=window.setTimeout(()=>{const r=this.getTurns();t(r)},200)}),this.turnObserver.observe(e,{childList:!0,subtree:!0,characterData:!1}),t(this.getTurns()),()=>{this.turnObserver&&(this.turnObserver.disconnect(),this.turnObserver=null),this.debounceTimer&&(window.clearTimeout(this.debounceTimer),this.debounceTimer=null)}}static getSendStopButton(){const t=['button[aria-label*="Stop"]','button[aria-label*="停止"]','button[data-test-id*="stop"]',"button.stop-generating-button",'mat-icon[fonticon="stop"]'];for(const r of t){const i=document.querySelector(r);if(i&&i.offsetParent!==null)return{isGenerating:!0,button:i.closest("button")||i}}const e=['button[aria-label*="Send"]','button[aria-label*="发送"]','button[data-test-id*="send"]',"button.send-button"];for(const r of e){const i=document.querySelector(r);if(i)return{isGenerating:!1,button:i}}return{isGenerating:!1,button:null}}static observeReplyFinish(t){return this.buttonObserver&&this.buttonObserver.disconnect(),this.wasGenerating=this.getSendStopButton().isGenerating,this.buttonObserver=new MutationObserver(()=>{const{isGenerating:e}=this.getSendStopButton();this.wasGenerating&&!e?(this.wasGenerating=!1,window.setTimeout(()=>{t()},1500)):!this.wasGenerating&&e&&(this.wasGenerating=!0)}),this.buttonObserver.observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["aria-label","disabled","class"]}),()=>{this.buttonObserver&&(this.buttonObserver.disconnect(),this.buttonObserver=null)}}static getInputElement(){const t=['rich-textarea [contenteditable="true"]',"rich-textarea",'div[contenteditable="true"][role="textbox"]','div[contenteditable="true"]','textarea[aria-label*="Prompt"]','textarea[aria-label*="提示"]',"textarea"];for(const e of t){const r=document.querySelector(e);if(r)return r}return null}static getTopBar(){const t=["header","mat-toolbar",'div[role="banner"]',".top-bar","div.header-container","div.app-bar"];for(const e of t){const r=document.querySelector(e);if(r)return r}return null}static observeSidebar(t){const e=document.querySelector('mat-sidenav, nav[role="navigation"], .side-nav-container, .side-nav');if(!e)return()=>{};const r=()=>{const a=e.getBoundingClientRect(),s=a.width>80;t(a.width,s)};r();const i=new ResizeObserver(()=>r());return i.observe(e),()=>i.disconnect()}static getTheme(){return document.body.classList.contains("dark-theme")||document.documentElement.classList.contains("dark-theme")||document.body.getAttribute("data-theme")==="dark"||document.documentElement.getAttribute("data-theme")==="dark"||document.body.classList.contains("theme-dark")?"dark":"light"}static observeTheme(t){let e=this.getTheme();t(e);const r=new MutationObserver(()=>{const i=this.getTheme();i!==e&&(e=i,t(i))});return r.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme"]}),r.observe(document.body,{attributes:!0,attributeFilter:["class","data-theme"]}),()=>r.disconnect()}}l(p,"turnObserver",null),l(p,"debounceTimer",null),l(p,"buttonObserver",null),l(p,"wasGenerating",!1);class A{constructor(){l(this,"host",null);l(this,"shadow",null);l(this,"turns",[]);l(this,"activeTurnIndex",1);l(this,"intersectionObserver",null);l(this,"searchQuery","");l(this,"filterMode","all");l(this,"starredTurnIds",new Set);l(this,"isExpanded",!1);l(this,"conversationId","");this.conversationId=p.getConversationId()}async init(){this.starredTurnIds=new Set(await h.getStars(this.conversationId)),this.mount(),this.bindObservers()}mount(){const{host:t,root:e}=m.createShadowHost("gemini-copilot-timeline-host",this.getStyles());this.host=t,this.shadow=e,p.observeTheme(r=>{this.host&&this.host.setAttribute("data-theme",r)}),this.render()}bindObservers(){p.observeConversation(t=>{this.turns=t.map(e=>({...e,isStarred:this.starredTurnIds.has(e.id)})),this.setupIntersectionObserver(),this.render()}),m.onRoute(async()=>{this.conversationId=p.getConversationId(),this.starredTurnIds=new Set(await h.getStars(this.conversationId)),this.turns=p.getTurns().map(t=>({...t,isStarred:this.starredTurnIds.has(t.id)})),this.activeTurnIndex=1,this.setupIntersectionObserver(),this.render()})}setupIntersectionObserver(){this.intersectionObserver&&this.intersectionObserver.disconnect(),this.intersectionObserver=new IntersectionObserver(t=>{for(const e of t)if(e.isIntersecting){const r=e.target.getAttribute("id")||e.target.getAttribute("data-turn-id"),i=this.turns.find(a=>a.id===r||a.element===e.target);i&&i.index!==this.activeTurnIndex&&(this.activeTurnIndex=i.index,this.updateActiveDot())}},{rootMargin:"-15% 0px -65% 0px",threshold:.1}),this.turns.forEach(t=>{var e;t.element&&((e=this.intersectionObserver)==null||e.observe(t.element))})}scrollToTurn(t){t.element&&(t.element.scrollIntoView({behavior:"smooth",block:"start"}),t.element.classList.remove("gemini-copilot-highlight-flash"),t.element.offsetWidth,t.element.classList.add("gemini-copilot-highlight-flash"),window.setTimeout(()=>{var e;(e=t.element)==null||e.classList.remove("gemini-copilot-highlight-flash")},1300))}async toggleStarTurn(t,e){e.stopPropagation();const r=await h.toggleStar(this.conversationId,t.id);r?this.starredTurnIds.add(t.id):this.starredTurnIds.delete(t.id),t.isStarred=r,this.render()}updateActiveDot(){if(!this.shadow)return;this.shadow.querySelectorAll(".nav-dot").forEach(e=>{parseInt(e.getAttribute("data-index")||"0",10)===this.activeTurnIndex?e.classList.add("active"):e.classList.remove("active")})}getFilteredTurns(){return this.turns.filter(t=>{if(this.filterMode==="code"&&!t.hasCode||this.filterMode==="math"&&!t.hasMath||this.filterMode==="starred"&&!t.isStarred)return!1;if(this.searchQuery.trim()){const e=this.searchQuery.toLowerCase(),r=t.userPrompt.toLowerCase().includes(e),i=t.modelResponse.toLowerCase().includes(e);return r||i}return!0})}render(){if(!this.shadow)return;let t=this.shadow.querySelector(".timeline-root");if(t||(t=document.createElement("div"),t.className="timeline-root",this.shadow.appendChild(t)),this.turns.length===0){t.innerHTML="";return}const e=this.getFilteredTurns();t.innerHTML=`
      <div class="timeline-container ${this.isExpanded?"expanded":"collapsed"}">
        <!-- Slim Rail Track -->
        <div class="rail-track" title="对话时间轴 (${this.turns.length} 轮次)">
          <button class="expand-toggle-btn" aria-label="展开/收起时间轴">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${this.isExpanded?'<polyline points="9 18 15 12 9 6"></polyline>':'<polyline points="15 18 9 12 15 6"></polyline>'}
            </svg>
          </button>
          <div class="dots-list">
            ${this.turns.map(r=>`
              <div class="dot-wrapper" data-index="${r.index}">
                <div class="nav-dot ${r.index===this.activeTurnIndex?"active":""} ${r.isStarred?"starred":""}" 
                     data-index="${r.index}"></div>
                <div class="dot-tooltip">
                  <span class="tooltip-num">#${r.index}</span>
                  <span class="tooltip-text">${this.escapeHtml(r.userSnippet)}</span>
                  ${r.hasCode?'<span class="tag tag-code">&lt;/&gt;</span>':""}
                  ${r.hasMath?'<span class="tag tag-math">&sum;</span>':""}
                  ${r.isStarred?'<span class="tag tag-star">&starf;</span>':""}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Expanded Full Panel -->
        ${this.isExpanded?`
          <div class="expanded-panel">
            <div class="panel-header">
              <span class="panel-title">对话时间轴 (${this.turns.length} 轮)</span>
              <button class="panel-close-btn">&times;</button>
            </div>
            
            <!-- Filter & Search Toolbar -->
            <div class="panel-toolbar">
              <input type="text" class="search-input" placeholder="按关键词过滤轮次..." value="${this.escapeHtml(this.searchQuery)}" />
              <div class="filter-tabs">
                <button class="filter-btn ${this.filterMode==="all"?"active":""}" data-mode="all">全部</button>
                <button class="filter-btn ${this.filterMode==="code"?"active":""}" data-mode="code">&lt;/&gt; 代码</button>
                <button class="filter-btn ${this.filterMode==="math"?"active":""}" data-mode="math">&sum; 公式</button>
                <button class="filter-btn ${this.filterMode==="starred"?"active":""}" data-mode="starred">&starf; 星标</button>
              </div>
            </div>

            <!-- Turn Cards List -->
            <div class="turn-cards-list">
              ${e.length===0?'<div class="empty-state">无匹配轮次</div>':e.map(r=>`
                <div class="turn-card ${r.index===this.activeTurnIndex?"active":""}" data-turn-id="${r.id}" data-index="${r.index}">
                  <div class="card-top">
                    <span class="card-num">#${r.index}</span>
                    <div class="card-badges">
                      ${r.hasCode?'<span class="tag tag-code" title="含代码块">&lt;/&gt;</span>':""}
                      ${r.hasMath?'<span class="tag tag-math" title="含数学公式">&sum;</span>':""}
                      <button class="star-btn ${r.isStarred?"starred":""}" title="${r.isStarred?"取消星标":"星标此轮"}">
                        ${r.isStarred?"★":"☆"}
                      </button>
                    </div>
                  </div>
                  <div class="card-snippet">${this.escapeHtml(r.userSnippet)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        `:""}
      </div>
    `,this.bindEvents(t)}bindEvents(t){const e=t.querySelector(".expand-toggle-btn");e==null||e.addEventListener("click",()=>{this.isExpanded=!this.isExpanded,this.render()});const r=t.querySelector(".panel-close-btn");r==null||r.addEventListener("click",()=>{this.isExpanded=!1,this.render()}),t.querySelectorAll(".dot-wrapper").forEach(a=>{a.addEventListener("click",()=>{const s=parseInt(a.getAttribute("data-index")||"1",10),o=this.turns.find(n=>n.index===s);o&&(this.activeTurnIndex=s,this.updateActiveDot(),this.scrollToTurn(o))})});const i=t.querySelector(".search-input");i==null||i.addEventListener("input",a=>{var o;this.searchQuery=a.target.value,this.render();const s=(o=this.shadow)==null?void 0:o.querySelector(".search-input");s&&(s.focus(),s.setSelectionRange(s.value.length,s.value.length))}),t.querySelectorAll(".filter-btn").forEach(a=>{a.addEventListener("click",()=>{this.filterMode=a.getAttribute("data-mode")||"all",this.render()})}),t.querySelectorAll(".turn-card").forEach(a=>{a.addEventListener("click",()=>{const o=parseInt(a.getAttribute("data-index")||"1",10),n=this.turns.find(c=>c.index===o);n&&(this.activeTurnIndex=o,this.updateActiveDot(),this.scrollToTurn(n))});const s=a.querySelector(".star-btn");s==null||s.addEventListener("click",o=>{const n=parseInt(a.getAttribute("data-index")||"1",10),c=this.turns.find(b=>b.index===n);c&&this.toggleStarTurn(c,o)})})}escapeHtml(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}getStyles(){return`
      :host {
        --paper: #FFFFFF;
        --ink: #111827;
        --ink2: #374151;
        --mute: #6B7280;
        --hair: #E5E7EB;
        --accent: #1D4ED8;
        --accent-bg: #EFF6FF;
        --emerald: #047857;
        --amber: #D97706;
        --star: #F59E0B;
        --bg-panel: rgba(255, 255, 255, 0.96);
        --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.08);
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
      }

      :host([data-theme="dark"]) {
        --paper: #18191B;
        --ink: #F9FAFB;
        --ink2: #E5E7EB;
        --mute: #9CA3AF;
        --hair: #2E3035;
        --accent: #3B82F6;
        --accent-bg: rgba(59, 130, 246, 0.15);
        --emerald: #10B981;
        --amber: #F59E0B;
        --bg-panel: rgba(24, 25, 27, 0.96);
        --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.4);
      }

      .timeline-root {
        position: fixed;
        top: 80px;
        right: 12px;
        z-index: 99999;
        display: flex;
        pointer-events: auto;
      }

      .timeline-container {
        display: flex;
        flex-direction: row-reverse;
        align-items: flex-start;
      }

      /* Slim Rail */
      .rail-track {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--bg-panel);
        border: 1px solid var(--hair);
        border-radius: 20px;
        padding: 8px 4px;
        backdrop-filter: blur(8px);
        box-shadow: var(--shadow);
      }

      .expand-toggle-btn {
        background: transparent;
        border: none;
        color: var(--mute);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
        transition: color 0.15s, background 0.15s;
      }
      .expand-toggle-btn:hover {
        color: var(--ink);
        background: var(--hair);
      }

      .dots-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: calc(100vh - 160px);
        overflow-y: auto;
        padding: 2px;
      }
      .dots-list::-webkit-scrollbar {
        width: 3px;
      }
      .dots-list::-webkit-scrollbar-thumb {
        background: var(--hair);
        border-radius: 2px;
      }

      .dot-wrapper {
        position: relative;
        cursor: pointer;
        padding: 2px;
      }

      .nav-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--mute);
        opacity: 0.5;
        transition: transform 0.15s, background 0.15s, opacity 0.15s;
      }
      .nav-dot:hover {
        transform: scale(1.5);
        opacity: 0.9;
        background: var(--accent);
      }
      .nav-dot.active {
        width: 10px;
        height: 10px;
        background: var(--accent);
        opacity: 1;
        box-shadow: 0 0 0 3px var(--accent-bg);
      }
      .nav-dot.starred {
        background: var(--star);
        opacity: 1;
      }

      /* Hover Tooltip */
      .dot-tooltip {
        position: absolute;
        right: 24px;
        top: 50%;
        transform: translateY(-50%);
        background: var(--paper);
        color: var(--ink);
        border: 1px solid var(--hair);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12.5px;
        line-height: 1.4;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s, transform 0.15s;
        box-shadow: var(--shadow);
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: 260px;
        z-index: 100000;
      }
      .dot-wrapper:hover .dot-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateY(-50%) translateX(-4px);
      }
      .tooltip-num {
        font-weight: 700;
        color: var(--accent);
      }
      .tooltip-text {
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--ink2);
      }

      /* Expanded Panel */
      .expanded-panel {
        width: 320px;
        background: var(--bg-panel);
        border: 1px solid var(--hair);
        border-radius: 12px;
        margin-right: 8px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 140px);
        overflow: hidden;
      }

      .panel-header {
        padding: 12px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--hair);
      }
      .panel-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--ink);
      }
      .panel-close-btn {
        background: transparent;
        border: none;
        font-size: 18px;
        color: var(--mute);
        cursor: pointer;
        padding: 0 4px;
        border-radius: 4px;
      }
      .panel-close-btn:hover {
        color: var(--ink);
        background: var(--hair);
      }

      .panel-toolbar {
        padding: 10px 14px;
        border-bottom: 1px solid var(--hair);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .search-input {
        width: 100%;
        box-sizing: border-box;
        padding: 7px 10px;
        border: 1px solid var(--hair);
        border-radius: 6px;
        font-size: 13px;
        color: var(--ink);
        background: var(--paper);
        outline: none;
        transition: border-color 0.15s;
      }
      .search-input:focus {
        border-color: var(--accent);
      }

      .filter-tabs {
        display: flex;
        gap: 4px;
        overflow-x: auto;
      }
      .filter-btn {
        background: var(--hair);
        border: none;
        color: var(--ink2);
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11.5px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        white-space: nowrap;
      }
      .filter-btn:hover {
        background: var(--accent-bg);
        color: var(--accent);
      }
      .filter-btn.active {
        background: var(--accent);
        color: #FFFFFF;
      }

      .turn-cards-list {
        padding: 8px 10px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .turn-cards-list::-webkit-scrollbar {
        width: 4px;
      }
      .turn-cards-list::-webkit-scrollbar-thumb {
        background: var(--hair);
        border-radius: 2px;
      }

      .turn-card {
        padding: 8px 10px;
        border: 1px solid var(--hair);
        border-radius: 8px;
        background: var(--paper);
        cursor: pointer;
        transition: border-color 0.15s, transform 0.1s, box-shadow 0.15s;
      }
      .turn-card:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
      .turn-card.active {
        border-color: var(--accent);
        background: var(--accent-bg);
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .card-num {
        font-size: 12px;
        font-weight: 700;
        color: var(--accent);
      }
      .card-badges {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .card-snippet {
        font-size: 12.5px;
        color: var(--ink2);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .tag {
        font-size: 10.5px;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 3px;
        display: inline-flex;
        align-items: center;
      }
      .tag-code {
        background: #F3F4F6;
        color: #1F2937;
      }
      .tag-math {
        background: #EEF2FF;
        color: #4338CA;
      }
      .tag-star {
        color: var(--star);
      }

      .star-btn {
        background: transparent;
        border: none;
        color: var(--mute);
        font-size: 14px;
        cursor: pointer;
        padding: 0 2px;
        line-height: 1;
        transition: color 0.15s;
      }
      .star-btn:hover, .star-btn.starred {
        color: var(--star);
      }

      .empty-state {
        padding: 24px 0;
        text-align: center;
        font-size: 13px;
        color: var(--mute);
      }
    `}}class y{static async sendToBackground(t){try{return await chrome.runtime.sendMessage(t)||{success:!1,error:"No response received"}}catch(e){return console.warn("[Gemini Copilot Bus] Failed to send message to background:",e),{success:!1,error:e.message||String(e)}}}static async broadcastToGeminiTabs(t){try{const e=await chrome.tabs.query({url:"*://gemini.google.com/*"});for(const r of e)r.id&&chrome.tabs.sendMessage(r.id,t).catch(()=>{})}catch(e){console.warn("[Gemini Copilot Bus] Broadcast to tabs failed:",e)}}static onMessage(t){const e=(r,i,a)=>{const s=t(r,i);if(s instanceof Promise)return s.then(o=>a(o||{success:!0})).catch(o=>a({success:!1,error:(o==null?void 0:o.message)||String(o)})),!0;if(s!==void 0)return a(s),!1};return chrome.runtime.onMessage.addListener(e),()=>chrome.runtime.onMessage.removeListener(e)}}function L(d){return d?d.replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim():""}function k(d){const t=d.match(new RegExp("(?:(?<!counter-)重置时间|将于|Resets?\\s+(?:at|in))[:：\\s]*([0-9]{1,2}月[0-9]{1,2}日\\s*[0-9]{1,2}:[0-9]{2}|[0-9]{1,2}:[0-9]{2}(?:\\s*[AP]M)?|[0-9]+\\s*(?:hours?|mins?|分|小时|天)[^\\n\\r<]{0,12})","i"));return t?t[1].trim():null}function E(d){const t={periodType:"current"};try{const e=L(d);if(!e||e.length===0)return t;const r=e.match(/(?:当前用量|Current\s*usage)[\s\S]*?(?=(?:每周限额|Weekly\s*limit)|方案|$)/i),i=r?r[0]:e,a=i.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i)||i.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i)||e.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);if(a&&a[1]){const n=parseFloat(a[1]);!isNaN(n)&&n>=0&&n<=100&&(t.percentage=n)}const s=k(i)||k(e);s&&(t.resetTimeText=`重置时间：${s}`);const o=e.match(/(?:每周限额|Weekly\s*limit)[\s\S]*?(?=方案|$)/i);if(o){const n=o[0],c=n.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i)||n.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i);c&&c[1]&&(t.weeklyPercentage=parseFloat(c[1]));const b=k(n);b&&(t.weeklyResetTimeText=`每周重置：${b}`)}if(t.percentage!==void 0){let n="ok";t.percentage>=90?n="danger":t.percentage>=70&&(n="warning"),t.status=n}}catch(e){console.warn("[Gemini Copilot Parser] Error parsing usage text:",e)}return t}let S=!1,T=null;class C{static async fetch(){return S&&T||(S=!0,T=new Promise(t=>{let e=null,r=null,i=null;const a=()=>{r&&(window.clearInterval(r),r=null),i&&(window.clearTimeout(i),i=null),e&&e.parentNode&&(e.parentNode.removeChild(e),e=null),S=!1,T=null};try{e=document.createElement("iframe"),e.src="https://gemini.google.com/usage",e.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:none;";const s=Date.now(),o=async()=>{if(!(!e||!e.contentDocument||!e.contentDocument.body)){try{const n=e.contentDocument.body.innerText||"";if(n.includes("已使用")||n.includes("当前用量")||n.includes("用量限额")||n.includes("Weekly limit")||n.includes("Current usage")){const c=E(n);if(c.percentage!==void 0){const b={percentage:c.percentage,usedPercentage:c.percentage,remainingPercentage:Math.max(0,100-c.percentage),resetTimeText:c.resetTimeText||"今日结束前重置",weeklyPercentage:c.weeklyPercentage,weeklyResetTimeText:c.weeklyResetTimeText,periodType:"current",status:c.status||"ok",lastUpdated:Date.now()};a(),await h.saveQuota(b),await y.broadcastToGeminiTabs({type:"QUOTA_UPDATED",data:b}),t(b);return}}}catch{}Date.now()-s>4e3&&(a(),t(null))}};e.onload=()=>{r=window.setInterval(o,250),o()},e.onerror=()=>{a(),t(null)},i=window.setTimeout(()=>{a(),t(null)},5e3),document.body.appendChild(e)}catch{a(),t(null)}})),T}}class M{constructor(){l(this,"host",null);l(this,"shadow",null);l(this,"quota",null);l(this,"settings",null);l(this,"isCardOpen",!1);l(this,"isRefreshing",!1);l(this,"pollingTimer",null);l(this,"isVisible",!0);l(this,"position",{x:24,y:Math.max(20,window.innerHeight-90)});l(this,"isDragging",!1);l(this,"dragMoved",!1);l(this,"justDragged",!1)}async init(){this.settings=await h.getSettings(),this.isVisible=this.settings.pillVisible,this.quota=await h.getCachedQuota();const t=await h.getPillPosition();t&&typeof t.x=="number"&&typeof t.y=="number"?this.position=t:this.position={x:24,y:Math.max(20,window.innerHeight-90)},this.mount(),this.bindEvents(),this.startSmartPolling(),this.refreshQuota(!1)}mount(){const{host:t,root:e}=m.createShadowHost("gemini-copilot-quota-host",this.getStyles());this.host=t,this.shadow=e,this.applyPosition(),p.observeTheme(r=>{this.host&&this.host.setAttribute("data-theme",r)}),window.addEventListener("resize",()=>{this.applyPosition()}),this.render()}applyPosition(){if(!this.host)return;const t=135,e=36,r=Math.max(10,window.innerWidth-t-10),i=Math.max(10,window.innerHeight-e-10),a=Math.max(10,Math.min(r,this.position.x)),s=Math.max(10,Math.min(i,this.position.y));this.position={x:a,y:s},this.host.style.left=`${a}px`,this.host.style.top=`${s}px`,this.host.style.bottom="auto",this.host.style.right="auto";const o=s>window.innerHeight/2,n=a>window.innerWidth/2;this.host.setAttribute("data-v-align",o?"up":"down"),this.host.setAttribute("data-h-align",n?"right":"left")}bindEvents(){p.observeReplyFinish(()=>{console.log("[Gemini Copilot Quota] Model reply finished, triggering quota refresh..."),this.refreshQuota(!0)}),window.addEventListener("keydown",t=>{t.altKey&&(t.key==="u"||t.key==="U")&&(t.preventDefault(),this.toggleVisibility())}),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"?(console.log("[Gemini Copilot Quota] Tab focused, checking quota..."),this.startSmartPolling(),this.refreshQuota(!1)):(console.log("[Gemini Copilot Quota] Tab hidden, pausing polling timer."),this.stopSmartPolling())}),y.onMessage(t=>{t.type==="QUOTA_UPDATED"&&(this.quota=t.data,this.render())}),h.onSettingsChange(t=>{this.settings=t,this.isVisible=t.pillVisible,this.startSmartPolling(),this.render()})}startSmartPolling(){var r;this.stopSmartPolling();const t=((r=this.settings)==null?void 0:r.autoRefreshInterval)||45,e=Math.max(15,t)*1e3;this.pollingTimer=window.setInterval(()=>{document.visibilityState==="visible"&&this.refreshQuota(!1)},e)}stopSmartPolling(){this.pollingTimer&&(window.clearInterval(this.pollingTimer),this.pollingTimer=null)}async refreshQuota(t=!0){if(!this.isRefreshing){this.isRefreshing=!0,this.render();try{const e=await y.sendToBackground({type:"GET_QUOTA",force:t});if(e.success&&e.data&&e.data.percentage>0)this.quota=e.data;else{const r=await C.fetch();r&&r.percentage!==void 0?this.quota=r:e.data&&(this.quota=e.data)}}catch(e){console.warn("[Gemini Copilot Quota] Background refresh failed, trying iframe fallback:",e);try{const r=await C.fetch();r&&(this.quota=r)}catch{}}finally{this.isRefreshing=!1,this.render()}}}async toggleVisibility(){this.isVisible=!this.isVisible,this.settings&&(this.settings.pillVisible=this.isVisible,await h.saveSettings({pillVisible:this.isVisible})),this.render()}render(){var a,s,o,n,c;if(!this.shadow)return;let t=this.shadow.querySelector(".quota-root");if(t||(t=document.createElement("div"),t.className="quota-root",this.shadow.appendChild(t)),!this.isVisible){t.innerHTML="";return}const e=this.quota?Math.round(this.quota.percentage):0,r=((a=this.quota)==null?void 0:a.status)||"ok",i=`status-${r}`;t.innerHTML=`
      <div class="quota-container">
        <!-- Freely Draggable Capsule Pill -->
        <button class="quota-pill ${i} ${this.isRefreshing?"refreshing":""}" 
                type="button"
                title="Gemini 限额用量: ${e}% (按住可自由拖拽位置，点击展开明细，快捷键 Alt+U 显隐)">
          <span class="pill-drag-handle" title="拖拽调整位置">⋮⋮</span>
          <span class="pill-sparkle">✦</span>
          <span class="pill-text">${e}% 用量</span>
          <div class="pill-bar-track">
            <div class="pill-bar-fill ${i}" style="width: ${Math.min(100,Math.max(3,e))}%;"></div>
          </div>
          ${this.isRefreshing?'<span class="pill-spinner"></span>':""}
        </button>

        <!-- Adaptive Popover Details Card -->
        ${this.isCardOpen?`
          <div class="quota-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-icon">⚡</span>
                <span class="card-title">Gemini 限额用量明细</span>
              </div>
              <button class="card-close-btn" type="button" title="关闭">&times;</button>
            </div>

            <div class="card-body">
              <!-- Big Percentage Display -->
              <div class="metric-row">
                <div class="metric-num ${i}">${e}%</div>
                <div class="metric-meta">
                  <span class="metric-label">当前用量消耗</span>
                  <span class="metric-status-badge ${i}">
                    ${r==="danger"?"严重不足":r==="warning"?"接近上限":r==="rate_limited"?"限流中":"额度充裕"}
                  </span>
                </div>
              </div>

              <!-- Horizontal Progress Bar -->
              <div class="progress-track">
                <div class="progress-fill ${i}" style="width: ${Math.min(100,e)}%;"></div>
              </div>

              <!-- Details Stats Grid -->
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">今日重置</span>
                  <span class="stat-value">${((s=this.quota)==null?void 0:s.resetTimeText)||"今日定时重置"}</span>
                </div>
                ${((o=this.quota)==null?void 0:o.weeklyPercentage)!==void 0?`
                  <div class="stat-item">
                    <span class="stat-label">每周限额</span>
                    <span class="stat-value">已使用 ${this.quota.weeklyPercentage}%</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">周限额重置</span>
                    <span class="stat-value">${this.quota.weeklyResetTimeText||"每周定时重置"}</span>
                  </div>
                `:""}
                <div class="stat-item">
                  <span class="stat-label">上次更新</span>
                  <span class="stat-value">${(n=this.quota)!=null&&n.lastUpdated?new Date(this.quota.lastUpdated).toLocaleTimeString():"刚刚"}</span>
                </div>
              </div>

              ${(c=this.quota)!=null&&c.errorMessage?`
                <div class="error-notice">
                  <span>⚠️ ${this.escapeHtml(this.quota.errorMessage)}</span>
                </div>
              `:""}
            </div>

            <div class="card-footer">
              <button class="refresh-btn ${this.isRefreshing?"disabled":""}" type="button">
                <span class="refresh-icon ${this.isRefreshing?"spin":""}">↻</span>
                <span>${this.isRefreshing?"正在同步...":"立即刷新"}</span>
              </button>
              <a href="https://gemini.google.com/usage" target="_blank" class="link-usage" rel="noopener noreferrer">
                官方用量页 &rarr;
              </a>
            </div>
            <div class="shortcut-tip">提示：按住胶囊可拖拽，按 <code>Alt + U</code> 可随时隐藏</div>
          </div>
        `:""}
      </div>
    `,this.bindComponentEvents(t)}bindComponentEvents(t){const e=t.querySelector(".quota-pill");if(!e)return;this.setupDraggable(e),e.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),!(this.justDragged||this.isDragging)&&(this.isCardOpen=!this.isCardOpen,this.applyPosition(),this.render())});const r=t.querySelector(".card-close-btn");r==null||r.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),this.isCardOpen=!1,this.render()});const i=t.querySelector(".refresh-btn");i==null||i.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),this.refreshQuota(!0)}),this.isCardOpen&&window.setTimeout(()=>{const a=s=>{if(!this.isCardOpen||!this.host)return;(s.composedPath?s.composedPath():[]).includes(this.host)||(this.isCardOpen=!1,this.render(),document.removeEventListener("click",a))};document.addEventListener("click",a)},50)}setupDraggable(t){let e=0,r=0,i={x:0,y:0};const a=s=>{if(s.button!==0)return;e=s.clientX,r=s.clientY,i={...this.position},this.dragMoved=!1;const o=c=>{var x;const b=c.clientX-e,g=c.clientY-r;!this.dragMoved&&Math.hypot(b,g)>4&&(this.dragMoved=!0,this.isDragging=!0,(x=this.host)==null||x.classList.add("is-dragging"),this.isCardOpen&&(this.isCardOpen=!1,this.render())),this.isDragging&&(this.position={x:i.x+b,y:i.y+g},this.applyPosition())},n=async()=>{var c;window.removeEventListener("mousemove",o),window.removeEventListener("mouseup",n),this.isDragging&&(this.isDragging=!1,(c=this.host)==null||c.classList.remove("is-dragging"),this.justDragged=!0,window.setTimeout(()=>{this.justDragged=!1},120),await h.savePillPosition(this.position))};window.addEventListener("mousemove",o),window.addEventListener("mouseup",n)};t.addEventListener("mousedown",a)}escapeHtml(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}getStyles(){return`
      :host {
        --paper: #FFFFFF;
        --ink: #111827;
        --ink2: #374151;
        --mute: #6B7280;
        --hair: #E5E7EB;
        --accent: #1D4ED8;
        --emerald: #047857;
        --emerald-bg: #ECFDF5;
        --emerald-border: #A7F3D0;
        --amber: #D97706;
        --amber-bg: #FFFBEB;
        --amber-border: #FDE68A;
        --red: #DC2626;
        --red-bg: #FEF2F2;
        --red-border: #FECACA;
        --bg-panel: rgba(255, 255, 255, 0.98);
        --shadow: 0 10px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);

        display: block !important;
        position: fixed !important;
        z-index: 99999 !important;
        pointer-events: auto !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
        touch-action: none;
      }

      :host([data-theme="dark"]) {
        --paper: #18191B;
        --ink: #F9FAFB;
        --ink2: #E5E7EB;
        --mute: #9CA3AF;
        --hair: #2E3035;
        --accent: #3B82F6;
        --emerald: #10B981;
        --emerald-bg: rgba(16, 185, 129, 0.15);
        --emerald-border: rgba(16, 185, 129, 0.3);
        --amber: #F59E0B;
        --amber-bg: rgba(245, 158, 11, 0.15);
        --amber-border: rgba(245, 158, 11, 0.3);
        --red: #EF4444;
        --red-bg: rgba(239, 68, 68, 0.15);
        --red-border: rgba(239, 68, 68, 0.3);
        --bg-panel: rgba(24, 25, 27, 0.98);
        --shadow: 0 10px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .quota-root {
        position: relative;
        display: inline-flex;
        align-items: center;
        pointer-events: auto;
      }

      .quota-container {
        position: relative;
        display: inline-flex;
      }

      /* Capsule Pill with Grab Cursor */
      .quota-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: grab !important;
        background: var(--paper);
        border: 1px solid var(--hair);
        color: var(--ink);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        outline: none;
        user-select: none;
        pointer-events: auto !important;
      }
      .quota-pill:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
      }
      .quota-pill:active, :host(.is-dragging) .quota-pill {
        cursor: grabbing !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22) !important;
        transform: scale(1.02);
      }

      .pill-drag-handle {
        font-size: 11px;
        color: var(--mute);
        opacity: 0.6;
        letter-spacing: -1px;
        margin-right: 1px;
      }

      .quota-pill.status-ok {
        background: var(--emerald-bg);
        border-color: var(--emerald-border);
        color: var(--emerald);
      }
      .quota-pill.status-warning {
        background: var(--amber-bg);
        border-color: var(--amber-border);
        color: var(--amber);
      }
      .quota-pill.status-danger, .quota-pill.status-rate_limited {
        background: var(--red-bg);
        border-color: var(--red-border);
        color: var(--red);
      }

      .pill-sparkle {
        font-size: 11px;
      }

      .pill-bar-track {
        width: 38px;
        height: 5px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      :host([data-theme="dark"]) .pill-bar-track {
        background: rgba(255, 255, 255, 0.12);
      }

      .pill-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .pill-bar-fill.status-ok { background: var(--emerald); }
      .pill-bar-fill.status-warning { background: var(--amber); }
      .pill-bar-fill.status-danger, .pill-bar-fill.status-rate_limited { background: var(--red); }

      .pill-spinner {
        width: 10px;
        height: 10px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      /* Adaptive Details Card */
      .quota-card {
        position: absolute;
        width: 310px;
        max-height: 80vh;
        background: var(--bg-panel);
        border: 1px solid var(--hair);
        border-radius: 12px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
        z-index: 100000;
        overflow: hidden;
        animation: cardPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto !important;
      }

      /* Upward (when pill is in lower half) */
      :host([data-v-align="up"]) .quota-card {
        bottom: calc(100% + 10px);
        top: auto;
      }
      /* Downward (when pill is in upper half) */
      :host([data-v-align="down"]) .quota-card {
        top: calc(100% + 10px);
        bottom: auto;
      }
      /* Left-aligned (when pill is on left half) */
      :host([data-h-align="left"]) .quota-card {
        left: 0;
        right: auto;
      }
      /* Right-aligned (when pill is on right half) */
      :host([data-h-align="right"]) .quota-card {
        right: 0;
        left: auto;
      }

      @keyframes cardPopIn {
        from {
          opacity: 0;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .card-header {
        padding: 12px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--hair);
      }
      .card-title-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .card-icon {
        font-size: 14px;
      }
      .card-title {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--ink);
      }
      .card-close-btn {
        background: transparent;
        border: none;
        font-size: 18px;
        color: var(--mute);
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .card-close-btn:hover {
        color: var(--ink);
      }

      .card-body {
        padding: 14px;
      }

      .metric-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .metric-num {
        font-size: 26px;
        font-weight: 800;
        line-height: 1;
      }
      .metric-num.status-ok { color: var(--emerald); }
      .metric-num.status-warning { color: var(--amber); }
      .metric-num.status-danger, .metric-num.status-rate_limited { color: var(--red); }

      .metric-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }
      .metric-label {
        font-size: 11.5px;
        color: var(--mute);
      }
      .metric-status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 10px;
      }
      .metric-status-badge.status-ok {
        background: var(--emerald-bg);
        color: var(--emerald);
      }
      .metric-status-badge.status-warning {
        background: var(--amber-bg);
        color: var(--amber);
      }
      .metric-status-badge.status-danger, .metric-status-badge.status-rate_limited {
        background: var(--red-bg);
        color: var(--red);
      }

      .progress-track {
        width: 100%;
        height: 7px;
        background: rgba(0, 0, 0, 0.08);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      :host([data-theme="dark"]) .progress-track {
        background: rgba(255, 255, 255, 0.12);
      }
      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      .progress-fill.status-ok { background: var(--emerald); }
      .progress-fill.status-warning { background: var(--amber); }
      .progress-fill.status-danger, .progress-fill.status-rate_limited { background: var(--red); }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding-top: 10px;
        border-top: 1px solid var(--hair);
      }
      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .stat-label {
        font-size: 11px;
        color: var(--mute);
      }
      .stat-value {
        font-size: 12px;
        font-weight: 600;
        color: var(--ink);
      }

      .error-notice {
        margin-top: 10px;
        padding: 6px 10px;
        background: var(--amber-bg);
        border: 1px solid var(--amber-border);
        border-radius: 6px;
        color: var(--amber);
        font-size: 11.5px;
        line-height: 1.4;
      }

      .card-footer {
        padding: 10px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(0, 0, 0, 0.02);
        border-top: 1px solid var(--hair);
      }
      :host([data-theme="dark"]) .card-footer {
        background: rgba(255, 255, 255, 0.02);
      }

      .refresh-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: var(--paper);
        border: 1px solid var(--hair);
        border-radius: 6px;
        color: var(--ink);
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .refresh-btn:hover {
        background: var(--hair);
      }
      .refresh-btn.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .refresh-icon.spin {
        animation: spin 0.8s linear infinite;
      }

      .link-usage {
        font-size: 12px;
        color: var(--accent);
        text-decoration: none;
        font-weight: 500;
      }
      .link-usage:hover {
        text-decoration: underline;
      }

      .shortcut-tip {
        padding: 6px 14px;
        font-size: 11px;
        color: var(--mute);
        background: rgba(0, 0, 0, 0.015);
        border-top: 1px dashed var(--hair);
        text-align: center;
      }
      .shortcut-tip code {
        font-family: monospace;
        background: rgba(0, 0, 0, 0.06);
        padding: 1px 4px;
        border-radius: 3px;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}}class O{constructor(){l(this,"settings",null);l(this,"currentConversationId","");l(this,"draftDebounceTimer",null);l(this,"widescreenStyleTag",null)}async init(){this.settings=await h.getSettings(),this.currentConversationId=p.getConversationId(),this.applyWidescreen(this.settings.enableWidescreen,this.settings.widescreenWidth),this.setupDraftAndSendKeys(),this.setupLatexCopy(),m.onRoute(async()=>{this.currentConversationId=p.getConversationId(),await this.restoreDraft()}),h.onSettingsChange(t=>{this.settings=t,this.applyWidescreen(t.enableWidescreen,t.widescreenWidth)})}setupDraftAndSendKeys(){const t=()=>{const e=p.getInputElement();if(!e||e.getAttribute("data-copilot-bound")==="true")return;e.setAttribute("data-copilot-bound","true"),this.restoreDraft(),e.addEventListener("input",()=>{var i;(i=this.settings)!=null&&i.enableDraftAutoSave&&(this.draftDebounceTimer&&window.clearTimeout(this.draftDebounceTimer),this.draftDebounceTimer=window.setTimeout(async()=>{const a=this.getInputText(e);await h.saveDraft(this.currentConversationId,a)},400))}),e.addEventListener("keydown",i=>{if(!(!this.settings||this.settings.sendKeyMode!=="ctrl_enter")){if(i.key==="Enter"&&!i.ctrlKey&&!i.metaKey&&!i.shiftKey)i.stopPropagation();else if(i.key==="Enter"&&(i.ctrlKey||i.metaKey)){i.preventDefault();const{button:a}=p.getSendStopButton();a&&!a.hasAttribute("disabled")&&(a.click(),h.saveDraft(this.currentConversationId,""))}}},!0);const{button:r}=p.getSendStopButton();r==null||r.addEventListener("click",()=>{h.saveDraft(this.currentConversationId,"")})};t(),window.setInterval(t,2e3)}getInputText(t){return t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement?t.value:t.innerText||t.textContent||""}setInputText(t,e){t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement?(t.value=e,t.dispatchEvent(new Event("input",{bubbles:!0}))):(t.innerText=e,t.dispatchEvent(new Event("input",{bubbles:!0})))}async restoreDraft(){var i;if(!((i=this.settings)!=null&&i.enableDraftAutoSave))return;const t=p.getInputElement();if(!t||this.getInputText(t).trim())return;const r=await h.getDraft(this.currentConversationId);r&&r.trim()&&(this.setInputText(t,r),console.log("[Gemini Copilot] Restored draft for conversation:",this.currentConversationId))}setupLatexCopy(){const t=()=>{var r;if(!((r=this.settings)!=null&&r.enableLatexCopy))return;document.querySelectorAll(".katex, math, .math-block, [data-math]:not([data-copilot-copy])").forEach(i=>{i.setAttribute("data-copilot-copy","true"),i.style.cursor="pointer",i.title="点击复制 LaTeX 公式源码",i.addEventListener("click",a=>{a.stopPropagation();const s=this.extractLatex(i);s&&navigator.clipboard.writeText(s).then(()=>{this.showCopyToast(i,"已复制 LaTeX 源码")})})})};t(),window.setInterval(t,2500)}extractLatex(t){var a;const e=t.querySelector('annotation[encoding*="tex"]');if(e&&e.textContent)return e.textContent.trim();const r=t.getAttribute("data-math")||t.getAttribute("data-latex");if(r)return r.trim();const i=t.getAttribute("alttext");return i?i.trim():((a=t.innerText)==null?void 0:a.trim())||""}showCopyToast(t,e){const r=document.createElement("div");r.className="gemini-copilot-copy-toast",r.textContent=e,Object.assign(r.style,{position:"absolute",background:"#111827",color:"#FFFFFF",fontSize:"11px",padding:"3px 8px",borderRadius:"4px",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",zIndex:"100000",pointerEvents:"none",transition:"opacity 0.2s",opacity:"1"});const i=t.getBoundingClientRect();r.style.left=`${i.left+window.scrollX}px`,r.style.top=`${i.top+window.scrollY-24}px`,document.body.appendChild(r),window.setTimeout(()=>{r.style.opacity="0",window.setTimeout(()=>r.remove(),250)},1200)}applyWidescreen(t,e){if(!t){this.widescreenStyleTag&&(this.widescreenStyleTag.remove(),this.widescreenStyleTag=null);return}this.widescreenStyleTag||(this.widescreenStyleTag=document.createElement("style"),this.widescreenStyleTag.id="gemini-copilot-widescreen-style",document.head.appendChild(this.widescreenStyleTag));const r=e||"1200px";this.widescreenStyleTag.textContent=`
      .conversation-container,
      main .chat-history,
      chat-window,
      .chat-window-container,
      infinite-scroller,
      .bottom-container {
        max-width: ${r} !important;
        width: 100% !important;
      }
    `}}class R{static exportCurrentConversation(t){const e=p.getTurns();if(!e||e.length===0){alert("未检测到当前对话的轮次内容，无法导出。");return}const r=p.getConversationId(),i=new Date().toISOString().split("T")[0],a=`gemini-chat-${r}-${i}`;if(t==="markdown"){const s=this.generateMarkdown(e,r);this.downloadFile(`${a}.md`,s,"text/markdown;charset=utf-8")}else if(t==="json"){const s=this.generateJSON(e,r);this.downloadFile(`${a}.json`,s,"application/json;charset=utf-8")}}static generateMarkdown(t,e){const r=new Date().toLocaleString();let i=`# Gemini 对话记录

`;return i+=`- **会话编号**: \`${e}\`
`,i+=`- **导出时间**: ${r}
`,i+=`- **总轮次数**: ${t.length}

`,i+=`---

`,t.forEach(a=>{i+=`## 🧑‍💻 用户 (第 ${a.index} 轮)

`,i+=`${a.userPrompt.trim()}

`,i+=`## 🤖 Gemini

`,i+=`${a.modelResponse.trim()||"*(回复内容为空或未完全加载)*"}

`,i+=`---

`}),i+=`
*由 [Gemini Copilot](https://github.com/voyager-crew/voyager) 导出*
`,i}static generateJSON(t,e){const r={conversationId:e,exportedAt:new Date().toISOString(),totalTurns:t.length,turns:t.map(i=>({index:i.index,id:i.id,userPrompt:i.userPrompt,modelResponse:i.modelResponse,hasCode:i.hasCode,hasMath:i.hasMath,isStarred:i.isStarred}))};return JSON.stringify(r,null,2)}static downloadFile(t,e,r){const i=new Blob([e],{type:r}),a=URL.createObjectURL(i),s=document.createElement("a");s.href=a,s.download=t,document.body.appendChild(s),s.click(),window.setTimeout(()=>{document.body.removeChild(s),URL.revokeObjectURL(a)},100)}}async function I(){console.log("[Gemini Copilot] Initializing extension content script..."),m.patchHistoryNavigation(),G(),q(),m.onRoute(()=>{q()});const d=await h.getSettings();d.enableTimeline&&!window.location.pathname.includes("/usage")&&await new A().init(),d.enableQuotaPill&&await new M().init(),window.location.pathname.includes("/usage")||await new O().init(),y.onMessage(t=>{t.type==="TRIGGER_EXPORT"&&R.exportCurrentConversation(t.format)}),console.log("[Gemini Copilot] All features mounted successfully in Shadow DOM.")}function q(){if(!window.location.pathname.includes("/usage"))return;const d=async()=>{var r;const e=((r=document.body)==null?void 0:r.innerText)||"";if(e.includes("已使用")||e.includes("当前用量")||e.includes("Weekly limit")||e.includes("Current usage")){const i=E(e);if(i.percentage!==void 0){const a={percentage:i.percentage,usedPercentage:i.percentage,remainingPercentage:Math.max(0,100-i.percentage),resetTimeText:i.resetTimeText||"今日结束前重置",weeklyPercentage:i.weeklyPercentage,weeklyResetTimeText:i.weeklyResetTimeText,periodType:"current",status:i.status||"ok",lastUpdated:Date.now()};console.log("[Gemini Copilot] Synced quota directly from /usage page:",a),await h.saveQuota(a),await y.broadcastToGeminiTabs({type:"QUOTA_UPDATED",data:a})}}};d(),new MutationObserver(()=>d()).observe(document.body,{childList:!0,subtree:!0})}function G(){const d=document.createElement("style");d.id="gemini-copilot-global-styles",d.textContent=`
    @keyframes geminiCopilotFlashAnim {
      0% {
        outline: 3px solid #1D4ED8;
        outline-offset: 4px;
        box-shadow: 0 0 16px rgba(29, 78, 216, 0.4);
      }
      50% {
        outline: 3px solid #047857;
        outline-offset: 4px;
        box-shadow: 0 0 16px rgba(4, 120, 87, 0.4);
      }
      100% {
        outline: 3px solid transparent;
        outline-offset: 4px;
        box-shadow: none;
      }
    }

    .gemini-copilot-highlight-flash {
      animation: geminiCopilotFlashAnim 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important;
      border-radius: 8px !important;
    }
  `,document.head.appendChild(d)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",I):I()})();
