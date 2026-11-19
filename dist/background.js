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
    const t = (s, n) => {
      if (n === "local" && s[i.SETTINGS]) {
        const o = { ...f, ...s[i.SETTINGS].newValue };
        e(o);
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
    const s = await this.getStars(e), n = s.indexOf(t);
    let o = !1;
    n >= 0 ? (s.splice(n, 1), o = !1) : (s.push(t), o = !0);
    const c = `${i.STARS_PREFIX}${e}`;
    return await chrome.storage.local.set({ [c]: s }), o;
  }
}
class k {
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
    const t = (s, n, o) => {
      const c = e(s, n);
      if (c instanceof Promise)
        return c.then((r) => o(r || { success: !0 })).catch((r) => o({ success: !1, error: (r == null ? void 0 : r.message) || String(r) })), !0;
      if (c !== void 0)
        return o(c), !1;
    };
    return chrome.runtime.onMessage.addListener(t), () => chrome.runtime.onMessage.removeListener(t);
  }
}
function _(a) {
  const e = {
    periodType: "current"
  };
  try {
    if (!a || a.trim().length === 0)
      return e;
    const t = a.match(/(?:当前用量|Current\s*usage)[\s\S]*?(?=(?:每周限额|Weekly\s*limit)|方案|$)/i), s = t ? t[0] : a, n = s.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || s.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i) || a.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);
    if (n && n[1]) {
      const r = parseFloat(n[1]);
      !isNaN(r) && r >= 0 && r <= 100 && (e.percentage = r);
    }
    const o = s.match(/(?:重置时间|Resets?(?:\s*at|\s*in)?)[:：\s]*([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)/i) || s.match(/(?:重置时间|Resets?(?:\s*at|\s*in)?)[:：\s]*([^\n\r]+)/i);
    o && o[1] && (e.resetTimeText = `重置时间：${o[1].trim()}`);
    const c = a.match(/(?:每周限额|Weekly\s*limit)[\s\S]*?(?=方案|$)/i);
    if (c) {
      const r = c[0], l = r.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) || r.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i);
      l && l[1] && (e.weeklyPercentage = parseFloat(l[1]));
      const d = r.match(/(?:重置时间|Resets?(?:\s*at|\s*in)?)[:：\s]*([^\n\r]+)/i);
      d && d[1] && (e.weeklyResetTimeText = `每周重置：${d[1].trim()}`);
    }
    if (e.percentage !== void 0) {
      let r = "ok";
      e.percentage >= 90 ? r = "danger" : e.percentage >= 70 && (r = "warning"), e.status = r;
    }
  } catch (t) {
    console.warn("[Gemini Copilot Parser] Error parsing usage text:", t);
  }
  return e;
}
let T = !1, m = null, p = 0;
const S = [60, 120, 300];
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
async function w(a = !1) {
  const e = Date.now();
  if (!a && h > e) {
    const t = await u.getCachedQuota(), s = Math.ceil((h - e) / 1e3);
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
        const r = S[Math.min(p, S.length - 1)];
        p++, h = Date.now() + r * 1e3;
        const l = {
          percentage: 0,
          status: "rate_limited",
          lastUpdated: Date.now(),
          errorMessage: `请求过于频繁 (HTTP 429)，已触发指数退避保护 (${r}s)`
        };
        return g(l), l;
      }
      if (t.redirected && t.url.includes("accounts.google.com")) {
        const r = {
          percentage: 0,
          status: "unauthenticated",
          lastUpdated: Date.now(),
          errorMessage: "未登录 Google 账号，请在当前浏览器登录 Gemini"
        };
        return g(r), r;
      }
      if (!t.ok)
        throw new Error(`HTTP ${t.status}: ${t.statusText}`);
      const s = await t.text(), n = _(s);
      if (p = 0, h = 0, n.percentage !== void 0 && n.percentage > 0) {
        const r = n.percentage;
        let l = n.status || "ok";
        r >= 90 ? l = "danger" : r >= 70 && (l = "warning");
        const d = {
          percentage: r,
          usedPercentage: r,
          remainingPercentage: Math.max(0, 100 - r),
          resetTimeText: n.resetTimeText || "今日结束前重置",
          weeklyPercentage: n.weeklyPercentage,
          weeklyResetTimeText: n.weeklyResetTimeText,
          periodType: "current",
          status: l,
          lastUpdated: Date.now()
        };
        return await u.saveQuota(d), g(d), await k.broadcastToGeminiTabs({ type: "QUOTA_UPDATED", data: d }), d;
      }
      const o = await u.getCachedQuota();
      if (o && o.percentage > 0)
        return g(o), o;
      const c = {
        percentage: n.percentage ?? 0,
        resetTimeText: n.resetTimeText || "今日结束前重置",
        weeklyPercentage: n.weeklyPercentage,
        weeklyResetTimeText: n.weeklyResetTimeText,
        periodType: "current",
        status: "ok",
        lastUpdated: Date.now()
      };
      return await u.saveQuota(c), g(c), c;
    } catch (t) {
      console.warn("[Gemini Copilot SW] Quota fetch failed:", t);
      const s = await u.getCachedQuota();
      if (s)
        return g(s), {
          ...s,
          status: "warning",
          errorMessage: `拉取失败，显示上次缓存: ${t.message || String(t)}`
        };
      const n = {
        percentage: 0,
        status: "error",
        lastUpdated: Date.now(),
        errorMessage: t.message || "获取限额数据失败"
      };
      return g(n), n;
    } finally {
      T = !1, m = null;
    }
  })()), m;
}
chrome.alarms.onAlarm.addListener(async (a) => {
  a.name === "gemini_quota_periodic_refresh" && (await chrome.tabs.query({ url: "*://gemini.google.com/*", active: !0 })).length > 0 && await w(!1);
});
async function y() {
  const a = await u.getSettings(), e = Math.max(1, Math.round(a.autoRefreshInterval / 60));
  chrome.alarms.create("gemini_quota_periodic_refresh", {
    periodInMinutes: Math.max(1, e)
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
k.onMessage(async (a, e) => a.type === "GET_QUOTA" ? { success: !0, data: await w(a.force || !1) } : a.type === "ON_REPLY_FINISHED" ? { success: !0, data: await w(!0) } : a.type === "QUOTA_UPDATED" && a.data ? (await u.saveQuota(a.data), g(a.data), { success: !0 }) : a.type === "GET_SETTINGS" ? { success: !0, data: await u.getSettings() } : a.type === "SAVE_SETTINGS" ? { success: !0, data: await u.saveSettings(a.settings) } : { success: !1, error: "Unknown message type" });
