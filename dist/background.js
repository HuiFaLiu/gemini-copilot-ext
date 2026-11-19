const h = {
  autoRefreshInterval: 45,
  enableTimeline: !0,
  enableQuotaPill: !0,
  enableDraftAutoSave: !0,
  sendKeyMode: "enter",
  enableLatexCopy: !0,
  enableWidescreen: !1,
  widescreenWidth: "1200px",
  pillVisible: !0
}, c = {
  SETTINGS: "gemini_copilot_settings",
  QUOTA: "gemini_copilot_quota",
  DRAFTS_PREFIX: "gemini_copilot_draft_",
  STARS_PREFIX: "gemini_copilot_stars_"
};
class u {
  /**
   * Retrieves user settings merged with defaults
   */
  static async getSettings() {
    try {
      const t = await chrome.storage.local.get(c.SETTINGS);
      if (t[c.SETTINGS])
        return { ...h, ...t[c.SETTINGS] };
    } catch (t) {
      console.warn("[Gemini Copilot] Error reading settings from storage:", t);
    }
    return { ...h };
  }
  /**
   * Updates partial user settings
   */
  static async saveSettings(t) {
    const a = { ...await this.getSettings(), ...t };
    return a.autoRefreshInterval < 15 && (a.autoRefreshInterval = 15), await chrome.storage.local.set({ [c.SETTINGS]: a }), a;
  }
  /**
   * Subscribes to settings changes
   */
  static onSettingsChange(t) {
    const e = (a, n) => {
      if (n === "local" && a[c.SETTINGS]) {
        const r = { ...h, ...a[c.SETTINGS].newValue };
        t(r);
      }
    };
    return chrome.storage.onChanged.addListener(e), () => chrome.storage.onChanged.removeListener(e);
  }
  /**
   * Retrieves cached quota data
   */
  static async getCachedQuota() {
    try {
      return (await chrome.storage.local.get(c.QUOTA))[c.QUOTA] || null;
    } catch {
      return null;
    }
  }
  /**
   * Saves quota data to cache
   */
  static async saveQuota(t) {
    await chrome.storage.local.set({ [c.QUOTA]: t });
  }
  /**
   * Gets draft for a specific conversation
   */
  static async getDraft(t) {
    if (!t) return "";
    try {
      const e = `${c.DRAFTS_PREFIX}${t}`;
      return (await chrome.storage.local.get(e))[e] || "";
    } catch {
      return "";
    }
  }
  /**
   * Saves draft for a specific conversation
   */
  static async saveDraft(t, e) {
    if (!t) return;
    const a = `${c.DRAFTS_PREFIX}${t}`;
    e.trim() ? await chrome.storage.local.set({ [a]: e }) : await chrome.storage.local.remove(a);
  }
  /**
   * Gets list of starred turn IDs for a conversation
   */
  static async getStars(t) {
    if (!t) return [];
    try {
      const e = `${c.STARS_PREFIX}${t}`, a = await chrome.storage.local.get(e);
      return Array.isArray(a[e]) ? a[e] : [];
    } catch {
      return [];
    }
  }
  /**
   * Toggles star state for a specific turn
   */
  static async toggleStar(t, e) {
    if (!t || !e) return !1;
    const a = await this.getStars(t), n = a.indexOf(e);
    let r = !1;
    n >= 0 ? (a.splice(n, 1), r = !1) : (a.push(e), r = !0);
    const o = `${c.STARS_PREFIX}${t}`;
    return await chrome.storage.local.set({ [o]: a }), r;
  }
}
class _ {
  /**
   * Sends a message to the Background Service Worker from Content Script or Popup
   */
  static async sendToBackground(t) {
    try {
      return await chrome.runtime.sendMessage(t) || { success: !1, error: "No response received" };
    } catch (e) {
      return console.warn("[Gemini Copilot Bus] Failed to send message to background:", e), { success: !1, error: e.message || String(e) };
    }
  }
  /**
   * Broadcasts a message to all active Gemini tabs from Service Worker
   */
  static async broadcastToGeminiTabs(t) {
    try {
      const e = await chrome.tabs.query({ url: "*://gemini.google.com/*" });
      for (const a of e)
        a.id && chrome.tabs.sendMessage(a.id, t).catch(() => {
        });
    } catch (e) {
      console.warn("[Gemini Copilot Bus] Broadcast to tabs failed:", e);
    }
  }
  /**
   * Subscribes to messages
   */
  static onMessage(t) {
    const e = (a, n, r) => {
      const o = t(a, n);
      if (o instanceof Promise)
        return o.then((i) => r(i || { success: !0 })).catch((i) => r({ success: !1, error: (i == null ? void 0 : i.message) || String(i) })), !0;
      if (o !== void 0)
        return r(o), !1;
    };
    return chrome.runtime.onMessage.addListener(e), () => chrome.runtime.onMessage.removeListener(e);
  }
}
let f = !1, d = null, p = 0;
const y = [60, 120, 300];
let m = 0;
function l(s) {
  if (!s || s.status === "unauthenticated" || s.status === "error") {
    chrome.action.setBadgeText({ text: "!" }), chrome.action.setBadgeBackgroundColor({ color: "#6B7280" });
    return;
  }
  if (s.status === "rate_limited") {
    chrome.action.setBadgeText({ text: "429" }), chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
    return;
  }
  const t = Math.round(s.percentage);
  chrome.action.setBadgeText({ text: `${t}%` }), t < 70 ? chrome.action.setBadgeBackgroundColor({ color: "#047857" }) : t < 90 ? chrome.action.setBadgeBackgroundColor({ color: "#D97706" }) : chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
}
function E(s) {
  const t = {
    percentage: 0,
    periodType: "current"
  };
  try {
    const e = s.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:used|已使用|of limit|限额)/i) || s.match(/(?:used|已使用|当前使用率)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || s.match(/"percentage"\s*:\s*(\d+(?:\.\d+)?)/i);
    if (e && e[1]) {
      const r = parseFloat(e[1]);
      !isNaN(r) && r >= 0 && r <= 100 && (t.percentage = r);
    }
    const a = s.match(/(\d+[\d,.]*)\s*(?:\/|of|共)\s*(\d+[\d,.]*)\s*(?:requests|queries|tokens|次|次提问)/i);
    if (a && a[1] && a[2]) {
      const r = parseFloat(a[1].replace(/,/g, "")), o = parseFloat(a[2].replace(/,/g, ""));
      !isNaN(r) && !isNaN(o) && o > 0 && (t.usedUnits = r, t.totalUnits = o, t.percentage || (t.percentage = Math.min(100, Math.round(r / o * 100))));
    }
    const n = s.match(/(?:Resets? in|重置时间|倒计时|将于)[:：\s]*([^<>\n"]{4,40})/i);
    n && n[1] && (t.resetTimeText = n[1].trim());
  } catch (e) {
    console.warn("[Gemini Copilot SW] Error parsing usage payload:", e);
  }
  return t;
}
async function T(s = !1) {
  const t = Date.now();
  if (!s && m > t) {
    const e = await u.getCachedQuota(), a = Math.ceil((m - t) / 1e3);
    return e || {
      percentage: 0,
      status: "rate_limited",
      lastUpdated: t,
      errorMessage: `429 限流保护中，请在 ${a} 秒后重试`
    };
  }
  return f && d || (f = !0, d = (async () => {
    try {
      const e = await fetch("https://gemini.google.com/usage", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      if (e.status === 429) {
        const g = y[Math.min(p, y.length - 1)];
        p++, m = Date.now() + g * 1e3;
        const w = {
          percentage: 0,
          status: "rate_limited",
          lastUpdated: Date.now(),
          errorMessage: `请求过于频繁 (HTTP 429)，已触发指数退避保护 (${g}s)`
        };
        return l(w), w;
      }
      if (e.redirected && e.url.includes("accounts.google.com")) {
        const g = {
          percentage: 0,
          status: "unauthenticated",
          lastUpdated: Date.now(),
          errorMessage: "未登录 Google 账号，请在当前浏览器登录 Gemini"
        };
        return l(g), g;
      }
      if (!e.ok)
        throw new Error(`HTTP ${e.status}: ${e.statusText}`);
      const a = await e.text(), n = E(a);
      p = 0, m = 0;
      const r = n.percentage ?? 0;
      let o = "ok";
      r >= 90 ? o = "danger" : r >= 70 && (o = "warning");
      const i = {
        percentage: r,
        usedUnits: n.usedUnits,
        totalUnits: n.totalUnits,
        resetTimeText: n.resetTimeText || "今日结束前重置",
        periodType: "current",
        status: o,
        lastUpdated: Date.now()
      };
      return await u.saveQuota(i), l(i), await _.broadcastToGeminiTabs({ type: "QUOTA_UPDATED", data: i }), i;
    } catch (e) {
      console.warn("[Gemini Copilot SW] Quota fetch failed:", e);
      const a = await u.getCachedQuota();
      if (a)
        return l(a), {
          ...a,
          status: "warning",
          errorMessage: `拉取失败，显示上次缓存: ${e.message || String(e)}`
        };
      const n = {
        percentage: 0,
        status: "error",
        lastUpdated: Date.now(),
        errorMessage: e.message || "获取限额数据失败"
      };
      return l(n), n;
    } finally {
      f = !1, d = null;
    }
  })()), d;
}
chrome.alarms.onAlarm.addListener(async (s) => {
  s.name === "gemini_quota_periodic_refresh" && (await chrome.tabs.query({ url: "*://gemini.google.com/*", active: !0 })).length > 0 && await T(!1);
});
async function S() {
  const s = await u.getSettings(), t = Math.max(1, Math.round(s.autoRefreshInterval / 60));
  chrome.alarms.create("gemini_quota_periodic_refresh", {
    periodInMinutes: Math.max(1, t)
  });
}
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Gemini Copilot] Extension installed/updated."), await S();
  const s = await u.getCachedQuota();
  s && l(s);
});
chrome.runtime.onStartup.addListener(async () => {
  await S();
  const s = await u.getCachedQuota();
  s && l(s);
});
u.onSettingsChange(async () => {
  await S();
});
_.onMessage(async (s, t) => s.type === "GET_QUOTA" ? { success: !0, data: await T(s.force || !1) } : s.type === "ON_REPLY_FINISHED" ? { success: !0, data: await T(!0) } : s.type === "GET_SETTINGS" ? { success: !0, data: await u.getSettings() } : s.type === "SAVE_SETTINGS" ? { success: !0, data: await u.saveSettings(s.settings) } : { success: !1, error: "Unknown message type" });
