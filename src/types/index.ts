/**
 * Gemini Copilot - Core Type Definitions
 */

export interface TurnNode {
  id: string;
  index: number;
  userPrompt: string;
  userSnippet: string;
  modelResponse: string;
  hasCode: boolean;
  hasMath: boolean;
  isStarred: boolean;
  timestamp?: number;
  element: HTMLElement;
  userElement?: HTMLElement;
  modelElement?: HTMLElement;
}

export type QuotaStatus = 'ok' | 'warning' | 'danger' | 'error' | 'unauthenticated' | 'rate_limited';

export interface QuotaData {
  percentage: number; // 0 - 100
  usedUnits?: number;
  totalUnits?: number;
  usedPercentage?: number;
  remainingPercentage?: number;
  resetTimeText?: string;
  resetTimestamp?: number;
  periodType?: 'current' | 'weekly' | 'daily';
  weeklyUsed?: number;
  weeklyTotal?: number;
  weeklyPercentage?: number;
  weeklyResetTimeText?: string;
  status: QuotaStatus;
  lastUpdated: number;
  errorMessage?: string;
}

export interface ExtensionSettings {
  autoRefreshInterval: number; // in seconds (min 15, default 45)
  enableTimeline: boolean;
  enableQuotaPill: boolean;
  enableDraftAutoSave: boolean;
  sendKeyMode: 'enter' | 'ctrl_enter'; // enter = default, ctrl_enter = Cmd/Ctrl+Enter sends
  enableLatexCopy: boolean;
  enableWidescreen: boolean;
  widescreenWidth: string; // e.g. '1200px', '1400px', '100%'
  pillVisible: boolean; // toggle state with Alt+U
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoRefreshInterval: 45,
  enableTimeline: true,
  enableQuotaPill: true,
  enableDraftAutoSave: true,
  sendKeyMode: 'enter',
  enableLatexCopy: true,
  enableWidescreen: false,
  widescreenWidth: '1200px',
  pillVisible: true
};

export type MessageType =
  | { type: 'GET_QUOTA'; force?: boolean }
  | { type: 'QUOTA_UPDATED'; data: QuotaData }
  | { type: 'ON_REPLY_FINISHED' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Partial<ExtensionSettings> }
  | { type: 'TRIGGER_EXPORT'; format: 'markdown' | 'json' };

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
