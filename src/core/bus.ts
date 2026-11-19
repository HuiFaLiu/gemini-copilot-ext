/**
 * Gemini Copilot - Type-Safe Communication Message Bus
 */
import { MessageType, MessageResponse } from '../types';

export class MessageBus {
  /**
   * Sends a message to the Background Service Worker from Content Script or Popup
   */
  static async sendToBackground<T = any>(message: MessageType): Promise<MessageResponse<T>> {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response || { success: false, error: 'No response received' };
    } catch (err: any) {
      console.warn('[Gemini Copilot Bus] Failed to send message to background:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Broadcasts a message to all active Gemini tabs from Service Worker
   */
  static async broadcastToGeminiTabs(message: MessageType): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ url: '*://gemini.google.com/*' });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // tab might be unloaded or navigating, ignore
          });
        }
      }
    } catch (err) {
      console.warn('[Gemini Copilot Bus] Broadcast to tabs failed:', err);
    }
  }

  /**
   * Subscribes to messages
   */
  static onMessage(
    handler: (msg: MessageType, sender: chrome.runtime.MessageSender) => any | Promise<any>
  ): () => void {
    const listener = (
      msg: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (res: any) => void
    ) => {
      const result = handler(msg, sender);
      if (result instanceof Promise) {
        result
          .then((res) => sendResponse(res || { success: true }))
          .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
        return true; // asynchronous response
      } else if (result !== undefined) {
        sendResponse(result);
        return false;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }
}
