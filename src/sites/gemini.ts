/**
 * Gemini Copilot - Semantic Adapter Layer (src/sites/gemini.ts)
 * 
 * Centralized DOM selector abstraction and observer engine.
 * Decouples website structure volatility from core extension features.
 */
import { TurnNode } from '../types';

export class GeminiAdapter {
  private static turnObserver: MutationObserver | null = null;
  private static debounceTimer: number | null = null;
  private static buttonObserver: MutationObserver | null = null;
  private static wasGenerating = false;

  /**
   * Extract current conversation ID from the URL
   */
  static getConversationId(): string {
    const pathname = window.location.pathname;
    // Patterns: /app/abc1234567, /c/abc1234567, or search params
    const match = pathname.match(/\/(?:app|c)\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('c') || params.get('id');
    if (idParam) return idParam;
    return 'default_conversation';
  }

  /**
   * Find main conversation scroll container with multi-tier fallbacks
   */
  static getConversationContainer(): HTMLElement | null {
    const selectors = [
      'main',
      'chat-window',
      'infinite-scroller',
      '.conversation-container',
      'div[role="main"]',
      '.chat-history',
      '#chat-history'
    ];
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) return el;
    }
    return document.querySelector('main') || document.body;
  }

  /**
   * Parse and extract all conversation turns
   */
  static getTurns(): TurnNode[] {
    const container = this.getConversationContainer();
    if (!container) return [];

    // Strategy 1: Look for explicit turn custom elements or role attributes
    const turnSelectors = [
      'conversation-turn',
      'div.conversation-turn',
      'div[data-message-author-role="user"]',
      'user-query',
      'div.user-query-container'
    ];

    let turnContainers: HTMLElement[] = [];
    for (const sel of turnSelectors) {
      const found = Array.from(container.querySelectorAll<HTMLElement>(sel));
      if (found.length > 0) {
        turnContainers = found;
        break;
      }
    }

    // If turn items are paired inside parent units
    if (turnContainers.length === 0) {
      // Fallback Strategy 2: Search for any element containing both user query & model response
      const queries = Array.from(container.querySelectorAll<HTMLElement>('user-query, [data-message-author-role="user"], .query-text'));
      turnContainers = queries;
    }

    const turns: TurnNode[] = [];

    turnContainers.forEach((el, index) => {
      // Find user prompt element & text
      let userEl: HTMLElement | null = el.matches('user-query, [data-message-author-role="user"]')
        ? el
        : el.querySelector<HTMLElement>('user-query, [data-message-author-role="user"], .query-text, .user-query-content');

      let userText = '';
      if (userEl) {
        userText = userEl.innerText?.trim() || '';
      } else {
        userText = el.innerText?.trim() || '';
      }

      // If text is empty, check nested paragraphs
      if (!userText) {
        const p = el.querySelector('p');
        userText = p?.innerText?.trim() || `Turn ${index + 1}`;
      }

      // User prompt snippet (first 60 characters)
      const cleanText = userText.replace(/\s+/g, ' ');
      const userSnippet = cleanText.length > 60 ? cleanText.slice(0, 57) + '...' : cleanText;

      // Find model response element & text
      let modelEl: HTMLElement | null = null;
      let nextSibling = el.nextElementSibling as HTMLElement | null;
      if (nextSibling && (nextSibling.matches('model-response, [data-message-author-role="model"]') || nextSibling.querySelector('model-response'))) {
        modelEl = nextSibling.matches('model-response') ? nextSibling : nextSibling.querySelector('model-response, [data-message-author-role="model"]');
      } else {
        // Try searching inside parent turn container
        const parentTurn = el.closest('conversation-turn, .conversation-container, .turn-container');
        if (parentTurn) {
          modelEl = parentTurn.querySelector<HTMLElement>('model-response, [data-message-author-role="model"], .model-response-text, message-content');
        }
      }

      let modelText = modelEl?.innerText?.trim() || '';

      // Check for code blocks and math formulas
      const hasCode = !!(modelEl?.querySelector('pre, code, .code-block') || el.querySelector('pre, code'));
      const hasMath = !!(modelEl?.querySelector('.katex, .math-block, math, [data-math]') || el.querySelector('.katex, math'));

      const id = el.getAttribute('id') || el.getAttribute('data-turn-id') || `turn-${index + 1}`;

      turns.push({
        id,
        index: index + 1,
        userPrompt: userText,
        userSnippet: userSnippet || `轮次 ${index + 1}`,
        modelResponse: modelText,
        hasCode,
        hasMath,
        isStarred: false,
        element: el,
        userElement: userEl || el,
        modelElement: modelEl || undefined
      });
    });

    return turns;
  }

  /**
   * Observe conversation DOM mutations with 200ms debounce
   */
  static observeConversation(onUpdate: (turns: TurnNode[]) => void): () => void {
    if (this.turnObserver) {
      this.turnObserver.disconnect();
    }

    const container = this.getConversationContainer() || document.body;

    this.turnObserver = new MutationObserver(() => {
      if (this.debounceTimer) {
        window.clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        const turns = this.getTurns();
        onUpdate(turns);
      }, 200);
    });

    this.turnObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: false
    });

    // Initial emit
    onUpdate(this.getTurns());

    return () => {
      if (this.turnObserver) {
        this.turnObserver.disconnect();
        this.turnObserver = null;
      }
      if (this.debounceTimer) {
        window.clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    };
  }

  /**
   * Detect send / stop generating button state
   */
  static getSendStopButton(): { isGenerating: boolean; button: HTMLElement | null } {
    // Stop buttons typically have aria-label "Stop", "停止", or icon with stop symbol
    const stopSelectors = [
      'button[aria-label*="Stop"]',
      'button[aria-label*="停止"]',
      'button[data-test-id*="stop"]',
      'button.stop-generating-button',
      'mat-icon[fonticon="stop"]'
    ];

    for (const sel of stopSelectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetParent !== null) {
        // Visible stop button
        return { isGenerating: true, button: el.closest('button') || el };
      }
    }

    const sendSelectors = [
      'button[aria-label*="Send"]',
      'button[aria-label*="发送"]',
      'button[data-test-id*="send"]',
      'button.send-button'
    ];

    for (const sel of sendSelectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        return { isGenerating: false, button: el };
      }
    }

    return { isGenerating: false, button: null };
  }

  /**
   * Listen to reply finish event (Stop -> Send transition)
   */
  static observeReplyFinish(onFinish: () => void): () => void {
    if (this.buttonObserver) {
      this.buttonObserver.disconnect();
    }

    this.wasGenerating = this.getSendStopButton().isGenerating;

    this.buttonObserver = new MutationObserver(() => {
      const { isGenerating } = this.getSendStopButton();
      // If previously generating and now stopped => reply finished!
      if (this.wasGenerating && !isGenerating) {
        this.wasGenerating = false;
        // Delay 1.5s to let final response render and server persist usage
        window.setTimeout(() => {
          onFinish();
        }, 1500);
      } else if (!this.wasGenerating && isGenerating) {
        this.wasGenerating = true;
      }
    });

    this.buttonObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'disabled', 'class']
    });

    return () => {
      if (this.buttonObserver) {
        this.buttonObserver.disconnect();
        this.buttonObserver = null;
      }
    };
  }

  /**
   * Find prompt input textarea
   */
  static getInputElement(): HTMLElement | null {
    const selectors = [
      'rich-textarea [contenteditable="true"]',
      'rich-textarea',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[aria-label*="Prompt"]',
      'textarea[aria-label*="提示"]',
      'textarea'
    ];
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) return el;
    }
    return null;
  }

  /**
   * Find top bar / header to anchor Quota Capsule
   */
  static getTopBar(): HTMLElement | null {
    const selectors = [
      'header',
      'mat-toolbar',
      'div[role="banner"]',
      '.top-bar',
      'div.header-container',
      'div.app-bar'
    ];
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) return el;
    }
    return null;
  }

  /**
   * Observe sidebar expansion/collapse to adjust layout
   */
  static observeSidebar(onStateChange: (width: number, isExpanded: boolean) => void): () => void {
    const sidebar = document.querySelector<HTMLElement>('mat-sidenav, nav[role="navigation"], .side-nav-container, .side-nav');
    if (!sidebar) return () => {};

    const check = () => {
      const rect = sidebar.getBoundingClientRect();
      const isExpanded = rect.width > 80;
      onStateChange(rect.width, isExpanded);
    };

    check();
    const observer = new ResizeObserver(() => check());
    observer.observe(sidebar);

    return () => observer.disconnect();
  }

  /**
   * Detect current page theme (dark or light)
   */
  static getTheme(): 'dark' | 'light' {
    if (
      document.body.classList.contains('dark-theme') ||
      document.documentElement.classList.contains('dark-theme') ||
      document.body.getAttribute('data-theme') === 'dark' ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.body.classList.contains('theme-dark')
    ) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Watch for theme changes
   */
  static observeTheme(onChange: (theme: 'dark' | 'light') => void): () => void {
    let currentTheme = this.getTheme();
    onChange(currentTheme);

    const observer = new MutationObserver(() => {
      const newTheme = this.getTheme();
      if (newTheme !== currentTheme) {
        currentTheme = newTheme;
        onChange(newTheme);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => observer.disconnect();
  }
}
