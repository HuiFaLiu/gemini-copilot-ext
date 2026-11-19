/**
 * Gemini Copilot - Feature: Conversation Timeline Navigator (P0)
 * 
 * Floating right-side interactive timeline rail, hover previews,
 * smooth navigation, keyword filtering and local star pinning.
 */
import { TurnNode } from '../../types';
import { GeminiAdapter } from '../../sites/gemini';
import { LifecycleManager } from '../../core/lifecycle';
import { StorageManager } from '../../core/storage';

export class TimelineNavigator {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private turns: TurnNode[] = [];
  private activeTurnIndex: number = 1;
  private intersectionObserver: IntersectionObserver | null = null;
  private searchQuery: string = '';
  private filterMode: 'all' | 'code' | 'math' | 'starred' = 'all';
  private starredTurnIds: Set<string> = new Set();
  private isExpanded: boolean = false;
  private conversationId: string = '';

  constructor() {
    this.conversationId = GeminiAdapter.getConversationId();
  }

  async init(): Promise<void> {
    this.starredTurnIds = new Set(await StorageManager.getStars(this.conversationId));
    this.mount();
    this.bindObservers();
  }

  private mount(): void {
    const { host, root } = LifecycleManager.createShadowHost(
      'gemini-copilot-timeline-host',
      this.getStyles()
    );
    this.host = host;
    this.shadow = root;

    // Theme synchronization
    GeminiAdapter.observeTheme((theme) => {
      if (this.host) {
        this.host.setAttribute('data-theme', theme);
      }
    });

    this.render();
  }

  private bindObservers(): void {
    // 1. Observe conversation mutations
    GeminiAdapter.observeConversation((turns) => {
      this.turns = turns.map((t) => ({
        ...t,
        isStarred: this.starredTurnIds.has(t.id)
      }));
      this.setupIntersectionObserver();
      this.render();
    });

    // 2. Observe SPA Route changes to reload stars and reset index
    LifecycleManager.onRoute(async () => {
      this.conversationId = GeminiAdapter.getConversationId();
      this.starredTurnIds = new Set(await StorageManager.getStars(this.conversationId));
      this.turns = GeminiAdapter.getTurns().map((t) => ({
        ...t,
        isStarred: this.starredTurnIds.has(t.id)
      }));
      this.activeTurnIndex = 1;
      this.setupIntersectionObserver();
      this.render();
    });
  }

  private setupIntersectionObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const turnId = entry.target.getAttribute('id') || entry.target.getAttribute('data-turn-id');
            const found = this.turns.find((t) => t.id === turnId || t.element === entry.target);
            if (found && found.index !== this.activeTurnIndex) {
              this.activeTurnIndex = found.index;
              this.updateActiveDot();
            }
          }
        }
      },
      { rootMargin: '-15% 0px -65% 0px', threshold: 0.1 }
    );

    this.turns.forEach((turn) => {
      if (turn.element) {
        this.intersectionObserver?.observe(turn.element);
      }
    });
  }

  private scrollToTurn(turn: TurnNode): void {
    if (!turn.element) return;

    turn.element.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Apply flash highlight for 1.2s
    turn.element.classList.remove('gemini-copilot-highlight-flash');
    void turn.element.offsetWidth; // trigger reflow
    turn.element.classList.add('gemini-copilot-highlight-flash');

    window.setTimeout(() => {
      turn.element?.classList.remove('gemini-copilot-highlight-flash');
    }, 1300);
  }

  private async toggleStarTurn(turn: TurnNode, e: Event): Promise<void> {
    e.stopPropagation();
    const isNowStarred = await StorageManager.toggleStar(this.conversationId, turn.id);
    if (isNowStarred) {
      this.starredTurnIds.add(turn.id);
    } else {
      this.starredTurnIds.delete(turn.id);
    }
    turn.isStarred = isNowStarred;
    this.render();
  }

  private updateActiveDot(): void {
    if (!this.shadow) return;
    const dots = this.shadow.querySelectorAll('.nav-dot');
    dots.forEach((d) => {
      const idx = parseInt(d.getAttribute('data-index') || '0', 10);
      if (idx === this.activeTurnIndex) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  }

  private getFilteredTurns(): TurnNode[] {
    return this.turns.filter((turn) => {
      if (this.filterMode === 'code' && !turn.hasCode) return false;
      if (this.filterMode === 'math' && !turn.hasMath) return false;
      if (this.filterMode === 'starred' && !turn.isStarred) return false;

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const inPrompt = turn.userPrompt.toLowerCase().includes(q);
        const inResponse = turn.modelResponse.toLowerCase().includes(q);
        return inPrompt || inResponse;
      }
      return true;
    });
  }

  private render(): void {
    if (!this.shadow) return;

    let root = this.shadow.querySelector<HTMLElement>('.timeline-root');
    if (!root) {
      root = document.createElement('div');
      root.className = 'timeline-root';
      this.shadow.appendChild(root);
    }

    if (this.turns.length === 0) {
      root.innerHTML = '';
      return;
    }

    const filtered = this.getFilteredTurns();

    root.innerHTML = `
      <div class="timeline-container ${this.isExpanded ? 'expanded' : 'collapsed'}">
        <!-- Slim Rail Track -->
        <div class="rail-track" title="对话时间轴 (${this.turns.length} 轮次)">
          <button class="expand-toggle-btn" aria-label="展开/收起时间轴">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${this.isExpanded ? '<polyline points="9 18 15 12 9 6"></polyline>' : '<polyline points="15 18 9 12 15 6"></polyline>'}
            </svg>
          </button>
          <div class="dots-list">
            ${this.turns
              .map(
                (turn) => `
              <div class="dot-wrapper" data-index="${turn.index}">
                <div class="nav-dot ${turn.index === this.activeTurnIndex ? 'active' : ''} ${turn.isStarred ? 'starred' : ''}" 
                     data-index="${turn.index}"></div>
                <div class="dot-tooltip">
                  <span class="tooltip-num">#${turn.index}</span>
                  <span class="tooltip-text">${this.escapeHtml(turn.userSnippet)}</span>
                  ${turn.hasCode ? '<span class="tag tag-code">&lt;/&gt;</span>' : ''}
                  ${turn.hasMath ? '<span class="tag tag-math">&sum;</span>' : ''}
                  ${turn.isStarred ? '<span class="tag tag-star">&starf;</span>' : ''}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Expanded Full Panel -->
        ${
          this.isExpanded
            ? `
          <div class="expanded-panel">
            <div class="panel-header">
              <span class="panel-title">对话时间轴 (${this.turns.length} 轮)</span>
              <button class="panel-close-btn">&times;</button>
            </div>
            
            <!-- Filter & Search Toolbar -->
            <div class="panel-toolbar">
              <input type="text" class="search-input" placeholder="按关键词过滤轮次..." value="${this.escapeHtml(this.searchQuery)}" />
              <div class="filter-tabs">
                <button class="filter-btn ${this.filterMode === 'all' ? 'active' : ''}" data-mode="all">全部</button>
                <button class="filter-btn ${this.filterMode === 'code' ? 'active' : ''}" data-mode="code">&lt;/&gt; 代码</button>
                <button class="filter-btn ${this.filterMode === 'math' ? 'active' : ''}" data-mode="math">&sum; 公式</button>
                <button class="filter-btn ${this.filterMode === 'starred' ? 'active' : ''}" data-mode="starred">&starf; 星标</button>
              </div>
            </div>

            <!-- Turn Cards List -->
            <div class="turn-cards-list">
              ${
                filtered.length === 0
                  ? '<div class="empty-state">无匹配轮次</div>'
                  : filtered
                      .map(
                        (t) => `
                <div class="turn-card ${t.index === this.activeTurnIndex ? 'active' : ''}" data-turn-id="${t.id}" data-index="${t.index}">
                  <div class="card-top">
                    <span class="card-num">#${t.index}</span>
                    <div class="card-badges">
                      ${t.hasCode ? '<span class="tag tag-code" title="含代码块">&lt;/&gt;</span>' : ''}
                      ${t.hasMath ? '<span class="tag tag-math" title="含数学公式">&sum;</span>' : ''}
                      <button class="star-btn ${t.isStarred ? 'starred' : ''}" title="${t.isStarred ? '取消星标' : '星标此轮'}">
                        ${t.isStarred ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                  <div class="card-snippet">${this.escapeHtml(t.userSnippet)}</div>
                </div>
              `
                      )
                      .join('')
              }
            </div>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.bindEvents(root);
  }

  private bindEvents(root: HTMLElement): void {
    // 1. Expand / collapse button
    const toggleBtn = root.querySelector('.expand-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      this.render();
    });

    const closeBtn = root.querySelector('.panel-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.isExpanded = false;
      this.render();
    });

    // 2. Click on rail dots to scroll
    root.querySelectorAll('.dot-wrapper').forEach((dw) => {
      dw.addEventListener('click', () => {
        const idx = parseInt(dw.getAttribute('data-index') || '1', 10);
        const targetTurn = this.turns.find((t) => t.index === idx);
        if (targetTurn) {
          this.activeTurnIndex = idx;
          this.updateActiveDot();
          this.scrollToTurn(targetTurn);
        }
      });
    });

    // 3. Search input handler
    const searchInput = root.querySelector<HTMLInputElement>('.search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.render();
      // refocus input after re-render
      const newInp = this.shadow?.querySelector<HTMLInputElement>('.search-input');
      if (newInp) {
        newInp.focus();
        newInp.setSelectionRange(newInp.value.length, newInp.value.length);
      }
    });

    // 4. Filter tabs
    root.querySelectorAll<HTMLButtonElement>('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterMode = (btn.getAttribute('data-mode') as any) || 'all';
        this.render();
      });
    });

    // 5. Card click to scroll & star click
    root.querySelectorAll('.turn-card').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index') || '1', 10);
        const targetTurn = this.turns.find((t) => t.index === idx);
        if (targetTurn) {
          this.activeTurnIndex = idx;
          this.updateActiveDot();
          this.scrollToTurn(targetTurn);
        }
      });

      const starBtn = card.querySelector('.star-btn');
      starBtn?.addEventListener('click', (e) => {
        const idx = parseInt(card.getAttribute('data-index') || '1', 10);
        const targetTurn = this.turns.find((t) => t.index === idx);
        if (targetTurn) {
          this.toggleStarTurn(targetTurn, e);
        }
      });
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getStyles(): string {
    return `
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
    `;
  }
}
