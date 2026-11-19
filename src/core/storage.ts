/**
 * Gemini Copilot - Storage Manager (chrome.storage.local)
 */
import { ExtensionSettings, DEFAULT_SETTINGS, QuotaData } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'gemini_copilot_settings',
  QUOTA: 'gemini_copilot_quota',
  DRAFTS_PREFIX: 'gemini_copilot_draft_',
  STARS_PREFIX: 'gemini_copilot_stars_'
};

export class StorageManager {
  /**
   * Retrieves user settings merged with defaults
   */
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      if (result[STORAGE_KEYS.SETTINGS]) {
        return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
      }
    } catch (err) {
      console.warn('[Gemini Copilot] Error reading settings from storage:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Updates partial user settings
   */
  static async saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const updated: ExtensionSettings = { ...current, ...settings };
    // enforce safety limit: lower bound 15 seconds
    if (updated.autoRefreshInterval < 15) {
      updated.autoRefreshInterval = 15;
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    return updated;
  }

  /**
   * Subscribes to settings changes
   */
  static onSettingsChange(callback: (newSettings: ExtensionSettings) => void): () => void {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        const newSettings = { ...DEFAULT_SETTINGS, ...changes[STORAGE_KEYS.SETTINGS].newValue };
        callback(newSettings);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  /**
   * Retrieves cached quota data
   */
  static async getCachedQuota(): Promise<QuotaData | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.QUOTA);
      return result[STORAGE_KEYS.QUOTA] || null;
    } catch {
      return null;
    }
  }

  /**
   * Saves quota data to cache
   */
  static async saveQuota(quota: QuotaData): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.QUOTA]: quota });
  }

  /**
   * Gets draft for a specific conversation
   */
  static async getDraft(conversationId: string): Promise<string> {
    if (!conversationId) return '';
    try {
      const key = `${STORAGE_KEYS.DRAFTS_PREFIX}${conversationId}`;
      const res = await chrome.storage.local.get(key);
      return res[key] || '';
    } catch {
      return '';
    }
  }

  /**
   * Saves draft for a specific conversation
   */
  static async saveDraft(conversationId: string, draftText: string): Promise<void> {
    if (!conversationId) return;
    const key = `${STORAGE_KEYS.DRAFTS_PREFIX}${conversationId}`;
    if (!draftText.trim()) {
      await chrome.storage.local.remove(key);
    } else {
      await chrome.storage.local.set({ [key]: draftText });
    }
  }

  /**
   * Gets list of starred turn IDs for a conversation
   */
  static async getStars(conversationId: string): Promise<string[]> {
    if (!conversationId) return [];
    try {
      const key = `${STORAGE_KEYS.STARS_PREFIX}${conversationId}`;
      const res = await chrome.storage.local.get(key);
      return Array.isArray(res[key]) ? res[key] : [];
    } catch {
      return [];
    }
  }

  /**
   * Toggles star state for a specific turn
   */
  static async toggleStar(conversationId: string, turnId: string): Promise<boolean> {
    if (!conversationId || !turnId) return false;
    const stars = await this.getStars(conversationId);
    const index = stars.indexOf(turnId);
    let isNowStarred = false;
    if (index >= 0) {
      stars.splice(index, 1);
      isNowStarred = false;
    } else {
      stars.push(turnId);
      isNowStarred = true;
    }
    const key = `${STORAGE_KEYS.STARS_PREFIX}${conversationId}`;
    await chrome.storage.local.set({ [key]: stars });
    return isNowStarred;
  }
}
