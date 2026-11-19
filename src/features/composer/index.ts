/**
 * Gemini Copilot - Feature: Composer Enhancements (P1)
 * 
 * - Draft auto-save & restore per conversation
 * - Send key customizer (Enter vs. Ctrl/Cmd+Enter)
 * - LaTeX formula click-to-copy
 * - Widescreen layout toggle
 */
import { GeminiAdapter } from '../../sites/gemini';
import { StorageManager } from '../../core/storage';
import { LifecycleManager } from '../../core/lifecycle';
import { ExtensionSettings } from '../../types';

export class ComposerTools {
  private settings: ExtensionSettings | null = null;
  private currentConversationId: string = '';
  private draftDebounceTimer: number | null = null;
  private widescreenStyleTag: HTMLStyleElement | null = null;

  async init(): Promise<void> {
    this.settings = await StorageManager.getSettings();
    this.currentConversationId = GeminiAdapter.getConversationId();

    this.applyWidescreen(this.settings.enableWidescreen, this.settings.widescreenWidth);
    this.setupDraftAndSendKeys();
    this.setupLatexCopy();

    // Listen to route changes to update drafts
    LifecycleManager.onRoute(async () => {
      this.currentConversationId = GeminiAdapter.getConversationId();
      await this.restoreDraft();
    });

    // Listen to settings changes
    StorageManager.onSettingsChange((newSettings) => {
      this.settings = newSettings;
      this.applyWidescreen(newSettings.enableWidescreen, newSettings.widescreenWidth);
    });
  }

  /**
   * Setup draft auto-save and Enter vs Ctrl+Enter send keys
   */
  private setupDraftAndSendKeys(): void {
    const attachToInput = () => {
      const inputEl = GeminiAdapter.getInputElement();
      if (!inputEl || inputEl.getAttribute('data-copilot-bound') === 'true') return;
      inputEl.setAttribute('data-copilot-bound', 'true');

      // Restore existing draft
      this.restoreDraft();

      // Auto-save on input
      inputEl.addEventListener('input', () => {
        if (!this.settings?.enableDraftAutoSave) return;
        if (this.draftDebounceTimer) {
          window.clearTimeout(this.draftDebounceTimer);
        }
        this.draftDebounceTimer = window.setTimeout(async () => {
          const text = this.getInputText(inputEl);
          await StorageManager.saveDraft(this.currentConversationId, text);
        }, 400);
      });

      // Send key interception
      inputEl.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if (!this.settings || this.settings.sendKeyMode !== 'ctrl_enter') return;

          // In ctrl_enter mode:
          // - Enter alone inserts a newline
          // - Ctrl+Enter or Cmd+Enter triggers Send
          if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.stopPropagation(); // prevent Gemini from sending
            // Default browser behavior inside contenteditable will insert newline
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            // Trigger send button
            e.preventDefault();
            const { button } = GeminiAdapter.getSendStopButton();
            if (button && !button.hasAttribute('disabled')) {
              button.click();
              // Clear saved draft on send
              StorageManager.saveDraft(this.currentConversationId, '');
            }
          }
        },
        true // capture phase to intercept before Gemini Angular handlers
      );

      // Clear draft on send button click
      const { button } = GeminiAdapter.getSendStopButton();
      button?.addEventListener('click', () => {
        StorageManager.saveDraft(this.currentConversationId, '');
      });
    };

    attachToInput();
    // Re-check periodically if input is replaced during SPA navigation
    window.setInterval(attachToInput, 2000);
  }

  private getInputText(el: HTMLElement): string {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return el.value;
    }
    return el.innerText || el.textContent || '';
  }

  private setInputText(el: HTMLElement, text: string): void {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.innerText = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  private async restoreDraft(): Promise<void> {
    if (!this.settings?.enableDraftAutoSave) return;
    const inputEl = GeminiAdapter.getInputElement();
    if (!inputEl) return;

    const currentText = this.getInputText(inputEl).trim();
    if (currentText) return; // already has content, do not overwrite

    const draft = await StorageManager.getDraft(this.currentConversationId);
    if (draft && draft.trim()) {
      this.setInputText(inputEl, draft);
      console.log('[Gemini Copilot] Restored draft for conversation:', this.currentConversationId);
    }
  }

  /**
   * Setup click-to-copy for LaTeX formulas
   */
  private setupLatexCopy(): void {
    const processMathNodes = () => {
      if (!this.settings?.enableLatexCopy) return;

      const mathNodes = document.querySelectorAll<HTMLElement>(
        '.katex, math, .math-block, [data-math]:not([data-copilot-copy])'
      );

      mathNodes.forEach((node) => {
        node.setAttribute('data-copilot-copy', 'true');
        node.style.cursor = 'pointer';
        node.title = '点击复制 LaTeX 公式源码';

        node.addEventListener('click', (e) => {
          e.stopPropagation();
          const latexSource = this.extractLatex(node);
          if (latexSource) {
            navigator.clipboard.writeText(latexSource).then(() => {
              this.showCopyToast(node, '已复制 LaTeX 源码');
            });
          }
        });
      });
    };

    processMathNodes();
    window.setInterval(processMathNodes, 2500);
  }

  private extractLatex(node: HTMLElement): string {
    // 1. Check annotation tag with TeX encoding (KaTeX standard)
    const annotation = node.querySelector('annotation[encoding*="tex"]');
    if (annotation && annotation.textContent) {
      return annotation.textContent.trim();
    }
    // 2. Check data attribute
    const dataMath = node.getAttribute('data-math') || node.getAttribute('data-latex');
    if (dataMath) return dataMath.trim();

    // 3. Check MathML alt text
    const altText = node.getAttribute('alttext');
    if (altText) return altText.trim();

    return node.innerText?.trim() || '';
  }

  private showCopyToast(targetEl: HTMLElement, text: string): void {
    const toast = document.createElement('div');
    toast.className = 'gemini-copilot-copy-toast';
    toast.textContent = text;
    Object.assign(toast.style, {
      position: 'absolute',
      background: '#111827',
      color: '#FFFFFF',
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '4px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      zIndex: '100000',
      pointerEvents: 'none',
      transition: 'opacity 0.2s',
      opacity: '1'
    });

    const rect = targetEl.getBoundingClientRect();
    toast.style.left = `${rect.left + window.scrollX}px`;
    toast.style.top = `${rect.top + window.scrollY - 24}px`;

    document.body.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = '0';
      window.setTimeout(() => toast.remove(), 250);
    }, 1200);
  }

  /**
   * Apply / remove widescreen layout CSS
   */
  private applyWidescreen(enable: boolean, width: string): void {
    if (!enable) {
      if (this.widescreenStyleTag) {
        this.widescreenStyleTag.remove();
        this.widescreenStyleTag = null;
      }
      return;
    }

    if (!this.widescreenStyleTag) {
      this.widescreenStyleTag = document.createElement('style');
      this.widescreenStyleTag.id = 'gemini-copilot-widescreen-style';
      document.head.appendChild(this.widescreenStyleTag);
    }

    const targetWidth = width || '1200px';
    this.widescreenStyleTag.textContent = `
      .conversation-container,
      main .chat-history,
      chat-window,
      .chat-window-container,
      infinite-scroller,
      .bottom-container {
        max-width: ${targetWidth} !important;
        width: 100% !important;
      }
    `;
  }
}
