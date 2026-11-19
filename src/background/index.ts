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
 * Parse usage data from raw HTML or response string from gemini.google.com/usage
 */
function parseUsagePayload(html: string): Partial<QuotaData> {
  const result: Partial<QuotaData> = {
    percentage: 0,
    periodType: 'current'
  };

  try {
    // 1. Check for standard percentage patterns like "45% used" or "已使用 45%"
    const pctMatch = html.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:used|已使用|of limit|限额)/i) ||
                     html.match(/(?:used|已使用|当前使用率)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) ||
                     html.match(/"percentage"\s*:\s*(\d+(?:\.\d+)?)/i);
    if (pctMatch && pctMatch[1]) {
      const val = parseFloat(pctMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        result.percentage = val;
      }
    }

    // 2. Check for token/unit usage like "450 / 1000" or "450 of 1000 requests"
    const ratioMatch = html.match(/(\d+[\d,.]*)\s*(?:\/|of|共)\s*(\d+[\d,.]*)\s*(?:requests|queries|tokens|次|次提问)/i);
    if (ratioMatch && ratioMatch[1] && ratioMatch[2]) {
      const used = parseFloat(ratioMatch[1].replace(/,/g, ''));
      const total = parseFloat(ratioMatch[2].replace(/,/g, ''));
      if (!isNaN(used) && !isNaN(total) && total > 0) {
        result.usedUnits = used;
        result.totalUnits = total;
        if (!result.percentage) {
          result.percentage = Math.min(100, Math.round((used / total) * 100));
        }
      }
    }

    // 3. Check for reset countdown / time text
    const resetMatch = html.match(/(?:Resets? in|重置时间|倒计时|将于)[:：\s]*([^<>\n"]{4,40})/i);
    if (resetMatch && resetMatch[1]) {
      result.resetTimeText = resetMatch[1].trim();
    }
  } catch (err) {
    console.warn('[Gemini Copilot SW] Error parsing usage payload:', err);
  }

  return result;
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
      const parsed = parseUsagePayload(text);

      // Reset backoff on success
      backoffIndex = 0;
      backoffUntilTimestamp = 0;

      const percentage = parsed.percentage ?? 0;
      let status: QuotaData['status'] = 'ok';
      if (percentage >= 90) status = 'danger';
      else if (percentage >= 70) status = 'warning';

      const quotaData: QuotaData = {
        percentage,
        usedUnits: parsed.usedUnits,
        totalUnits: parsed.totalUnits,
        resetTimeText: parsed.resetTimeText || '今日结束前重置',
        periodType: 'current',
        status,
        lastUpdated: Date.now()
      };

      // Persist to storage & update extension icon badge
      await StorageManager.saveQuota(quotaData);
      updateBadge(quotaData);

      // Broadcast to all active Gemini tabs
      await MessageBus.broadcastToGeminiTabs({ type: 'QUOTA_UPDATED', data: quotaData });

      return quotaData;
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
