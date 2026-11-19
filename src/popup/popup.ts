/**
 * Gemini Copilot - Popup Settings Controller
 */
import { StorageManager } from '../core/storage';
import { MessageBus } from '../core/bus';
import { QuotaData, ExtensionSettings } from '../types';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const statusBadge = document.getElementById('statusBadge') as HTMLElement;
  const quotaPct = document.getElementById('quotaPct') as HTMLElement;
  const progressBar = document.getElementById('progressBar') as HTMLElement;
  const quotaResetText = document.getElementById('quotaResetText') as HTMLElement;
  const quotaUpdatedText = document.getElementById('quotaUpdatedText') as HTMLElement;

  const toggleTimeline = document.getElementById('toggleTimeline') as HTMLInputElement;
  const toggleQuotaPill = document.getElementById('toggleQuotaPill') as HTMLInputElement;
  const toggleDraft = document.getElementById('toggleDraft') as HTMLInputElement;
  const toggleSendKey = document.getElementById('toggleSendKey') as HTMLInputElement;
  const toggleLatex = document.getElementById('toggleLatex') as HTMLInputElement;
  const toggleWidescreen = document.getElementById('toggleWidescreen') as HTMLInputElement;
  const sliderInterval = document.getElementById('sliderInterval') as HTMLInputElement;
  const intervalValue = document.getElementById('intervalValue') as HTMLElement;

  const btnExportMarkdown = document.getElementById('btnExportMarkdown') as HTMLButtonElement;
  const btnExportJSON = document.getElementById('btnExportJSON') as HTMLButtonElement;

  // 1. Load Settings
  const settings = await StorageManager.getSettings();
  toggleTimeline.checked = settings.enableTimeline;
  toggleQuotaPill.checked = settings.enableQuotaPill;
  toggleDraft.checked = settings.enableDraftAutoSave;
  toggleSendKey.checked = settings.sendKeyMode === 'ctrl_enter';
  toggleLatex.checked = settings.enableLatexCopy;
  toggleWidescreen.checked = settings.enableWidescreen;
  sliderInterval.value = String(settings.autoRefreshInterval);
  intervalValue.textContent = `${settings.autoRefreshInterval}s`;

  // 2. Load & Display Quota
  const updateQuotaUI = (quota: QuotaData | null) => {
    if (!quota) {
      statusBadge.textContent = '暂无数据';
      statusBadge.className = 'status-badge status-warning';
      quotaPct.textContent = '--%';
      progressBar.style.width = '0%';
      quotaResetText.textContent = '重置: 待同步';
      quotaUpdatedText.textContent = '更新: 未连接';
      return;
    }

    const pct = Math.round(quota.percentage);
    quotaPct.textContent = `${pct}%`;
    progressBar.style.width = `${Math.min(100, pct)}%`;

    const status = quota.status;
    statusBadge.className = `status-badge status-${status}`;
    progressBar.className = `progress-bar status-${status}`;

    if (status === 'danger') statusBadge.textContent = '严重不足';
    else if (status === 'warning') statusBadge.textContent = '接近上限';
    else if (status === 'rate_limited') statusBadge.textContent = '429 限流中';
    else if (status === 'unauthenticated') statusBadge.textContent = '未登录';
    else statusBadge.textContent = '额度充裕';

    quotaResetText.textContent = `重置: ${quota.resetTimeText || '日常重置'}`;
    quotaUpdatedText.textContent = `更新: ${new Date(quota.lastUpdated).toLocaleTimeString()}`;
  };

  const cachedQuota = await StorageManager.getCachedQuota();
  updateQuotaUI(cachedQuota);

  // Fetch latest quota via background
  MessageBus.sendToBackground<QuotaData>({ type: 'GET_QUOTA', force: false }).then((res) => {
    if (res.success && res.data) {
      updateQuotaUI(res.data);
    }
  });

  // 3. Settings Change Handlers
  const saveSetting = async (partial: Partial<ExtensionSettings>) => {
    await StorageManager.saveSettings(partial);
  };

  toggleTimeline.addEventListener('change', () => {
    saveSetting({ enableTimeline: toggleTimeline.checked });
  });

  toggleQuotaPill.addEventListener('change', () => {
    saveSetting({ enableQuotaPill: toggleQuotaPill.checked });
  });

  toggleDraft.addEventListener('change', () => {
    saveSetting({ enableDraftAutoSave: toggleDraft.checked });
  });

  toggleSendKey.addEventListener('change', () => {
    saveSetting({ sendKeyMode: toggleSendKey.checked ? 'ctrl_enter' : 'enter' });
  });

  toggleLatex.addEventListener('change', () => {
    saveSetting({ enableLatexCopy: toggleLatex.checked });
  });

  toggleWidescreen.addEventListener('change', () => {
    saveSetting({ enableWidescreen: toggleWidescreen.checked });
  });

  sliderInterval.addEventListener('input', () => {
    intervalValue.textContent = `${sliderInterval.value}s`;
  });

  sliderInterval.addEventListener('change', () => {
    saveSetting({ autoRefreshInterval: parseInt(sliderInterval.value, 10) });
  });

  // 4. Export Handlers
  const triggerExportInActiveTab = async (format: 'markdown' | 'json') => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.id || !currentTab.url?.includes('gemini.google.com')) {
      alert('请在已打开的 gemini.google.com 页面中使用导出功能。');
      return;
    }
    chrome.tabs.sendMessage(currentTab.id, { type: 'TRIGGER_EXPORT', format });
  };

  btnExportMarkdown.addEventListener('click', () => triggerExportInActiveTab('markdown'));
  btnExportJSON.addEventListener('click', () => triggerExportInActiveTab('json'));
});
