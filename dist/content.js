var M=Object.defineProperty;var P=(p,b,d)=>b in p?M(p,b,{enumerable:!0,configurable:!0,writable:!0,value:d}):p[b]=d;var n=(p,b,d)=>P(p,typeof b!="symbol"?b+"":b,d);(function(){"use strict";const v=class v{static patchHistoryNavigation(){if(this.isPatched)return;this.isPatched=!0;const t=history.pushState,r=history.replaceState;history.pushState=function(...e){const s=t.apply(this,e);return v.checkUrlChange(),s},history.replaceState=function(...e){const s=r.apply(this,e);return v.checkUrlChange(),s},window.addEventListener("popstate",()=>v.checkUrlChange()),window.addEventListener("hashchange",()=>v.checkUrlChange())}static checkUrlChange(){const t=window.location.href;if(t!==this.currentUrl){const r=this.currentUrl;this.currentUrl=t;for(const e of this.listeners)try{e(t,r)}catch(s){console.error("[Gemini Copilot Lifecycle] Listener error:",s)}}}static onRoute(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter(r=>r!==t)}}static createShadowHost(t,r){let e=document.getElementById(t);e||(e=document.createElement("div"),e.id=t,document.body.appendChild(e));let s=e.shadowRoot;s||(s=e.attachShadow({mode:"open"}));let i=s.querySelector("style");return i||(i=document.createElement("style"),s.appendChild(i)),i.textContent=r,{host:e,root:s}}};n(v,"isPatched",!1),n(v,"listeners",[]),n(v,"currentUrl",window.location.href);let p=v;const b={autoRefreshInterval:45,enableTimeline:!0,enableQuotaPill:!0,enableDraftAutoSave:!0,sendKeyMode:"enter",enableLatexCopy:!0,enableWidescreen:!1,widescreenWidth:"1200px",pillVisible:!0},d={SETTINGS:"gemini_copilot_settings",QUOTA:"gemini_copilot_quota",DRAFTS_PREFIX:"gemini_copilot_draft_",STARS_PREFIX:"gemini_copilot_stars_"};class u{static async getSettings(){try{const t=await chrome.storage.local.get(d.SETTINGS);if(t[d.SETTINGS])return{...b,...t[d.SETTINGS]}}catch(t){console.warn("[Gemini Copilot] Error reading settings from storage:",t)}return{...b}}static async saveSettings(t){const e={...await this.getSettings(),...t};return e.autoRefreshInterval<15&&(e.autoRefreshInterval=15),await chrome.storage.local.set({[d.SETTINGS]:e}),e}static onSettingsChange(t){const r=(e,s)=>{if(s==="local"&&e[d.SETTINGS]){const i={...b,...e[d.SETTINGS].newValue};t(i)}};return chrome.storage.onChanged.addListener(r),()=>chrome.storage.onChanged.removeListener(r)}static async getCachedQuota(){try{return(await chrome.storage.local.get(d.QUOTA))[d.QUOTA]||null}catch{return null}}static async saveQuota(t){await chrome.storage.local.set({[d.QUOTA]:t})}static async getDraft(t){if(!t)return"";try{const r=`${d.DRAFTS_PREFIX}${t}`;return(await chrome.storage.local.get(r))[r]||""}catch{return""}}static async saveDraft(t,r){if(!t)return;const e=`${d.DRAFTS_PREFIX}${t}`;r.trim()?await chrome.storage.local.set({[e]:r}):await chrome.storage.local.remove(e)}static async getStars(t){if(!t)return[];try{const r=`${d.STARS_PREFIX}${t}`,e=await chrome.storage.local.get(r);return Array.isArray(e[r])?e[r]:[]}catch{return[]}}static async toggleStar(t,r){if(!t||!r)return!1;const e=await this.getStars(t),s=e.indexOf(r);let i=!1;s>=0?(e.splice(s,1),i=!1):(e.push(r),i=!0);const a=`${d.STARS_PREFIX}${t}`;return await chrome.storage.local.set({[a]:e}),i}}class l{static getConversationId(){const r=window.location.pathname.match(/\/(?:app|c)\/([a-zA-Z0-9_-]+)/);if(r&&r[1])return r[1];const e=new URLSearchParams(window.location.search),s=e.get("c")||e.get("id");return s||"default_conversation"}static getConversationContainer(){const t=["main","chat-window","infinite-scroller",".conversation-container",'div[role="main"]',".chat-history","#chat-history"];for(const r of t){const e=document.querySelector(r);if(e)return e}return document.querySelector("main")||document.body}static getTurns(){const t=this.getConversationContainer();if(!t)return[];const r=["conversation-turn","div.conversation-turn",'div[data-message-author-role="user"]',"user-query","div.user-query-container"];let e=[];for(const i of r){const a=Array.from(t.querySelectorAll(i));if(a.length>0){e=a;break}}e.length===0&&(e=Array.from(t.querySelectorAll('user-query, [data-message-author-role="user"], .query-text')));const s=[];return e.forEach((i,a)=>{var T,k,E,C;let o=i.matches('user-query, [data-message-author-role="user"]')?i:i.querySelector('user-query, [data-message-author-role="user"], .query-text, .user-query-content'),c="";if(o?c=((T=o.innerText)==null?void 0:T.trim())||"":c=((k=i.innerText)==null?void 0:k.trim())||"",!c){const w=i.querySelector("p");c=((E=w==null?void 0:w.innerText)==null?void 0:E.trim())||`Turn ${a+1}`}const m=c.replace(/\s+/g," "),f=m.length>60?m.slice(0,57)+"...":m;let g=null,x=i.nextElementSibling;if(x&&(x.matches('model-response, [data-message-author-role="model"]')||x.querySelector("model-response")))g=x.matches("model-response")?x:x.querySelector('model-response, [data-message-author-role="model"]');else{const w=i.closest("conversation-turn, .conversation-container, .turn-container");w&&(g=w.querySelector('model-response, [data-message-author-role="model"], .model-response-text, message-content'))}let L=((C=g==null?void 0:g.innerText)==null?void 0:C.trim())||"";const O=!!(g!=null&&g.querySelector("pre, code, .code-block")||i.querySelector("pre, code")),R=!!(g!=null&&g.querySelector(".katex, .math-block, math, [data-math]")||i.querySelector(".katex, math")),D=i.getAttribute("id")||i.getAttribute("data-turn-id")||`turn-${a+1}`;s.push({id:D,index:a+1,userPrompt:c,userSnippet:f||`轮次 ${a+1}`,modelResponse:L,hasCode:O,hasMath:R,isStarred:!1,element:i,userElement:o||i,modelElement:g||void 0})}),s}static observeConversation(t){this.turnObserver&&this.turnObserver.disconnect();const r=this.getConversationContainer()||document.body;return this.turnObserver=new MutationObserver(()=>{this.debounceTimer&&window.clearTimeout(this.debounceTimer),this.debounceTimer=window.setTimeout(()=>{const e=this.getTurns();t(e)},200)}),this.turnObserver.observe(r,{childList:!0,subtree:!0,characterData:!1}),t(this.getTurns()),()=>{this.turnObserver&&(this.turnObserver.disconnect(),this.turnObserver=null),this.debounceTimer&&(window.clearTimeout(this.debounceTimer),this.debounceTimer=null)}}static getSendStopButton(){const t=['button[aria-label*="Stop"]','button[aria-label*="停止"]','button[data-test-id*="stop"]',"button.stop-generating-button",'mat-icon[fonticon="stop"]'];for(const e of t){const s=document.querySelector(e);if(s&&s.offsetParent!==null)return{isGenerating:!0,button:s.closest("button")||s}}const r=['button[aria-label*="Send"]','button[aria-label*="发送"]','button[data-test-id*="send"]',"button.send-button"];for(const e of r){const s=document.querySelector(e);if(s)return{isGenerating:!1,button:s}}return{isGenerating:!1,button:null}}static observeReplyFinish(t){return this.buttonObserver&&this.buttonObserver.disconnect(),this.wasGenerating=this.getSendStopButton().isGenerating,this.buttonObserver=new MutationObserver(()=>{const{isGenerating:r}=this.getSendStopButton();this.wasGenerating&&!r?(this.wasGenerating=!1,window.setTimeout(()=>{t()},1500)):!this.wasGenerating&&r&&(this.wasGenerating=!0)}),this.buttonObserver.observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["aria-label","disabled","class"]}),()=>{this.buttonObserver&&(this.buttonObserver.disconnect(),this.buttonObserver=null)}}static getInputElement(){const t=['rich-textarea [contenteditable="true"]',"rich-textarea",'div[contenteditable="true"][role="textbox"]','div[contenteditable="true"]','textarea[aria-label*="Prompt"]','textarea[aria-label*="提示"]',"textarea"];for(const r of t){const e=document.querySelector(r);if(e)return e}return null}static getTopBar(){const t=["header","mat-toolbar",'div[role="banner"]',".top-bar","div.header-container","div.app-bar"];for(const r of t){const e=document.querySelector(r);if(e)return e}return null}static observeSidebar(t){const r=document.querySelector('mat-sidenav, nav[role="navigation"], .side-nav-container, .side-nav');if(!r)return()=>{};const e=()=>{const i=r.getBoundingClientRect(),a=i.width>80;t(i.width,a)};e();const s=new ResizeObserver(()=>e());return s.observe(r),()=>s.disconnect()}static getTheme(){return document.body.classList.contains("dark-theme")||document.documentElement.classList.contains("dark-theme")||document.body.getAttribute("data-theme")==="dark"||document.documentElement.getAttribute("data-theme")==="dark"||document.body.classList.contains("theme-dark")?"dark":"light"}static observeTheme(t){let r=this.getTheme();t(r);const e=new MutationObserver(()=>{const s=this.getTheme();s!==r&&(r=s,t(s))});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme"]}),e.observe(document.body,{attributes:!0,attributeFilter:["class","data-theme"]}),()=>e.disconnect()}}n(l,"turnObserver",null),n(l,"debounceTimer",null),n(l,"buttonObserver",null),n(l,"wasGenerating",!1);class F{constructor(){n(this,"host",null);n(this,"shadow",null);n(this,"turns",[]);n(this,"activeTurnIndex",1);n(this,"intersectionObserver",null);n(this,"searchQuery","");n(this,"filterMode","all");n(this,"starredTurnIds",new Set);n(this,"isExpanded",!1);n(this,"conversationId","");this.conversationId=l.getConversationId()}async init(){this.starredTurnIds=new Set(await u.getStars(this.conversationId)),this.mount(),this.bindObservers()}mount(){const{host:t,root:r}=p.createShadowHost("gemini-copilot-timeline-host",this.getStyles());this.host=t,this.shadow=r,l.observeTheme(e=>{this.host&&this.host.setAttribute("data-theme",e)}),this.render()}bindObservers(){l.observeConversation(t=>{this.turns=t.map(r=>({...r,isStarred:this.starredTurnIds.has(r.id)})),this.setupIntersectionObserver(),this.render()}),p.onRoute(async()=>{this.conversationId=l.getConversationId(),this.starredTurnIds=new Set(await u.getStars(this.conversationId)),this.turns=l.getTurns().map(t=>({...t,isStarred:this.starredTurnIds.has(t.id)})),this.activeTurnIndex=1,this.setupIntersectionObserver(),this.render()})}setupIntersectionObserver(){this.intersectionObserver&&this.intersectionObserver.disconnect(),this.intersectionObserver=new IntersectionObserver(t=>{for(const r of t)if(r.isIntersecting){const e=r.target.getAttribute("id")||r.target.getAttribute("data-turn-id"),s=this.turns.find(i=>i.id===e||i.element===r.target);s&&s.index!==this.activeTurnIndex&&(this.activeTurnIndex=s.index,this.updateActiveDot())}},{rootMargin:"-15% 0px -65% 0px",threshold:.1}),this.turns.forEach(t=>{var r;t.element&&((r=this.intersectionObserver)==null||r.observe(t.element))})}scrollToTurn(t){t.element&&(t.element.scrollIntoView({behavior:"smooth",block:"start"}),t.element.classList.remove("gemini-copilot-highlight-flash"),t.element.offsetWidth,t.element.classList.add("gemini-copilot-highlight-flash"),window.setTimeout(()=>{var r;(r=t.element)==null||r.classList.remove("gemini-copilot-highlight-flash")},1300))}async toggleStarTurn(t,r){r.stopPropagation();const e=await u.toggleStar(this.conversationId,t.id);e?this.starredTurnIds.add(t.id):this.starredTurnIds.delete(t.id),t.isStarred=e,this.render()}updateActiveDot(){if(!this.shadow)return;this.shadow.querySelectorAll(".nav-dot").forEach(r=>{parseInt(r.getAttribute("data-index")||"0",10)===this.activeTurnIndex?r.classList.add("active"):r.classList.remove("active")})}getFilteredTurns(){return this.turns.filter(t=>{if(this.filterMode==="code"&&!t.hasCode||this.filterMode==="math"&&!t.hasMath||this.filterMode==="starred"&&!t.isStarred)return!1;if(this.searchQuery.trim()){const r=this.searchQuery.toLowerCase(),e=t.userPrompt.toLowerCase().includes(r),s=t.modelResponse.toLowerCase().includes(r);return e||s}return!0})}render(){if(!this.shadow)return;let t=this.shadow.querySelector(".timeline-root");if(t||(t=document.createElement("div"),t.className="timeline-root",this.shadow.appendChild(t)),this.turns.length===0){t.innerHTML="";return}const r=this.getFilteredTurns();t.innerHTML=`
      <div class="timeline-container ${this.isExpanded?"expanded":"collapsed"}">
        <!-- Slim Rail Track -->
        <div class="rail-track" title="对话时间轴 (${this.turns.length} 轮次)">
          <button class="expand-toggle-btn" aria-label="展开/收起时间轴">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${this.isExpanded?'<polyline points="9 18 15 12 9 6"></polyline>':'<polyline points="15 18 9 12 15 6"></polyline>'}
            </svg>
          </button>
          <div class="dots-list">
            ${this.turns.map(e=>`
              <div class="dot-wrapper" data-index="${e.index}">
                <div class="nav-dot ${e.index===this.activeTurnIndex?"active":""} ${e.isStarred?"starred":""}" 
                     data-index="${e.index}"></div>
                <div class="dot-tooltip">
                  <span class="tooltip-num">#${e.index}</span>
                  <span class="tooltip-text">${this.escapeHtml(e.userSnippet)}</span>
                  ${e.hasCode?'<span class="tag tag-code">&lt;/&gt;</span>':""}
                  ${e.hasMath?'<span class="tag tag-math">&sum;</span>':""}
                  ${e.isStarred?'<span class="tag tag-star">&starf;</span>':""}
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
              ${r.length===0?'<div class="empty-state">无匹配轮次</div>':r.map(e=>`
                <div class="turn-card ${e.index===this.activeTurnIndex?"active":""}" data-turn-id="${e.id}" data-index="${e.index}">
                  <div class="card-top">
                    <span class="card-num">#${e.index}</span>
                    <div class="card-badges">
                      ${e.hasCode?'<span class="tag tag-code" title="含代码块">&lt;/&gt;</span>':""}
                      ${e.hasMath?'<span class="tag tag-math" title="含数学公式">&sum;</span>':""}
                      <button class="star-btn ${e.isStarred?"starred":""}" title="${e.isStarred?"取消星标":"星标此轮"}">
                        ${e.isStarred?"★":"☆"}
                      </button>
                    </div>
                  </div>
                  <div class="card-snippet">${this.escapeHtml(e.userSnippet)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        `:""}
      </div>
    `,this.bindEvents(t)}bindEvents(t){const r=t.querySelector(".expand-toggle-btn");r==null||r.addEventListener("click",()=>{this.isExpanded=!this.isExpanded,this.render()});const e=t.querySelector(".panel-close-btn");e==null||e.addEventListener("click",()=>{this.isExpanded=!1,this.render()}),t.querySelectorAll(".dot-wrapper").forEach(i=>{i.addEventListener("click",()=>{const a=parseInt(i.getAttribute("data-index")||"1",10),o=this.turns.find(c=>c.index===a);o&&(this.activeTurnIndex=a,this.updateActiveDot(),this.scrollToTurn(o))})});const s=t.querySelector(".search-input");s==null||s.addEventListener("input",i=>{var o;this.searchQuery=i.target.value,this.render();const a=(o=this.shadow)==null?void 0:o.querySelector(".search-input");a&&(a.focus(),a.setSelectionRange(a.value.length,a.value.length))}),t.querySelectorAll(".filter-btn").forEach(i=>{i.addEventListener("click",()=>{this.filterMode=i.getAttribute("data-mode")||"all",this.render()})}),t.querySelectorAll(".turn-card").forEach(i=>{i.addEventListener("click",()=>{const o=parseInt(i.getAttribute("data-index")||"1",10),c=this.turns.find(m=>m.index===o);c&&(this.activeTurnIndex=o,this.updateActiveDot(),this.scrollToTurn(c))});const a=i.querySelector(".star-btn");a==null||a.addEventListener("click",o=>{const c=parseInt(i.getAttribute("data-index")||"1",10),m=this.turns.find(f=>f.index===c);m&&this.toggleStarTurn(m,o)})})}escapeHtml(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}getStyles(){return`
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
    `}}class y{static async sendToBackground(t){try{return await chrome.runtime.sendMessage(t)||{success:!1,error:"No response received"}}catch(r){return console.warn("[Gemini Copilot Bus] Failed to send message to background:",r),{success:!1,error:r.message||String(r)}}}static async broadcastToGeminiTabs(t){try{const r=await chrome.tabs.query({url:"*://gemini.google.com/*"});for(const e of r)e.id&&chrome.tabs.sendMessage(e.id,t).catch(()=>{})}catch(r){console.warn("[Gemini Copilot Bus] Broadcast to tabs failed:",r)}}static onMessage(t){const r=(e,s,i)=>{const a=t(e,s);if(a instanceof Promise)return a.then(o=>i(o||{success:!0})).catch(o=>i({success:!1,error:(o==null?void 0:o.message)||String(o)})),!0;if(a!==void 0)return i(a),!1};return chrome.runtime.onMessage.addListener(r),()=>chrome.runtime.onMessage.removeListener(r)}}class q{constructor(){n(this,"host",null);n(this,"shadow",null);n(this,"quota",null);n(this,"settings",null);n(this,"isCardOpen",!1);n(this,"isRefreshing",!1);n(this,"pollingTimer",null);n(this,"isVisible",!0)}async init(){this.settings=await u.getSettings(),this.isVisible=this.settings.pillVisible,this.quota=await u.getCachedQuota(),this.mount(),this.bindEvents(),this.startSmartPolling(),this.refreshQuota(!1)}mount(){const{host:t,root:r}=p.createShadowHost("gemini-copilot-quota-host",this.getStyles());this.host=t,this.shadow=r,this.repositionHost(),l.observeTheme(e=>{this.host&&this.host.setAttribute("data-theme",e)}),l.observeSidebar(e=>{this.host&&this.host.style.setProperty("--sidebar-offset",`${e}px`)}),this.render()}repositionHost(){const t=l.getTopBar();t&&this.host&&!t.contains(this.host)&&(t.appendChild(this.host),this.host.classList.add("in-header"))}bindEvents(){l.observeReplyFinish(()=>{console.log("[Gemini Copilot Quota] Model reply finished, triggering quota refresh..."),this.refreshQuota(!0)}),window.addEventListener("keydown",t=>{t.altKey&&(t.key==="u"||t.key==="U")&&(t.preventDefault(),this.toggleVisibility())}),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"?(console.log("[Gemini Copilot Quota] Tab focused, checking quota..."),this.startSmartPolling(),this.refreshQuota(!1)):(console.log("[Gemini Copilot Quota] Tab hidden, pausing polling timer."),this.stopSmartPolling())}),y.onMessage(t=>{t.type==="QUOTA_UPDATED"&&(this.quota=t.data,this.render())}),u.onSettingsChange(t=>{this.settings=t,this.isVisible=t.pillVisible,this.startSmartPolling(),this.render()})}startSmartPolling(){var e;this.stopSmartPolling();const t=((e=this.settings)==null?void 0:e.autoRefreshInterval)||45,r=Math.max(15,t)*1e3;this.pollingTimer=window.setInterval(()=>{document.visibilityState==="visible"&&this.refreshQuota(!1)},r)}stopSmartPolling(){this.pollingTimer&&(window.clearInterval(this.pollingTimer),this.pollingTimer=null)}async refreshQuota(t=!0){if(!this.isRefreshing){this.isRefreshing=!0,this.render();try{const r=await y.sendToBackground({type:"GET_QUOTA",force:t});r.success&&r.data&&(this.quota=r.data)}catch(r){console.warn("[Gemini Copilot Quota] Failed to refresh quota:",r)}finally{this.isRefreshing=!1,this.render()}}}async toggleVisibility(){this.isVisible=!this.isVisible,this.settings&&(this.settings.pillVisible=this.isVisible,await u.saveSettings({pillVisible:this.isVisible})),this.render()}render(){var i,a,o,c,m,f;if(!this.shadow)return;let t=this.shadow.querySelector(".quota-root");if(t||(t=document.createElement("div"),t.className="quota-root",this.shadow.appendChild(t)),!this.isVisible){t.innerHTML="";return}const r=this.quota?Math.round(this.quota.percentage):0,e=((i=this.quota)==null?void 0:i.status)||"ok",s=`status-${e}`;t.innerHTML=`
      <div class="quota-container">
        <!-- Main Top Bar Capsule Pill -->
        <button class="quota-pill ${s} ${this.isRefreshing?"refreshing":""}" 
                title="Gemini 限额用量: ${r}% (点击展开明细，快捷键 Alt+U 显隐)">
          <span class="pill-sparkle">✦</span>
          <span class="pill-text">${r}% 用量</span>
          <div class="pill-bar-track">
            <div class="pill-bar-fill ${s}" style="width: ${Math.min(100,Math.max(2,r))}%;"></div>
          </div>
          ${this.isRefreshing?'<span class="pill-spinner"></span>':""}
        </button>

        <!-- Popover Details Card -->
        ${this.isCardOpen?`
          <div class="quota-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-icon">⚡</span>
                <span class="card-title">Gemini 模型用量限额</span>
              </div>
              <button class="card-close-btn">&times;</button>
            </div>

            <div class="card-body">
              <!-- Big Percentage Display -->
              <div class="metric-row">
                <div class="metric-num ${s}">${r}%</div>
                <div class="metric-meta">
                  <span class="metric-label">当前周期消耗</span>
                  <span class="metric-status-badge ${s}">
                    ${e==="danger"?"严重不足":e==="warning"?"接近上限":e==="rate_limited"?"限流中":"充裕可用"}
                  </span>
                </div>
              </div>

              <!-- Horizontal Progress Bar -->
              <div class="progress-track">
                <div class="progress-fill ${s}" style="width: ${Math.min(100,r)}%;"></div>
              </div>

              <!-- Details Stats Grid -->
              <div class="stats-grid">
                ${((a=this.quota)==null?void 0:a.usedUnits)!==void 0&&((o=this.quota)==null?void 0:o.totalUnits)!==void 0?`
                  <div class="stat-item">
                    <span class="stat-label">已用 / 限额</span>
                    <span class="stat-value">${this.quota.usedUnits} / ${this.quota.totalUnits}</span>
                  </div>
                `:""}
                <div class="stat-item">
                  <span class="stat-label">重置状态</span>
                  <span class="stat-value">${((c=this.quota)==null?void 0:c.resetTimeText)||"周期自动重置"}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">上次更新</span>
                  <span class="stat-value">${(m=this.quota)!=null&&m.lastUpdated?new Date(this.quota.lastUpdated).toLocaleTimeString():"刚刚"}</span>
                </div>
              </div>

              ${(f=this.quota)!=null&&f.errorMessage?`
                <div class="error-notice">
                  <span>⚠️ ${this.escapeHtml(this.quota.errorMessage)}</span>
                </div>
              `:""}
            </div>

            <div class="card-footer">
              <button class="refresh-btn ${this.isRefreshing?"disabled":""}">
                <span class="refresh-icon ${this.isRefreshing?"spin":""}">↻</span>
                <span>${this.isRefreshing?"正在同步...":"立即刷新"}</span>
              </button>
              <a href="https://gemini.google.com/usage" target="_blank" class="link-usage" rel="noopener noreferrer">
                官方账单 &rarr;
              </a>
            </div>
            <div class="shortcut-tip">提示：按 <code>Alt + U</code> 可随时隐藏此胶囊</div>
          </div>
        `:""}
      </div>
    `,this.bindComponentEvents(t)}bindComponentEvents(t){const r=t.querySelector(".quota-pill");r==null||r.addEventListener("click",a=>{a.stopPropagation(),this.isCardOpen=!this.isCardOpen,this.render()});const e=t.querySelector(".card-close-btn");e==null||e.addEventListener("click",a=>{a.stopPropagation(),this.isCardOpen=!1,this.render()});const s=t.querySelector(".refresh-btn");s==null||s.addEventListener("click",a=>{a.stopPropagation(),this.refreshQuota(!0)});const i=a=>{this.isCardOpen&&this.host&&!a.composedPath().includes(this.host)&&(this.isCardOpen=!1,this.render(),document.removeEventListener("click",i))};this.isCardOpen&&document.addEventListener("click",i)}escapeHtml(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}getStyles(){return`
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
        --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.4);
      }

      :host:not(.in-header) .quota-root {
        position: fixed;
        top: 14px;
        right: 140px;
        z-index: 99998;
      }

      .in-header {
        display: inline-flex;
        align-items: center;
        margin-right: 12px;
      }

      .quota-container {
        position: relative;
        display: inline-flex;
      }

      /* Capsule Pill */
      .quota-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 16px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        background: var(--paper);
        border: 1px solid var(--hair);
        color: var(--ink);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
      }
      .quota-pill:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
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

      /* Details Card */
      .quota-card {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 290px;
        background: var(--bg-panel);
        border: 1px solid var(--hair);
        border-radius: 12px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
        z-index: 100000;
        overflow: hidden;
        animation: fadeIn 0.15s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
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
        font-size: 32px;
        font-weight: 800;
        line-height: 1;
      }
      .metric-num.status-ok { color: var(--emerald); }
      .metric-num.status-warning { color: var(--amber); }
      .metric-num.status-danger, .metric-num.status-rate_limited { color: var(--red); }

      .metric-meta {
        text-align: right;
      }
      .metric-label {
        font-size: 11px;
        color: var(--mute);
        display: block;
      }
      .metric-status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .metric-status-badge.status-ok { background: var(--emerald-bg); color: var(--emerald); }
      .metric-status-badge.status-warning { background: var(--amber-bg); color: var(--amber); }
      .metric-status-badge.status-danger, .metric-status-badge.status-rate_limited { background: var(--red-bg); color: var(--red); }

      .progress-track {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: var(--hair);
        overflow: hidden;
        margin-bottom: 12px;
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
        background: var(--paper);
        border: 1px solid var(--hair);
        border-radius: 8px;
        padding: 8px 10px;
      }
      .stat-item {
        display: flex;
        flex-direction: column;
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
        font-size: 11.5px;
        color: var(--red);
        background: var(--red-bg);
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--red-border);
      }

      .card-footer {
        padding: 10px 14px;
        border-top: 1px solid var(--hair);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .refresh-btn {
        background: var(--paper);
        border: 1px solid var(--hair);
        color: var(--ink);
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
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
        display: inline-block;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .link-usage {
        font-size: 12px;
        color: var(--accent);
        text-decoration: none;
      }
      .link-usage:hover {
        text-decoration: underline;
      }

      .shortcut-tip {
        font-size: 11px;
        color: var(--mute);
        text-align: center;
        padding: 4px 0 8px;
        background: var(--paper);
        border-top: 1px dashed var(--hair);
      }
      .shortcut-tip code {
        background: var(--hair);
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 10px;
      }
    `}}class I{constructor(){n(this,"settings",null);n(this,"currentConversationId","");n(this,"draftDebounceTimer",null);n(this,"widescreenStyleTag",null)}async init(){this.settings=await u.getSettings(),this.currentConversationId=l.getConversationId(),this.applyWidescreen(this.settings.enableWidescreen,this.settings.widescreenWidth),this.setupDraftAndSendKeys(),this.setupLatexCopy(),p.onRoute(async()=>{this.currentConversationId=l.getConversationId(),await this.restoreDraft()}),u.onSettingsChange(t=>{this.settings=t,this.applyWidescreen(t.enableWidescreen,t.widescreenWidth)})}setupDraftAndSendKeys(){const t=()=>{const r=l.getInputElement();if(!r||r.getAttribute("data-copilot-bound")==="true")return;r.setAttribute("data-copilot-bound","true"),this.restoreDraft(),r.addEventListener("input",()=>{var s;(s=this.settings)!=null&&s.enableDraftAutoSave&&(this.draftDebounceTimer&&window.clearTimeout(this.draftDebounceTimer),this.draftDebounceTimer=window.setTimeout(async()=>{const i=this.getInputText(r);await u.saveDraft(this.currentConversationId,i)},400))}),r.addEventListener("keydown",s=>{if(!(!this.settings||this.settings.sendKeyMode!=="ctrl_enter")){if(s.key==="Enter"&&!s.ctrlKey&&!s.metaKey&&!s.shiftKey)s.stopPropagation();else if(s.key==="Enter"&&(s.ctrlKey||s.metaKey)){s.preventDefault();const{button:i}=l.getSendStopButton();i&&!i.hasAttribute("disabled")&&(i.click(),u.saveDraft(this.currentConversationId,""))}}},!0);const{button:e}=l.getSendStopButton();e==null||e.addEventListener("click",()=>{u.saveDraft(this.currentConversationId,"")})};t(),window.setInterval(t,2e3)}getInputText(t){return t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement?t.value:t.innerText||t.textContent||""}setInputText(t,r){t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement?(t.value=r,t.dispatchEvent(new Event("input",{bubbles:!0}))):(t.innerText=r,t.dispatchEvent(new Event("input",{bubbles:!0})))}async restoreDraft(){var s;if(!((s=this.settings)!=null&&s.enableDraftAutoSave))return;const t=l.getInputElement();if(!t||this.getInputText(t).trim())return;const e=await u.getDraft(this.currentConversationId);e&&e.trim()&&(this.setInputText(t,e),console.log("[Gemini Copilot] Restored draft for conversation:",this.currentConversationId))}setupLatexCopy(){const t=()=>{var e;if(!((e=this.settings)!=null&&e.enableLatexCopy))return;document.querySelectorAll(".katex, math, .math-block, [data-math]:not([data-copilot-copy])").forEach(s=>{s.setAttribute("data-copilot-copy","true"),s.style.cursor="pointer",s.title="点击复制 LaTeX 公式源码",s.addEventListener("click",i=>{i.stopPropagation();const a=this.extractLatex(s);a&&navigator.clipboard.writeText(a).then(()=>{this.showCopyToast(s,"已复制 LaTeX 源码")})})})};t(),window.setInterval(t,2500)}extractLatex(t){var i;const r=t.querySelector('annotation[encoding*="tex"]');if(r&&r.textContent)return r.textContent.trim();const e=t.getAttribute("data-math")||t.getAttribute("data-latex");if(e)return e.trim();const s=t.getAttribute("alttext");return s?s.trim():((i=t.innerText)==null?void 0:i.trim())||""}showCopyToast(t,r){const e=document.createElement("div");e.className="gemini-copilot-copy-toast",e.textContent=r,Object.assign(e.style,{position:"absolute",background:"#111827",color:"#FFFFFF",fontSize:"11px",padding:"3px 8px",borderRadius:"4px",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",zIndex:"100000",pointerEvents:"none",transition:"opacity 0.2s",opacity:"1"});const s=t.getBoundingClientRect();e.style.left=`${s.left+window.scrollX}px`,e.style.top=`${s.top+window.scrollY-24}px`,document.body.appendChild(e),window.setTimeout(()=>{e.style.opacity="0",window.setTimeout(()=>e.remove(),250)},1200)}applyWidescreen(t,r){if(!t){this.widescreenStyleTag&&(this.widescreenStyleTag.remove(),this.widescreenStyleTag=null);return}this.widescreenStyleTag||(this.widescreenStyleTag=document.createElement("style"),this.widescreenStyleTag.id="gemini-copilot-widescreen-style",document.head.appendChild(this.widescreenStyleTag));const e=r||"1200px";this.widescreenStyleTag.textContent=`
      .conversation-container,
      main .chat-history,
      chat-window,
      .chat-window-container,
      infinite-scroller,
      .bottom-container {
        max-width: ${e} !important;
        width: 100% !important;
      }
    `}}class ${static exportCurrentConversation(t){const r=l.getTurns();if(!r||r.length===0){alert("未检测到当前对话的轮次内容，无法导出。");return}const e=l.getConversationId(),s=new Date().toISOString().split("T")[0],i=`gemini-chat-${e}-${s}`;if(t==="markdown"){const a=this.generateMarkdown(r,e);this.downloadFile(`${i}.md`,a,"text/markdown;charset=utf-8")}else if(t==="json"){const a=this.generateJSON(r,e);this.downloadFile(`${i}.json`,a,"application/json;charset=utf-8")}}static generateMarkdown(t,r){const e=new Date().toLocaleString();let s=`# Gemini 对话记录

`;return s+=`- **会话编号**: \`${r}\`
`,s+=`- **导出时间**: ${e}
`,s+=`- **总轮次数**: ${t.length}

`,s+=`---

`,t.forEach(i=>{s+=`## 🧑‍💻 用户 (第 ${i.index} 轮)

`,s+=`${i.userPrompt.trim()}

`,s+=`## 🤖 Gemini

`,s+=`${i.modelResponse.trim()||"*(回复内容为空或未完全加载)*"}

`,s+=`---

`}),s+=`
*由 [Gemini Copilot](https://github.com/voyager-crew/voyager) 导出*
`,s}static generateJSON(t,r){const e={conversationId:r,exportedAt:new Date().toISOString(),totalTurns:t.length,turns:t.map(s=>({index:s.index,id:s.id,userPrompt:s.userPrompt,modelResponse:s.modelResponse,hasCode:s.hasCode,hasMath:s.hasMath,isStarred:s.isStarred}))};return JSON.stringify(e,null,2)}static downloadFile(t,r,e){const s=new Blob([r],{type:e}),i=URL.createObjectURL(s),a=document.createElement("a");a.href=i,a.download=t,document.body.appendChild(a),a.click(),window.setTimeout(()=>{document.body.removeChild(a),URL.revokeObjectURL(i)},100)}}async function S(){console.log("[Gemini Copilot] Initializing extension content script..."),p.patchHistoryNavigation(),A();const h=await u.getSettings();h.enableTimeline&&await new F().init(),h.enableQuotaPill&&await new q().init(),await new I().init(),y.onMessage(r=>{r.type==="TRIGGER_EXPORT"&&$.exportCurrentConversation(r.format)}),console.log("[Gemini Copilot] All features mounted successfully in Shadow DOM.")}function A(){const h=document.createElement("style");h.id="gemini-copilot-global-styles",h.textContent=`
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
  `,document.head.appendChild(h)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",S):S()})();
