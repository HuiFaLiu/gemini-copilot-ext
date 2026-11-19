/**
 * Gemini Copilot - Quota Text/DOM Parser
 * 
 * Accurately parses Gemini usage metrics from text/DOM on gemini.google.com/usage
 * Handles Chinese and English versions:
 * - "当前用量" / "Current usage": e.g. "已使用 10%", "重置时间：20:21"
 * - "每周限额" / "Weekly limit": e.g. "已使用 9%", "重置时间：11月24日16:21"
 */
import { QuotaData, QuotaStatus } from '../../types';

export function parseUsageText(text: string): Partial<QuotaData> {
  const result: Partial<QuotaData> = {
    periodType: 'current'
  };

  try {
    if (!text || text.trim().length === 0) {
      return result;
    }

    // 1. Current / Daily Quota
    // Split text into section for "当前用量"
    const currentSectionMatch = text.match(/(?:当前用量|Current\s*usage)[\s\S]*?(?=(?:每周限额|Weekly\s*limit)|方案|$)/i);
    const currentText = currentSectionMatch ? currentSectionMatch[0] : text;

    // Match percentage in currentText: "已使用 10%", "已使用10%", "10% used", etc.
    const currentPctMatch = currentText.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) ||
                            currentText.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i) ||
                            text.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);

    if (currentPctMatch && currentPctMatch[1]) {
      const val = parseFloat(currentPctMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        result.percentage = val;
      }
    }

    // Match reset time in currentText: "重置时间：20:21", "重置时间: 20:21", "Resets at: 20:21"
    const currentResetMatch = currentText.match(/(?:重置时间|Resets?(?:\s*at|\s*in)?)[:：\s]*([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)/i) ||
                              currentText.match(/(?:重置时间|Resets?(?:\s*at|\s*in)?)[:：\s]*([^\n\r]+)/i);
    if (currentResetMatch && currentResetMatch[1]) {
      result.resetTimeText = `重置时间：${currentResetMatch[1].trim()}`;
    }

    // 2. Weekly Quota (每周限额)
    const weeklySectionMatch = text.match(/(?:每周限额|Weekly\s*limit)[\s\S]*?(?=方案|$)/i);
    if (weeklySectionMatch) {
      const weeklyText = weeklySectionMatch[0];
      const weeklyPctMatch = weeklyText.match(/(?:已使用|used)[:：\s]*(\d{1,3}(?:\.\d+)?)\s*%/i) ||
                             weeklyText.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:已使用|used)/i);
      if (weeklyPctMatch && weeklyPctMatch[1]) {
        result.weeklyPercentage = parseFloat(weeklyPctMatch[1]);
      }

      const weeklyResetMatch = weeklyText.match(/(?:重置时间|Resets?(?:\s*at|\s*in)?)[:：\s]*([^\n\r]+)/i);
      if (weeklyResetMatch && weeklyResetMatch[1]) {
        result.weeklyResetTimeText = `每周重置：${weeklyResetMatch[1].trim()}`;
      }
    }

    // Determine status based on percentage
    if (result.percentage !== undefined) {
      let status: QuotaStatus = 'ok';
      if (result.percentage >= 90) status = 'danger';
      else if (result.percentage >= 70) status = 'warning';
      result.status = status;
    }
  } catch (err) {
    console.warn('[Gemini Copilot Parser] Error parsing usage text:', err);
  }

  return result;
}
