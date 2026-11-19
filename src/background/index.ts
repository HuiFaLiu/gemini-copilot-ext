/**
 * Gemini Copilot - Background Service Worker (Manifest V3)
 * 
 * Responsibilities:
 * - Single-Flight deduplicated quota polling
 * - 429 exponential backoff management
 * - Extension action Badge updates
 * - Multi-tab broadcast synchronization
 */
import { QuotaData, ExtensionSettings, DEFAULT_SETTINGS, MessageType, MessageResponse } from '../types';
import { StorageManager } from '../core/storage';
import { MessageBus } from '../core/bus';
import { parseUsageText } from '../features/quota/parser';

// In-memory state for Service Worker lifecycle
let isFetchingQuota = false;
let ongoingQuotaPromise: Promise<QuotaData> | null = null;
let backoffIndex = 0;
const BACKOFF_SCHEDULE = [60, 120, 300]; // seconds: 1m, 2m, 5m
let backoffUntilTimestamp = 0;

/**
 * Updates extension action badge color & text based on quota
 */
function updateBadge(quota: QuotaData | null) {
  if (!quota || quota.status === 'unauthenticated' || quota.status === 'error') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#6B7280' }); // Mute gray
    return;
  }

  if (quota.status === 'rate_limited') {
    chrome.action.setBadgeText({ text: '429' });
    chrome.action.setBadgeBackgroundColor({ color: '#DC2626' }); // Red
    return;
  }

  const pct = Math.round(quota.percentage);
  chrome.action.setBadgeText({ text: `${pct}%` });

  if (pct < 70) {
    chrome.action.setBadgeBackgroundColor({ color: '#047857' }); // Emerald Green
  } else if (pct < 90) {
    chrome.action.setBadgeBackgroundColor({ color: '#D97706' }); // Amber Yellow
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#DC2626' }); // Red
  }
}

/**
 * Fetch quota with Single-Flight deduplication and exponential backoff
 */
async function fetchQuota(force = false): Promise<QuotaData> {
  const now = Date.now();

  // If rate limited and still in cooldown, return cached quota with rate_limited status
  if (!force && backoffUntilTimestamp > now) {
    const cached = await StorageManager.getCachedQuota();
    const waitSec = Math.ceil((backoffUntilTimestamp - now) / 1000);
    return cached || {
      percentage: 0,
      status: 'rate_limited',
      lastUpdated: now,
      errorMessage: `429 限流保护中，请在 ${waitSec} 秒后重试`
    };
  }

  // Single-Flight: if already in-flight, return the existing promise
  if (isFetchingQuota && ongoingQuotaPromise) {
    return ongoingQuotaPromise;
  }

  isFetchingQuota = true;
  ongoingQuotaPromise = (async () => {
    try {
      // Primary channel: Lightweight direct fetch to /usage with cookies
      const response = await fetch('https://gemini.google.com/usage', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.status === 429) {
        // Trigger Exponential Backoff
        const backoffSeconds = BACKOFF_SCHEDULE[Math.min(backoffIndex, BACKOFF_SCHEDULE.length - 1)];
        backoffIndex++;
        backoffUntilTimestamp = Date.now() + backoffSeconds * 1000;

        const rateLimitedQuota: QuotaData = {
          percentage: 0,
          status: 'rate_limited',
          lastUpdated: Date.now(),
          errorMessage: `请求过于频繁 (HTTP 429)，已触发指数退避保护 (${backoffSeconds}s)`
        };
        updateBadge(rateLimitedQuota);
        return rateLimitedQuota;
      }

      // Check if redirected to Google sign-in
      if (response.redirected && response.url.includes('accounts.google.com')) {
        const unauthQuota: QuotaData = {
          percentage: 0,
          status: 'unauthenticated',
          lastUpdated: Date.now(),
          errorMessage: '未登录 Google 账号，请在当前浏览器登录 Gemini'
        };
        updateBadge(unauthQuota);
        return unauthQuota;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const parsed = parseUsageText(text);

      // Reset backoff on success
      backoffIndex = 0;
      backoffUntilTimestamp = 0;

      // If direct fetch parsed non-zero percentage from SSR or payload
      if (parsed.percentage !== undefined && parsed.percentage > 0) {
        const percentage = parsed.percentage;
        let status: QuotaData['status'] = parsed.status || 'ok';
        if (percentage >= 90) status = 'danger';
        else if (percentage >= 70) status = 'warning';

        const quotaData: QuotaData = {
          percentage,
          usedPercentage: percentage,
          remainingPercentage: Math.max(0, 100 - percentage),
          resetTimeText: parsed.resetTimeText || '今日结束前重置',
          weeklyPercentage: parsed.weeklyPercentage,
          weeklyResetTimeText: parsed.weeklyResetTimeText,
          periodType: 'current',
          status,
          lastUpdated: Date.now()
        };

        await StorageManager.saveQuota(quotaData);
        updateBadge(quotaData);
        await MessageBus.broadcastToGeminiTabs({ type: 'QUOTA_UPDATED', data: quotaData });
        return quotaData;
      }

      // If direct fetch couldn't extract rendered percentage (SPA client-side rendered),
      // prefer existing cached quota rather than overwriting with 0!
      const cached = await StorageManager.getCachedQuota();
      if (cached) {
        updateBadge(cached);
        return cached;
      }

      // Default initial quota when no cache exists yet
      const initialQuota: QuotaData = {
        percentage: 0,
        resetTimeText: '点击刷新以同步',
        periodType: 'current',
        status: 'ok',
        lastUpdated: Date.now()
      };
      return initialQuota;
    } catch (err: any) {
      console.warn('[Gemini Copilot SW] Quota fetch failed:', err);
      const cached = await StorageManager.getCachedQuota();
      if (cached) {
        updateBadge(cached);
        return {
          ...cached,
          status: 'warning',
          errorMessage: `拉取失败，显示上次缓存: ${err.message || String(err)}`
        };
      }
      const errQuota: QuotaData = {
        percentage: 0,
        status: 'error',
        lastUpdated: Date.now(),
        errorMessage: err.message || '获取限额数据失败'
      };
      updateBadge(errQuota);
      return errQuota;
    } finally {
      isFetchingQuota = false;
      ongoingQuotaPromise = null;
    }
  })();

  return ongoingQuotaPromise;
}

/**
 * Alarm listener for scheduled background refresh
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'gemini_quota_periodic_refresh') {
    // Check if any Gemini tab is currently visible/active
    const tabs = await chrome.tabs.query({ url: '*://gemini.google.com/*', active: true });
    if (tabs.length > 0) {
      await fetchQuota(false);
    }
  }
});

/**
 * Configure periodic alarm based on settings
 */
async function configureAlarm() {
  const settings = await StorageManager.getSettings();
  const periodInMinutes = Math.max(1, Math.round(settings.autoRefreshInterval / 60));
  chrome.alarms.create('gemini_quota_periodic_refresh', {
    periodInMinutes: Math.max(1, periodInMinutes)
  });
}

// Extension installation & startup setup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Gemini Copilot] Extension installed/updated.');
  await configureAlarm();
  const cached = await StorageManager.getCachedQuota();
  if (cached) updateBadge(cached);
});

chrome.runtime.onStartup.addListener(async () => {
  await configureAlarm();
  const cached = await StorageManager.getCachedQuota();
  if (cached) updateBadge(cached);
});

// Watch settings updates to reconfigure alarm
StorageManager.onSettingsChange(async () => {
  await configureAlarm();
});

// Central message listener
MessageBus.onMessage(async (msg: MessageType, sender): Promise<MessageResponse> => {
  if (msg.type === 'GET_QUOTA') {
    const quota = await fetchQuota(msg.force || false);
    return { success: true, data: quota };
  }

  if (msg.type === 'ON_REPLY_FINISHED') {
    // Model reply completed, refresh quota immediately
    const quota = await fetchQuota(true);
    return { success: true, data: quota };
  }

  if (msg.type === 'QUOTA_UPDATED' && msg.data) {
    await StorageManager.saveQuota(msg.data);
    updateBadge(msg.data);
    return { success: true };
  }

  if (msg.type === 'GET_SETTINGS') {
    const settings = await StorageManager.getSettings();
    return { success: true, data: settings };
  }

  if (msg.type === 'SAVE_SETTINGS') {
    const updated = await StorageManager.saveSettings(msg.settings);
    return { success: true, data: updated };
  }

  return { success: false, error: 'Unknown message type' };
});
