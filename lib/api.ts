import { displayId, normalizeChats, normalizeHistory } from './normalize';
import type {
  Chat,
  ChatMessage,
  Credentials,
  InstanceSettings,
  Notification,
  RawChat,
  RawMessage,
} from './types';

const nextSlot = new Map<string, number>();
const spacing: Record<string, number> = {
  history: 1250,
  chats: 1100,
  avatar: 180,
  settings: 1100,
  read: 130,
};
async function throttle(credentials: Credentials, action: string) {
  const period = spacing[action];
  if (!period) return;
  const key = `${credentials.idInstance}:${action}`;
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(key) ?? 0);
  nextSlot.set(key, slot + period);
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

async function request<T>(
  credentials: Credentials,
  action: string,
  extra: object = {},
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await throttle(credentials, action);
    const response = await fetch('/api/green', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...credentials, action, ...extra }),
      cache: 'no-store',
    });
    const data = await response.json();
    if (response.ok) return data as T;
    if (response.status === 429 && attempt === 0 && !['send', 'configure'].includes(action)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    throw new Error(data.error ?? data.message ?? `GREEN-API: ${response.status}`);
  }
  throw new Error('Превышен лимит запросов GREEN-API. Повторите через несколько секунд.');
}

export const greenApi = {
  state: (credentials: Credentials) => request<{ stateInstance: string }>(credentials, 'state'),
  settings: (credentials: Credentials) => request<InstanceSettings>(credentials, 'settings'),
  configure: (credentials: Credentials) => request<unknown>(credentials, 'configure'),
  chats: async (credentials: Credentials): Promise<Chat[]> =>
    normalizeChats(await request<RawChat[]>(credentials, 'chats')),
  history: async (credentials: Credentials, chatId: string): Promise<ChatMessage[]> =>
    normalizeHistory(await request<RawMessage[]>(credentials, 'history', { chatId }), chatId),
  read: (credentials: Credentials, chatId: string) =>
    request<{ setRead: boolean }>(credentials, 'read', { chatId }),
  avatar: (credentials: Credentials, chatId: string) =>
    request<{ urlAvatar?: string; base64Avatar?: string; available?: boolean }>(
      credentials,
      'avatar',
      { chatId },
    ),
  send: (credentials: Credentials, chatId: string, message: string) =>
    request<{ idMessage: string }>(credentials, 'send', { chatId, message }),
  receive: (credentials: Credentials) => request<Notification | null>(credentials, 'receive'),
  acknowledge: (credentials: Credentials, receiptId: number) =>
    request<unknown>(credentials, 'delete', { receiptId }),
  displayId,
};
