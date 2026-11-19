/**
 * Gemini Copilot - Content Script Entry Point
 * 
 * Injected into https://gemini.google.com/*
 */
import { LifecycleManager } from '../core/lifecycle';
import { StorageManager } from '../core/storage';
import { TimelineNavigator } from '../features/navigator';
import { QuotaMonitor } from '../features/quota';
import { ComposerTools } from '../features/composer';
import { ConversationExporter } from '../features/exporter';
import { MessageBus } from '../core/bus';
import { parseUsageText } from '../features/quota/parser';
import { QuotaData } from '../types';

async function bootstrap() {
  console.log('[Gemini Copilot] Initializing extension content script...');

  // 1. Patch SPA navigation
  LifecycleManager.patchHistoryNavigation();

  // 2. Inject global flash animation for turn jumping
  injectGlobalHighlightStyles();

  // 3. Actively sync usage if currently on /usage page
  syncUsageIfOnUsagePage();
  LifecycleManager.onRoute(() => {
    syncUsageIfOnUsagePage();
  });

  // 4. Load user settings
  const settings = await StorageManager.getSettings();

  // 5. Initialize Core Features (on chat pages)
  if (settings.enableTimeline && !window.location.pathname.includes('/usage')) {
    const navigator = new TimelineNavigator();
    await navigator.init();
  }

  if (settings.enableQuotaPill) {
    const quotaMonitor = new QuotaMonitor();
    await quotaMonitor.init();
  }

  if (!window.location.pathname.includes('/usage')) {
    const composer = new ComposerTools();
    await composer.init();
  }

  // 6. Handle external triggers (e.g. from Popup)
  MessageBus.onMessage((msg) => {
    if (msg.type === 'TRIGGER_EXPORT') {
      ConversationExporter.exportCurrentConversation(msg.format);
    }
  });

  console.log('[Gemini Copilot] All features mounted successfully in Shadow DOM.');
}

/**
 * When the user is directly on gemini.google.com/usage,
 * actively observe the rendered cards and immediately extract and store live metrics.
 */
function syncUsageIfOnUsagePage() {
  if (!window.location.pathname.includes('/usage')) return;

  const tryParseAndSync = async () => {
    const bodyText = document.body?.innerText || '';
    if (bodyText.includes('已使用') || bodyText.includes('当前用量') || bodyText.includes('Weekly limit') || bodyText.includes('Current usage')) {
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

        console.log('[Gemini Copilot] Synced quota directly from /usage page:', quotaData);
        await StorageManager.saveQuota(quotaData);
        await MessageBus.broadcastToGeminiTabs({ type: 'QUOTA_UPDATED', data: quotaData });
      }
    }
  };

  tryParseAndSync();
  const obs = new MutationObserver(() => tryParseAndSync());
  obs.observe(document.body, { childList: true, subtree: true });
}

/**
 * Injects a temporary outline flash animation for turn jump targets
 */
function injectGlobalHighlightStyles() {
  const style = document.createElement('style');
  style.id = 'gemini-copilot-global-styles';
  style.textContent = `
    @keyframes geminiCopilotFlashAnim {
      0% {
        outline: 3px solid #1D4ED8;
        outline-offset: 4px;
        box-shadow: 0 0 16px rgba(29, 78, 216, 0.4);
      }
      50% {
        outline: 3px solid #047857;
        outline-offset: 4px;
        box-shadow: 0 0 16px rgba(4, 120, 87, 0.4);
      }
      100% {
        outline: 3px solid transparent;
        outline-offset: 4px;
        box-shadow: none;
      }
    }

    .gemini-copilot-highlight-flash {
      animation: geminiCopilotFlashAnim 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important;
      border-radius: 8px !important;
    }
  `;
  document.head.appendChild(style);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
