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
  PILL_POSITION: "gemini_copilot_pill_pos",
  DRAFTS_PREFIX: "gemini_copilot_draft_",
  STARS_PREFIX: "gemini_copilot_stars_"
};
class l {
  /**
   * Retrieves user settings merged with defaults
   */
  static async getSettings() {
    try {
      const e = await chrome.storage.local.get(i.SETTINGS);
      if (e[i.SETTINGS])
        return { ...f, ...e[i.SETTINGS] };
    } catch (e) {
      console.warn("[Gemini Copilot] Error reading settings from storage:", e);
    }
    return { ...f };
  }
  /**
   * Updates partial user settings
   */
  static async saveSettings(e) {
    const s = { ...await this.getSettings(), ...e };
    return s.autoRefreshInterval < 15 && (s.autoRefreshInterval = 15), await chrome.storage.local.set({ [i.SETTINGS]: s }), s;
  }
  /**
   * Subscribes to settings changes
   */
  static onSettingsChange(e) {
    const t = (s, r) => {
      if (r === "local" && s[i.SETTINGS]) {
        const c = { ...f, ...s[i.SETTINGS].newValue };
        e(c);
      }
    };
    return chrome.storage.onChanged.addListener(t), () => chrome.storage.onChanged.removeListener(t);
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
  static async saveQuota(e) {
    await chrome.storage.local.set({ [i.QUOTA]: e });
  }
  /**
   * Retrieves saved floating pill coordinates
   */
  static async getPillPosition() {
    try {
      return (await chrome.storage.local.get(i.PILL_POSITION))[i.PILL_POSITION] || null;
    } catch {
      return null;
    }
  }
  /**
   * Persists floating pill coordinates
   */
  static async savePillPosition(e) {
    try {
      await chrome.storage.local.set({ [i.PILL_POSITION]: e });
    } catch {
    }
  }
  /**
   * Gets draft for a specific conversation
   */
  static async getDraft(e) {
    if (!e) return "";
    try {
      const t = `${i.DRAFTS_PREFIX}${e}`;
      return (await chrome.storage.local.get(t))[t] || "";
    } catch {
      return "";
    }
  }
  /**
   * Saves draft for a specific conversation
   */
  static async saveDraft(e, t) {
    if (!e) return;
    const s = `${i.DRAFTS_PREFIX}${e}`;
    t.trim() ? await chrome.storage.local.set({ [s]: t }) : await chrome.storage.local.remove(s);
  }
  /**
   * Gets list of starred turn IDs for a conversation
   */
  static async getStars(e) {
    if (!e) return [];
    try {
      const t = `${i.STARS_PREFIX}${e}`, s = await chrome.storage.local.get(t);
      return Array.isArray(s[t]) ? s[t] : [];
    } catch {
      return [];
    }
  }
  /**
   * Toggles star state for a specific turn
   */
  static async toggleStar(e, t) {
    if (!e || !t) return !1;
    const s = await this.getStars(e), r = s.indexOf(t);
    let c = !1;
    r >= 0 ? (s.splice(r, 1), c = !1) : (s.push(t), c = !0);
    const u = `${i.STARS_PREFIX}${e}`;
    return await chrome.storage.local.set({ [u]: s }), c;
  }
}
class x {
  /**
   * Sends a message to the Background Service Worker from Content Script or Popup
   */
  static async sendToBackground(e) {
    try {
      return await chrome.runtime.sendMessage(e) || { success: !1, error: "No response received" };
    } catch (t) {
      return console.warn("[Gemini Copilot Bus] Failed to send message to background:", t), { success: !1, error: t.message || String(t) };
    }
  }
  /**
   * Broadcasts a message to all active Gemini tabs from Service Worker
   */
  static async broadcastToGeminiTabs(e) {
    try {
      const t = await chrome.tabs.query({ url: "*://gemini.google.com/*" });
      for (const s of t)
        s.id && chrome.tabs.sendMessage(s.id, e).catch(() => {
        });
    } catch (t) {
      console.warn("[Gemini Copilot Bus] Broadcast to tabs failed:", t);
    }
  }
  /**
   * Subscribes to messages
   */
  static onMessage(e) {
    const t = (s, r, c) => {
      const u = e(s, r);
      if (u instanceof Promise)
        return u.then((n) => c(n || { success: !0 })).catch((n) => c({ success: !1, error: (n == null ? void 0 : n.message) || String(n) })), !0;
      if (u !== void 0)
        return c(u), !1;
    };
    return chrome.runtime.onMessage.addListener(t), () => chrome.runtime.onMessage.removeListener(t);
  }
}
function E(a) {
  return a ? a.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : "";
}
function p(a) {
  const e = a.match(new RegExp("(?:(?<!counter-)重置时间|将于|Resets?\\s+(?:at|in))[:：\\s]*([0-9]{1,2}月[0-9]{1,2}日\\s*[0-9]{1,2}:[0-9]{2}|[0-9]{1,2}:[0-9]{2}(?:\\s*[AP]M)?|[0-9]+\\s*(?:hours?|mins?|分|小时|天)[^\\n\\r<]{0,12})", "i"));
  return e ? e[1].trim() : null;
}
function k(a) {
  const e = {
    periodType: "current"
  };
  try {
    const t = E(a);
    if (!t || t.length === 0)
      return e;
    const s = t.match(/(?:当前用量|Current\s*usage)[\s\S]*?(?=(?:每周限额|Weekly\s*limit)|方案|$)/i), r = s ? s[0] : t, c = r.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || r.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i) || t.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);
    if (c && c[1]) {
      const o = parseFloat(c[1]);
      !isNaN(o) && o >= 0 && o <= 100 && (e.percentage = o);
    }
    const u = p(r) || p(t);
    u && (e.resetTimeText = `重置时间：${u}`);
    const n = t.match(/(?:每周限额|Weekly\s*limit)[\s\S]*?(?=方案|$)/i);
    if (n) {
      const o = n[0], d = o.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || o.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i);
      d && d[1] && (e.weeklyPercentage = parseFloat(d[1]));
      const _ = p(o);
      _ && (e.weeklyResetTimeText = `每周重置：${_}`);
    }
    if (e.percentage !== void 0) {
      let o = "ok";
      e.percentage >= 90 ? o = "danger" : e.percentage >= 70 && (o = "warning"), e.status = o;
    }
  } catch (t) {
    console.warn("[Gemini Copilot Parser] Error parsing usage text:", t);
  }
  return e;
}
let T = !1, m = null, w = 0;
const P = [60, 120, 300];
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
  const e = Math.round(a.percentage);
  chrome.action.setBadgeText({ text: `${e}%` }), e < 70 ? chrome.action.setBadgeBackgroundColor({ color: "#047857" }) : e < 90 ? chrome.action.setBadgeBackgroundColor({ color: "#D97706" }) : chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
}
async function S(a = !1) {
  const e = Date.now();
  if (!a && h > e) {
    const t = await l.getCachedQuota(), s = Math.ceil((h - e) / 1e3);
    return t || {
      percentage: 0,
      status: "rate_limited",
      lastUpdated: e,
      errorMessage: `429 限流保护中，请在 ${s} 秒后重试`
    };
  }
  return T && m || (T = !0, m = (async () => {
    try {
      const t = await fetch("https://gemini.google.com/usage", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      if (t.status === 429) {
        const n = P[Math.min(w, P.length - 1)];
        w++, h = Date.now() + n * 1e3;
        const o = {
          percentage: 0,
          status: "rate_limited",
          lastUpdated: Date.now(),
          errorMessage: `请求过于频繁 (HTTP 429)，已触发指数退避保护 (${n}s)`
        };
        return g(o), o;
      }
      if (t.redirected && t.url.includes("accounts.google.com")) {
        const n = {
          percentage: 0,
          status: "unauthenticated",
          lastUpdated: Date.now(),
          errorMessage: "未登录 Google 账号，请在当前浏览器登录 Gemini"
        };
        return g(n), n;
      }
      if (!t.ok)
        throw new Error(`HTTP ${t.status}: ${t.statusText}`);
      const s = await t.text(), r = k(s);
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
        return await l.saveQuota(d), g(d), await x.broadcastToGeminiTabs({ type: "QUOTA_UPDATED", data: d }), d;
      }
      const c = await l.getCachedQuota();
      return c ? (g(c), c) : {
        percentage: 0,
        resetTimeText: "点击刷新以同步",
        periodType: "current",
        status: "ok",
        lastUpdated: Date.now()
      };
    } catch (t) {
      console.warn("[Gemini Copilot SW] Quota fetch failed:", t);
      const s = await l.getCachedQuota();
      if (s)
        return g(s), {
          ...s,
          status: "warning",
          errorMessage: `拉取失败，显示上次缓存: ${t.message || String(t)}`
        };
      const r = {
        percentage: 0,
        status: "error",
        lastUpdated: Date.now(),
        errorMessage: t.message || "获取限额数据失败"
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
  const a = await l.getSettings(), e = Math.max(1, Math.round(a.autoRefreshInterval / 60));
  chrome.alarms.create("gemini_quota_periodic_refresh", {
    periodInMinutes: Math.max(1, e)
  });
}
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Gemini Copilot] Extension installed/updated."), await y();
  const a = await l.getCachedQuota();
  a && g(a);
});
chrome.runtime.onStartup.addListener(async () => {
  await y();
  const a = await l.getCachedQuota();
  a && g(a);
});
l.onSettingsChange(async () => {
  await y();
});
x.onMessage(async (a, e) => a.type === "GET_QUOTA" ? { success: !0, data: await S(a.force || !1) } : a.type === "ON_REPLY_FINISHED" ? { success: !0, data: await S(!0) } : a.type === "QUOTA_UPDATED" && a.data ? (await l.saveQuota(a.data), g(a.data), { success: !0 }) : a.type === "GET_SETTINGS" ? { success: !0, data: await l.getSettings() } : a.type === "SAVE_SETTINGS" ? { success: !0, data: await l.saveSettings(a.settings) } : { success: !1, error: "Unknown message type" });
