const f = {
  autoRefreshInterval: 45,
  enableTimeline: !0,
  enableQuotaPill: !0,
  enableDraftAutoSave: !0,
  sendKeyMode: "enter",
  enableLatexCopy: !0,
  enableWidescreen: !1,
  widescreenWidth: "1200px",
  pillVisible: !0
}, i = {
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
      const t = await chrome.storage.local.get(i.SETTINGS);
      if (t[i.SETTINGS])
        return { ...f, ...t[i.SETTINGS] };
    } catch (t) {
      console.warn("[Gemini Copilot] Error reading settings from storage:", t);
    }
    return { ...f };
  }
  /**
   * Updates partial user settings
   */
  static async saveSettings(t) {
    const s = { ...await this.getSettings(), ...t };
    return s.autoRefreshInterval < 15 && (s.autoRefreshInterval = 15), await chrome.storage.local.set({ [i.SETTINGS]: s }), s;
  }
  /**
   * Subscribes to settings changes
   */
  static onSettingsChange(t) {
    const e = (s, r) => {
      if (r === "local" && s[i.SETTINGS]) {
        const c = { ...f, ...s[i.SETTINGS].newValue };
        t(c);
      }
    };
    return chrome.storage.onChanged.addListener(e), () => chrome.storage.onChanged.removeListener(e);
  }
  /**
   * Retrieves cached quota data
   */
  static async getCachedQuota() {
    try {
      return (await chrome.storage.local.get(i.QUOTA))[i.QUOTA] || null;
    } catch {
      return null;
    }
  }
  /**
   * Saves quota data to cache
   */
  static async saveQuota(t) {
    await chrome.storage.local.set({ [i.QUOTA]: t });
  }
  /**
   * Gets draft for a specific conversation
   */
  static async getDraft(t) {
    if (!t) return "";
    try {
      const e = `${i.DRAFTS_PREFIX}${t}`;
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
    const s = `${i.DRAFTS_PREFIX}${t}`;
    e.trim() ? await chrome.storage.local.set({ [s]: e }) : await chrome.storage.local.remove(s);
  }
  /**
   * Gets list of starred turn IDs for a conversation
   */
  static async getStars(t) {
    if (!t) return [];
    try {
      const e = `${i.STARS_PREFIX}${t}`, s = await chrome.storage.local.get(e);
      return Array.isArray(s[e]) ? s[e] : [];
    } catch {
      return [];
    }
  }
  /**
   * Toggles star state for a specific turn
   */
  static async toggleStar(t, e) {
    if (!t || !e) return !1;
    const s = await this.getStars(t), r = s.indexOf(e);
    let c = !1;
    r >= 0 ? (s.splice(r, 1), c = !1) : (s.push(e), c = !0);
    const l = `${i.STARS_PREFIX}${t}`;
    return await chrome.storage.local.set({ [l]: s }), c;
  }
}
class E {
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
      for (const s of e)
        s.id && chrome.tabs.sendMessage(s.id, t).catch(() => {
        });
    } catch (e) {
      console.warn("[Gemini Copilot Bus] Broadcast to tabs failed:", e);
    }
  }
  /**
   * Subscribes to messages
   */
  static onMessage(t) {
    const e = (s, r, c) => {
      const l = t(s, r);
      if (l instanceof Promise)
        return l.then((n) => c(n || { success: !0 })).catch((n) => c({ success: !1, error: (n == null ? void 0 : n.message) || String(n) })), !0;
      if (l !== void 0)
        return c(l), !1;
    };
    return chrome.runtime.onMessage.addListener(e), () => chrome.runtime.onMessage.removeListener(e);
  }
}
function k(a) {
  return a ? a.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : "";
}
function p(a) {
  const t = a.match(new RegExp("(?:(?<!counter-)重置时间|将于|Resets?\\s+(?:at|in))[:：\\s]*([0-9]{1,2}月[0-9]{1,2}日\\s*[0-9]{1,2}:[0-9]{2}|[0-9]{1,2}:[0-9]{2}(?:\\s*[AP]M)?|[0-9]+\\s*(?:hours?|mins?|分|小时|天)[^\\n\\r<]{0,12})", "i"));
  return t ? t[1].trim() : null;
}
function M(a) {
  const t = {
    periodType: "current"
  };
  try {
    const e = k(a);
    if (!e || e.length === 0)
      return t;
    const s = e.match(/(?:当前用量|Current\s*usage)[\s\S]*?(?=(?:每周限额|Weekly\s*limit)|方案|$)/i), r = s ? s[0] : e, c = r.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || r.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i) || e.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);
    if (c && c[1]) {
      const o = parseFloat(c[1]);
      !isNaN(o) && o >= 0 && o <= 100 && (t.percentage = o);
    }
    const l = p(r) || p(e);
    l && (t.resetTimeText = `重置时间：${l}`);
    const n = e.match(/(?:每周限额|Weekly\s*limit)[\s\S]*?(?=方案|$)/i);
    if (n) {
      const o = n[0], d = o.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || o.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i);
      d && d[1] && (t.weeklyPercentage = parseFloat(d[1]));
      const _ = p(o);
      _ && (t.weeklyResetTimeText = `每周重置：${_}`);
    }
    if (t.percentage !== void 0) {
      let o = "ok";
      t.percentage >= 90 ? o = "danger" : t.percentage >= 70 && (o = "warning"), t.status = o;
    }
  } catch (e) {
    console.warn("[Gemini Copilot Parser] Error parsing usage text:", e);
  }
  return t;
}
let T = !1, m = null, w = 0;
const x = [60, 120, 300];
let h = 0;
function g(a) {
  if (!a || a.status === "unauthenticated" || a.status === "error") {
    chrome.action.setBadgeText({ text: "!" }), chrome.action.setBadgeBackgroundColor({ color: "#6B7280" });
    return;
  }
  if (a.status === "rate_limited") {
    chrome.action.setBadgeText({ text: "429" }), chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
    return;
  }
  const t = Math.round(a.percentage);
  chrome.action.setBadgeText({ text: `${t}%` }), t < 70 ? chrome.action.setBadgeBackgroundColor({ color: "#047857" }) : t < 90 ? chrome.action.setBadgeBackgroundColor({ color: "#D97706" }) : chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
}
async function S(a = !1) {
  const t = Date.now();
  if (!a && h > t) {
    const e = await u.getCachedQuota(), s = Math.ceil((h - t) / 1e3);
    return e || {
      percentage: 0,
      status: "rate_limited",
      lastUpdated: t,
      errorMessage: `429 限流保护中，请在 ${s} 秒后重试`
    };
  }
  return T && m || (T = !0, m = (async () => {
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
        const n = x[Math.min(w, x.length - 1)];
        w++, h = Date.now() + n * 1e3;
        const o = {
          percentage: 0,
          status: "rate_limited",
          lastUpdated: Date.now(),
          errorMessage: `请求过于频繁 (HTTP 429)，已触发指数退避保护 (${n}s)`
        };
        return g(o), o;
      }
      if (e.redirected && e.url.includes("accounts.google.com")) {
        const n = {
          percentage: 0,
          status: "unauthenticated",
          lastUpdated: Date.now(),
          errorMessage: "未登录 Google 账号，请在当前浏览器登录 Gemini"
        };
        return g(n), n;
      }
      if (!e.ok)
        throw new Error(`HTTP ${e.status}: ${e.statusText}`);
      const s = await e.text(), r = M(s);
      if (w = 0, h = 0, r.percentage !== void 0 && r.percentage > 0) {
        const n = r.percentage;
        let o = r.status || "ok";
        n >= 90 ? o = "danger" : n >= 70 && (o = "warning");
        const d = {
          percentage: n,
          usedPercentage: n,
          remainingPercentage: Math.max(0, 100 - n),
          resetTimeText: r.resetTimeText || "今日结束前重置",
          weeklyPercentage: r.weeklyPercentage,
          weeklyResetTimeText: r.weeklyResetTimeText,
          periodType: "current",
          status: o,
          lastUpdated: Date.now()
        };
        return await u.saveQuota(d), g(d), await E.broadcastToGeminiTabs({ type: "QUOTA_UPDATED", data: d }), d;
      }
      const c = await u.getCachedQuota();
      return c ? (g(c), c) : {
        percentage: 0,
        resetTimeText: "点击刷新以同步",
        periodType: "current",
        status: "ok",
        lastUpdated: Date.now()
      };
    } catch (e) {
      console.warn("[Gemini Copilot SW] Quota fetch failed:", e);
      const s = await u.getCachedQuota();
      if (s)
        return g(s), {
          ...s,
          status: "warning",
          errorMessage: `拉取失败，显示上次缓存: ${e.message || String(e)}`
        };
      const r = {
        percentage: 0,
        status: "error",
        lastUpdated: Date.now(),
        errorMessage: e.message || "获取限额数据失败"
      };
      return g(r), r;
    } finally {
      T = !1, m = null;
    }
  })()), m;
}
chrome.alarms.onAlarm.addListener(async (a) => {
  a.name === "gemini_quota_periodic_refresh" && (await chrome.tabs.query({ url: "*://gemini.google.com/*", active: !0 })).length > 0 && await S(!1);
});
async function y() {
  const a = await u.getSettings(), t = Math.max(1, Math.round(a.autoRefreshInterval / 60));
  chrome.alarms.create("gemini_quota_periodic_refresh", {
    periodInMinutes: Math.max(1, t)
  });
}
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Gemini Copilot] Extension installed/updated."), await y();
  const a = await u.getCachedQuota();
  a && g(a);
});
chrome.runtime.onStartup.addListener(async () => {
  await y();
  const a = await u.getCachedQuota();
  a && g(a);
});
u.onSettingsChange(async () => {
  await y();
});
E.onMessage(async (a, t) => a.type === "GET_QUOTA" ? { success: !0, data: await S(a.force || !1) } : a.type === "ON_REPLY_FINISHED" ? { success: !0, data: await S(!0) } : a.type === "QUOTA_UPDATED" && a.data ? (await u.saveQuota(a.data), g(a.data), { success: !0 }) : a.type === "GET_SETTINGS" ? { success: !0, data: await u.getSettings() } : a.type === "SAVE_SETTINGS" ? { success: !0, data: await u.saveSettings(a.settings) } : { success: !1, error: "Unknown message type" });
