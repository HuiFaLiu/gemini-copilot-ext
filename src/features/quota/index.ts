/**
 * Gemini Copilot - Feature: Real-time Quota Monitor Capsule (P0)
 * 
 * Adaptive top-bar pill, tri-color threshold alerts, details card,
 * Alt+U toggle, and hybrid refresh engine (events + smart polling).
 */
import { QuotaData, ExtensionSettings } from '../../types';
import { GeminiAdapter } from '../../sites/gemini';
import { LifecycleManager } from '../../core/lifecycle';
import { StorageManager } from '../../core/storage';
import { MessageBus } from '../../core/bus';

export class QuotaMonitor {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private quota: QuotaData | null = null;
  private settings: ExtensionSettings | null = null;
  private isCardOpen: boolean = false;
  private isRefreshing: boolean = false;
  private pollingTimer: number | null = null;
  private isVisible: boolean = true;

  async init(): Promise<void> {
    this.settings = await StorageManager.getSettings();
    this.isVisible = this.settings.pillVisible;

    // Load initial cached quota
    this.quota = await StorageManager.getCachedQuota();

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

    // Reposition inside Gemini header if available, or stay fixed top-right
    this.repositionHost();

    // Theme synchronization
    GeminiAdapter.observeTheme((theme) => {
      if (this.host) {
        this.host.setAttribute('data-theme', theme);
      }
    });

    // Sidebar resize synchronization to prevent overlapping
    GeminiAdapter.observeSidebar((width) => {
      if (this.host) {
        this.host.style.setProperty('--sidebar-offset', `${width}px`);
      }
    });

    this.render();
  }

  private repositionHost(): void {
    const topBar = GeminiAdapter.getTopBar();
    if (topBar && this.host && !topBar.contains(this.host)) {
      // Place next to top bar actions if feasible
      topBar.appendChild(this.host);
      this.host.classList.add('in-header');
    }
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

    // 4. Listen for Quota updates broadcast from background
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
      const res = await MessageBus.sendToBackground<QuotaData>({
        type: 'GET_QUOTA',
        force
      });
      if (res.success && res.data) {
        this.quota = res.data;
      }
    } catch (err) {
      console.warn('[Gemini Copilot Quota] Failed to refresh quota:', err);
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
        <!-- Main Top Bar Capsule Pill -->
        <button class="quota-pill ${statusClass} ${this.isRefreshing ? 'refreshing' : ''}" 
                title="Gemini 限额用量: ${pct}% (点击展开明细，快捷键 Alt+U 显隐)">
          <span class="pill-sparkle">✦</span>
          <span class="pill-text">${pct}% 用量</span>
          <div class="pill-bar-track">
            <div class="pill-bar-fill ${statusClass}" style="width: ${Math.min(100, Math.max(2, pct))}%;"></div>
          </div>
          ${this.isRefreshing ? '<span class="pill-spinner"></span>' : ''}
        </button>

        <!-- Popover Details Card -->
        ${
          this.isCardOpen
            ? `
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
                <div class="metric-num ${statusClass}">${pct}%</div>
                <div class="metric-meta">
                  <span class="metric-label">当前周期消耗</span>
                  <span class="metric-status-badge ${statusClass}">
                    ${status === 'danger' ? '严重不足' : status === 'warning' ? '接近上限' : status === 'rate_limited' ? '限流中' : '充裕可用'}
                  </span>
                </div>
              </div>

              <!-- Horizontal Progress Bar -->
              <div class="progress-track">
                <div class="progress-fill ${statusClass}" style="width: ${Math.min(100, pct)}%;"></div>
              </div>

              <!-- Details Stats Grid -->
              <div class="stats-grid">
                ${
                  this.quota?.usedUnits !== undefined && this.quota?.totalUnits !== undefined
                    ? `
                  <div class="stat-item">
                    <span class="stat-label">已用 / 限额</span>
                    <span class="stat-value">${this.quota.usedUnits} / ${this.quota.totalUnits}</span>
                  </div>
                `
                    : ''
                }
                <div class="stat-item">
                  <span class="stat-label">重置状态</span>
                  <span class="stat-value">${this.quota?.resetTimeText || '周期自动重置'}</span>
                </div>
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
              <button class="refresh-btn ${this.isRefreshing ? 'disabled' : ''}">
                <span class="refresh-icon ${this.isRefreshing ? 'spin' : ''}">↻</span>
                <span>${this.isRefreshing ? '正在同步...' : '立即刷新'}</span>
              </button>
              <a href="https://gemini.google.com/usage" target="_blank" class="link-usage" rel="noopener noreferrer">
                官方账单 &rarr;
              </a>
            </div>
            <div class="shortcut-tip">提示：按 <code>Alt + U</code> 可随时隐藏此胶囊</div>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.bindComponentEvents(root);
  }

  private bindComponentEvents(root: HTMLElement): void {
    // 1. Click pill to toggle details card
    const pill = root.querySelector('.quota-pill');
    pill?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCardOpen = !this.isCardOpen;
      this.render();
    });

    // 2. Card close button
    const closeBtn = root.querySelector('.card-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCardOpen = false;
      this.render();
    });

    // 3. Manual Refresh Button
    const refreshBtn = root.querySelector('.refresh-btn');
    refreshBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.refreshQuota(true);
    });

    // 4. Click outside to dismiss card
    const onDocClick = (e: MouseEvent) => {
      if (this.isCardOpen && this.host && !e.composedPath().includes(this.host)) {
        this.isCardOpen = false;
        this.render();
        document.removeEventListener('click', onDocClick);
      }
    };
    if (this.isCardOpen) {
      document.addEventListener('click', onDocClick);
    }
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
    `;
  }
}
