/**
 * Gemini Copilot - Lifecycle and SPA Route Management
 */

export class LifecycleManager {
  private static isPatched = false;
  private static listeners: Array<(newUrl: string, oldUrl: string) => void> = [];
  private static currentUrl = window.location.href;

  /**
   * Patches pushState and replaceState to catch SPA navigation
   */
  static patchHistoryNavigation(): void {
    if (this.isPatched) return;
    this.isPatched = true;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      LifecycleManager.checkUrlChange();
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      LifecycleManager.checkUrlChange();
      return result;
    };

    window.addEventListener('popstate', () => LifecycleManager.checkUrlChange());
    window.addEventListener('hashchange', () => LifecycleManager.checkUrlChange());
  }

  /**
   * Checks if URL changed and notifies subscribers
   */
  private static checkUrlChange(): void {
    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      const oldUrl = this.currentUrl;
      this.currentUrl = newUrl;
      for (const listener of this.listeners) {
        try {
          listener(newUrl, oldUrl);
        } catch (err) {
          console.error('[Gemini Copilot Lifecycle] Listener error:', err);
        }
      }
    }
  }

  /**
   * Registers a URL change listener
   */
  static onRoute(callback: (newUrl: string, oldUrl: string) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Utility to mount a Shadow DOM component cleanly
   */
  static createShadowHost(hostId: string, styleContent: string): { host: HTMLElement; root: ShadowRoot } {
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      document.body.appendChild(host);
    }

    let root = host.shadowRoot;
    if (!root) {
      root = host.attachShadow({ mode: 'open' });
    }

    // Insert styles if not already present
    let styleTag = root.querySelector('style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      root.appendChild(styleTag);
    }
    styleTag.textContent = styleContent;

    return { host, root };
  }
}
