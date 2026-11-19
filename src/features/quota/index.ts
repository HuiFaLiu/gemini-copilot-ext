/**
 * Gemini Copilot - Feature: Real-time Quota Monitor Capsule (P0)
 * 
 * Freely draggable floating pill with position persistence,
 * adaptive 4-quadrant popover details card, tri-color threshold alerts,
 * Alt+U toggle, and hybrid refresh engine (events + smart polling + iframe degraded fallback).
 */
import { QuotaData, ExtensionSettings } from '../../types';
import { GeminiAdapter } from '../../sites/gemini';
import { LifecycleManager } from '../../core/lifecycle';
import { StorageManager } from '../../core/storage';
import { MessageBus } from '../../core/bus';
import { IframeQuotaFetcher } from './iframe-fetcher';

export class QuotaMonitor {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private quota: QuotaData | null = null;
  private settings: ExtensionSettings | null = null;
  private isCardOpen: boolean = false;
  private isRefreshing: boolean = false;
  private pollingTimer: number | null = null;
  private isVisible: boolean = true;

  // Draggable positioning state
  private position: { x: number; y: number } = { x: 24, y: Math.max(20, window.innerHeight - 90) };
  private isDragging: boolean = false;
  private dragMoved: boolean = false;
  private justDragged: boolean = false;

  async init(): Promise<void> {
    this.settings = await StorageManager.getSettings();
    this.isVisible = this.settings.pillVisible;

    // Load initial cached quota
    this.quota = await StorageManager.getCachedQuota();

    // Load saved custom pill position
    const savedPos = await StorageManager.getPillPosition();
    if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
      this.position = savedPos;
    } else {
      // Default: bottom left, safe distance above avatar and page bottom
      this.position = { x: 24, y: Math.max(20, window.innerHeight - 90) };
    }

    this.mount();
    this.bindEvents();
    this.startSmartPolling();

    // Fetch fresh quota on initial load
    this.refreshQuota(false);
  }

  private mount(): void {
    const { host, root } = LifecycleManager.createShadowHost(
      'gemini-copilot-quota-host',
      this.getStyles()
    );
    this.host = host;
    this.shadow = root;

    // Apply initial position
    this.applyPosition();

    // Theme synchronization
    GeminiAdapter.observeTheme((theme) => {
      if (this.host) {
        this.host.setAttribute('data-theme', theme);
      }
    });

    // Window resize clamping
    window.addEventListener('resize', () => {
      this.applyPosition();
    });

    this.render();
  }

  private applyPosition(): void {
    if (!this.host) return;

    const pillWidth = 135;
    const pillHeight = 36;
    const maxX = Math.max(10, window.innerWidth - pillWidth - 10);
    const maxY = Math.max(10, window.innerHeight - pillHeight - 10);

    const clampedX = Math.max(10, Math.min(maxX, this.position.x));
    const clampedY = Math.max(10, Math.min(maxY, this.position.y));

    this.position = { x: clampedX, y: clampedY };
    this.host.style.left = `${clampedX}px`;
    this.host.style.top = `${clampedY}px`;
    this.host.style.bottom = 'auto';
    this.host.style.right = 'auto';

    // Adapt popover card direction based on quadrant
    const isLowerHalf = clampedY > window.innerHeight / 2;
    const isRightHalf = clampedX > window.innerWidth / 2;

    this.host.setAttribute('data-v-align', isLowerHalf ? 'up' : 'down');
    this.host.setAttribute('data-h-align', isRightHalf ? 'right' : 'left');
  }

  private bindEvents(): void {
    // 1. Reply completion instant refresh
    GeminiAdapter.observeReplyFinish(() => {
      console.log('[Gemini Copilot Quota] Model reply finished, triggering quota refresh...');
      this.refreshQuota(true);
    });

    // 2. Alt+U Shortcut to toggle visibility
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        this.toggleVisibility();
      }
    });

    // 3. Page visibility change: Pause polling when hidden, resume on focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[Gemini Copilot Quota] Tab focused, checking quota...');
        this.startSmartPolling();
        this.refreshQuota(false);
      } else {
        console.log('[Gemini Copilot Quota] Tab hidden, pausing polling timer.');
        this.stopSmartPolling();
      }
    });

    // 4. Listen for Quota updates broadcast from background or other tabs
    MessageBus.onMessage((msg) => {
      if (msg.type === 'QUOTA_UPDATED') {
        this.quota = msg.data;
        this.render();
      }
    });

    // 5. Watch settings changes
    StorageManager.onSettingsChange((newSettings) => {
      this.settings = newSettings;
      this.isVisible = newSettings.pillVisible;
      this.startSmartPolling();
      this.render();
    });
  }

  private startSmartPolling(): void {
    this.stopSmartPolling();
    const intervalSec = this.settings?.autoRefreshInterval || 45;
    // Lower bound safety limit: 15 seconds
    const safeInterval = Math.max(15, intervalSec) * 1000;

    this.pollingTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refreshQuota(false);
      }
    }, safeInterval);
  }

  private stopSmartPolling(): void {
    if (this.pollingTimer) {
      window.clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  public async refreshQuota(force = true): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.render();

    try {
      // 1. Query background service worker
      const res = await MessageBus.sendToBackground<QuotaData>({
        type: 'GET_QUOTA',
        force
      });

      if (res.success && res.data && res.data.percentage > 0) {
        this.quota = res.data;
      } else {
        // 2. If background returned 0% or couldn't parse live DOM,
        // use hidden iframe degraded reader to extract rendered DOM cards from /usage
        const iframeQuota = await IframeQuotaFetcher.fetch();
        if (iframeQuota && iframeQuota.percentage !== undefined) {
          this.quota = iframeQuota;
        } else if (res.data) {
          this.quota = res.data;
        }
      }
    } catch (err) {
      console.warn('[Gemini Copilot Quota] Background refresh failed, trying iframe fallback:', err);
      try {
        const iframeQuota = await IframeQuotaFetcher.fetch();
        if (iframeQuota) {
          this.quota = iframeQuota;
        }
      } catch (e) {
        // Ignore fallback errors
      }
    } finally {
      this.isRefreshing = false;
      this.render();
    }
  }

  private async toggleVisibility(): Promise<void> {
    this.isVisible = !this.isVisible;
    if (this.settings) {
      this.settings.pillVisible = this.isVisible;
      await StorageManager.saveSettings({ pillVisible: this.isVisible });
    }
    this.render();
  }

  private render(): void {
    if (!this.shadow) return;

    let root = this.shadow.querySelector<HTMLElement>('.quota-root');
    if (!root) {
      root = document.createElement('div');
      root.className = 'quota-root';
      this.shadow.appendChild(root);
    }

    if (!this.isVisible) {
      root.innerHTML = '';
      return;
    }

    const pct = this.quota ? Math.round(this.quota.percentage) : 0;
    const status = this.quota?.status || 'ok';
    const statusClass = `status-${status}`;

    root.innerHTML = `
      <div class="quota-container">
        <!-- Freely Draggable Capsule Pill -->
        <button class="quota-pill ${statusClass} ${this.isRefreshing ? 'refreshing' : ''}" 
                type="button"
                title="Gemini 限额用量: ${pct}% (按住可自由拖拽位置，点击展开明细，快捷键 Alt+U 显隐)">
          <span class="pill-drag-handle" title="拖拽调整位置">⋮⋮</span>
          <span class="pill-sparkle">✦</span>
          <span class="pill-text">${pct}% 用量</span>
          <div class="pill-bar-track">
            <div class="pill-bar-fill ${statusClass}" style="width: ${Math.min(100, Math.max(3, pct))}%;"></div>
          </div>
          ${this.isRefreshing ? '<span class="pill-spinner"></span>' : ''}
        </button>

        <!-- Adaptive Popover Details Card -->
        ${
          this.isCardOpen
            ? `
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
                <div class="metric-num ${statusClass}">${pct}%</div>
                <div class="metric-meta">
                  <span class="metric-label">当前用量消耗</span>
                  <span class="metric-status-badge ${statusClass}">
                    ${status === 'danger' ? '严重不足' : status === 'warning' ? '接近上限' : status === 'rate_limited' ? '限流中' : '额度充裕'}
                  </span>
                </div>
              </div>

              <!-- Horizontal Progress Bar -->
              <div class="progress-track">
                <div class="progress-fill ${statusClass}" style="width: ${Math.min(100, pct)}%;"></div>
              </div>

              <!-- Details Stats Grid -->
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">今日重置</span>
                  <span class="stat-value">${this.quota?.resetTimeText || '今日定时重置'}</span>
                </div>
                ${
                  this.quota?.weeklyPercentage !== undefined
                    ? `
                  <div class="stat-item">
                    <span class="stat-label">每周限额</span>
                    <span class="stat-value">已使用 ${this.quota.weeklyPercentage}%</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">周限额重置</span>
                    <span class="stat-value">${this.quota.weeklyResetTimeText || '每周定时重置'}</span>
                  </div>
                `
                    : ''
                }
                <div class="stat-item">
                  <span class="stat-label">上次更新</span>
                  <span class="stat-value">${this.quota?.lastUpdated ? new Date(this.quota.lastUpdated).toLocaleTimeString() : '刚刚'}</span>
                </div>
              </div>

              ${
                this.quota?.errorMessage
                  ? `
                <div class="error-notice">
                  <span>⚠️ ${this.escapeHtml(this.quota.errorMessage)}</span>
                </div>
              `
                  : ''
              }
            </div>

            <div class="card-footer">
              <button class="refresh-btn ${this.isRefreshing ? 'disabled' : ''}" type="button">
                <span class="refresh-icon ${this.isRefreshing ? 'spin' : ''}">↻</span>
                <span>${this.isRefreshing ? '正在同步...' : '立即刷新'}</span>
              </button>
              <a href="https://gemini.google.com/usage" target="_blank" class="link-usage" rel="noopener noreferrer">
                官方用量页 &rarr;
              </a>
            </div>
            <div class="shortcut-tip">提示：按住胶囊可拖拽，按 <code>Alt + U</code> 可随时隐藏</div>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.bindComponentEvents(root);
  }

  private bindComponentEvents(root: HTMLElement): void {
    const pill = root.querySelector<HTMLElement>('.quota-pill');
    if (!pill) return;

    // 1. Setup free mouse dragging
    this.setupDraggable(pill);

    // 2. Click pill to toggle details card (only if not dragging)
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.justDragged || this.isDragging) return;

      this.isCardOpen = !this.isCardOpen;
      this.applyPosition();
      this.render();
    });

    // 3. Card close button
    const closeBtn = root.querySelector('.card-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isCardOpen = false;
      this.render();
    });

    // 4. Manual Refresh Button
    const refreshBtn = root.querySelector('.refresh-btn');
    refreshBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.refreshQuota(true);
    });

    // 5. Click outside to dismiss card
    if (this.isCardOpen) {
      window.setTimeout(() => {
        const onDocClick = (e: MouseEvent) => {
          if (!this.isCardOpen || !this.host) return;
          const path = e.composedPath ? e.composedPath() : [];
          if (!path.includes(this.host)) {
            this.isCardOpen = false;
            this.render();
            document.removeEventListener('click', onDocClick);
          }
        };
        document.addEventListener('click', onDocClick);
      }, 50);
    }
  }

  /**
   * Enables smooth mouse drag and drop with position persistence
   */
  private setupDraggable(pill: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let initialPos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      // Only drag on primary left button
      if (e.button !== 0) return;

      startX = e.clientX;
      startY = e.clientY;
      initialPos = { ...this.position };
      this.dragMoved = false;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (!this.dragMoved && Math.hypot(dx, dy) > 4) {
          this.dragMoved = true;
          this.isDragging = true;
          this.host?.classList.add('is-dragging');
          // Close card while dragging for optimal smoothness
          if (this.isCardOpen) {
            this.isCardOpen = false;
            this.render();
          }
        }

        if (this.isDragging) {
          this.position = {
            x: initialPos.x + dx,
            y: initialPos.y + dy
          };
          this.applyPosition();
        }
      };

      const onMouseUp = async () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (this.isDragging) {
          this.isDragging = false;
          this.host?.classList.remove('is-dragging');
          this.justDragged = true;
          window.setTimeout(() => {
            this.justDragged = false;
          }, 120);

          // Save final position to storage
          await StorageManager.savePillPosition(this.position);
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    pill.addEventListener('mousedown', onMouseDown);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    `;
  }
}
