/**
 * Gemini Copilot - Feature: Conversation Exporter (P1)
 * 
 * One-click clean export to Markdown (.md) or JSON (.json)
 */
import { GeminiAdapter } from '../../sites/gemini';
import { TurnNode } from '../../types';

export class ConversationExporter {
  /**
   * Export conversation in specified format
   */
  static exportCurrentConversation(format: 'markdown' | 'json'): void {
    const turns = GeminiAdapter.getTurns();
    if (!turns || turns.length === 0) {
      alert('未检测到当前对话的轮次内容，无法导出。');
      return;
    }

    const conversationId = GeminiAdapter.getConversationId();
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultFilename = `gemini-chat-${conversationId}-${dateStr}`;

    if (format === 'markdown') {
      const mdContent = this.generateMarkdown(turns, conversationId);
      this.downloadFile(`${defaultFilename}.md`, mdContent, 'text/markdown;charset=utf-8');
    } else if (format === 'json') {
      const jsonContent = this.generateJSON(turns, conversationId);
      this.downloadFile(`${defaultFilename}.json`, jsonContent, 'application/json;charset=utf-8');
    }
  }

  /**
   * Formats TurnNode array into structured Markdown
   */
  private static generateMarkdown(turns: TurnNode[], conversationId: string): string {
    const now = new Date().toLocaleString();
    let md = `# Gemini 对话记录\n\n`;
    md += `- **会话编号**: \`${conversationId}\`\n`;
    md += `- **导出时间**: ${now}\n`;
    md += `- **总轮次数**: ${turns.length}\n\n`;
    md += `---\n\n`;

    turns.forEach((turn) => {
      md += `## 🧑‍💻 用户 (第 ${turn.index} 轮)\n\n`;
      md += `${turn.userPrompt.trim()}\n\n`;

      md += `## 🤖 Gemini\n\n`;
      md += `${turn.modelResponse.trim() || '*(回复内容为空或未完全加载)*'}\n\n`;
      md += `---\n\n`;
    });

    md += `\n*由 [Gemini Copilot](https://github.com/voyager-crew/voyager) 导出*\n`;
    return md;
  }

  /**
   * Formats TurnNode array into JSON
   */
  private static generateJSON(turns: TurnNode[], conversationId: string): string {
    const payload = {
      conversationId,
      exportedAt: new Date().toISOString(),
      totalTurns: turns.length,
      turns: turns.map((t) => ({
        index: t.index,
        id: t.id,
        userPrompt: t.userPrompt,
        modelResponse: t.modelResponse,
        hasCode: t.hasCode,
        hasMath: t.hasMath,
        isStarred: t.isStarred
      }))
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Trigger browser file download
   */
  private static downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
