/**
 * Gemini Copilot - Hidden Iframe Quota Fetcher (Degraded Pipeline)
 * 
 * Uses declarativeNetRequest ruleset (usage_dnr.json) to silently load
 * https://gemini.google.com/usage inside a hidden same-origin iframe,
 * wait for Angular to render the cards, extract live metrics, and clean up.
 */
import { QuotaData } from '../../types';
import { parseUsageText } from './parser';
import { StorageManager } from '../../core/storage';
import { MessageBus } from '../../core/bus';

let isFetchingViaIframe = false;
let ongoingIframePromise: Promise<QuotaData | null> | null = null;

export class IframeQuotaFetcher {
  /**
   * Fetch quota data using a temporary hidden iframe
   */
  static async fetch(): Promise<QuotaData | null> {
    if (isFetchingViaIframe && ongoingIframePromise) {
      return ongoingIframePromise;
    }

    isFetchingViaIframe = true;
    ongoingIframePromise = new Promise<QuotaData | null>((resolve) => {
      let iframe: HTMLIFrameElement | null = null;
      let checkTimer: number | null = null;
      let timeoutTimer: number | null = null;

      const cleanup = () => {
        if (checkTimer) {
          window.clearInterval(checkTimer);
          checkTimer = null;
        }
        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
          iframe = null;
        }
        isFetchingViaIframe = false;
        ongoingIframePromise = null;
      };

      try {
        iframe = document.createElement('iframe');
        iframe.src = 'https://gemini.google.com/usage';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;border:none;';

        const startTime = Date.now();

        // Check if content has rendered in iframe every 250ms
        const checkContent = async () => {
          if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
            return;
          }

          try {
            const bodyText = iframe.contentDocument.body.innerText || '';
            
            // Check if Angular has rendered the usage cards
            if (bodyText.includes('已使用') || bodyText.includes('当前用量') || bodyText.includes('用量限额') || bodyText.includes('Weekly limit') || bodyText.includes('Current usage')) {
              const parsed = parseUsageText(bodyText);
              if (parsed.percentage !== undefined) {
                const quotaData: QuotaData = {
                  percentage: parsed.percentage,
                  usedPercentage: parsed.percentage,
                  remainingPercentage: Math.max(0, 100 - parsed.percentage),
                  resetTimeText: parsed.resetTimeText || '今日结束前重置',
                  weeklyPercentage: parsed.weeklyPercentage,
                  weeklyResetTimeText: parsed.weeklyResetTimeText,
                  periodType: 'current',
                  status: parsed.status || 'ok',
                  lastUpdated: Date.now()
                };

                cleanup();

                // Cache & notify background and tabs
                await StorageManager.saveQuota(quotaData);
                await MessageBus.broadcastToGeminiTabs({ type: 'QUOTA_UPDATED', data: quotaData });
                resolve(quotaData);
                return;
              }
            }
          } catch (err) {
            // Ignore cross-origin transient issues during initial load
          }

          // Timeout after 4 seconds
          if (Date.now() - startTime > 4000) {
            cleanup();
            resolve(null);
          }
        };

        iframe.onload = () => {
          checkTimer = window.setInterval(checkContent, 250);
          checkContent();
        };

        iframe.onerror = () => {
          cleanup();
          resolve(null);
        };

        // Absolute safety timeout of 5s
        timeoutTimer = window.setTimeout(() => {
          cleanup();
          resolve(null);
        }, 5000);

        document.body.appendChild(iframe);
      } catch (err) {
        cleanup();
        resolve(null);
      }
    });

    return ongoingIframePromise;
  }
}
