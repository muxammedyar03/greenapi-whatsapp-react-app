import type { Chat, ChatMessage, MediaKind, Notification, RawChat, RawMessage } from './types';

export const isChatId = (value: string) => /^(\d{5,25}@(c\.us|lid)|[\d-]{5,50}@g\.us)$/.test(value);
export const displayId = (id: string) => id.endsWith('@c.us') ? '+' + id.split('@')[0] : id.endsWith('@g.us') ? 'Группа' : 'Контакт WhatsApp';
const mediaKinds: Record<string, MediaKind> = { imageMessage: 'image', stickerMessage: 'sticker', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'document' };
const mediaLabels: Record<MediaKind, string> = { text: '', image: 'Изображение', sticker: 'Стикер', video: 'Видео', audio: 'Аудио', document: 'Документ' };
export function safeMediaUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}

export function normalizeChats(raw: RawChat[]): Chat[] {
  return raw.filter(item => typeof item.id === 'string' && isChatId(item.id))
    .map(item => ({ id: item.newChatId && isChatId(item.newChatId) ? item.newChatId : item.id,
      name: item.name || displayId(item.id), type: item.id.endsWith('@g.us') ? 'group' as const : 'user' as const,
      unreadCount: item.unreadCount ?? 0, newChatId: item.newChatId }));
}

export function normalizeHistory(raw: RawMessage[], chatId: string): ChatMessage[] {
  const seen = new Set<string>();
  return raw.map<ChatMessage | null>(item => {
    const kind = mediaKinds[item.typeMessage] ?? 'text';
    const text = item.textMessage || item.extendedTextMessage?.text || item.caption || mediaLabels[kind];
    if (!item.idMessage || !text || !['incoming', 'outgoing'].includes(item.type)) return null;
    return { id: item.idMessage, chatId, text, kind, url: safeMediaUrl(item.downloadUrl), fileName: item.fileName,
      mimeType: item.mimeType, direction: item.type as ChatMessage['direction'], timestamp: item.timestamp, status: item.statusMessage };
  }).filter((item): item is ChatMessage => item !== null)
    .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function incomingFromNotification(notification: Notification): ChatMessage | null {
  const body = notification.body;
  const chatId = body?.senderData?.chatId;
  const kind = mediaKinds[body?.messageData?.typeMessage ?? ''] ?? 'text';
  const file = body?.messageData?.fileMessageData;
  const text = body?.messageData?.textMessageData?.textMessage || body?.messageData?.extendedTextMessageData?.text || file?.caption || mediaLabels[kind];
  if (body?.typeWebhook !== 'incomingMessageReceived' || !chatId || !isChatId(chatId) || !body.idMessage || !text) return null;
  return { id: body.idMessage, chatId, text, kind, url: safeMediaUrl(file?.downloadUrl), fileName: file?.fileName,
    mimeType: file?.mimeType, direction: 'incoming', timestamp: body.timestamp ?? Math.floor(Date.now() / 1000) };
}

export function mergeMessages(old: ChatMessage[], fresh: ChatMessage[]): ChatMessage[] {
  const byId = new Map(old.map(message => [message.id, message]));
  const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3 };
  for (const message of fresh) {
    const previous = byId.get(message.id);
    const status = (rank[previous?.status ?? ''] ?? 0) > (rank[message.status ?? ''] ?? 0) ? previous?.status : message.status;
    byId.set(message.id, { ...previous, ...message, status });
  }
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
}
