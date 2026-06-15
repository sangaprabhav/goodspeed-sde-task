export const DEFAULT_CONVERSATION_TITLE = 'New conversation';

export function conversationTitleFromMessage(message: string, maxLen = 60): string {
  const oneLine = message.replace(/\s+/g, ' ').trim();
  if (!oneLine) return DEFAULT_CONVERSATION_TITLE;
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1)}…`;
}

export function isDefaultConversationTitle(title: string | null | undefined): boolean {
  if (!title?.trim()) return true;
  return title.trim().toLowerCase() === DEFAULT_CONVERSATION_TITLE.toLowerCase();
}
