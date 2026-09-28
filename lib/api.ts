import { displayId, normalizeChats, normalizeHistory } from './normalize';
import type { Chat, ChatMessage, Credentials, InstanceSettings, Notification, RawChat, RawMessage } from './types';

async function request<T>(credentials: Credentials, action: string, extra: object = {}): Promise<T> {
  const response = await fetch('/api/green', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...credentials, action, ...extra }), cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? data.message ?? `GREEN-API: ${response.status}`);
  return data as T;
}

export const greenApi = {
  state: (credentials: Credentials) => request<{ stateInstance: string }>(credentials, 'state'),
  settings: (credentials: Credentials) => request<InstanceSettings>(credentials, 'settings'),
  configure: (credentials: Credentials) => request<unknown>(credentials, 'configure'),
  chats: async (credentials: Credentials): Promise<Chat[]> => normalizeChats(await request<RawChat[]>(credentials, 'chats')),
  history: async (credentials: Credentials, chatId: string): Promise<ChatMessage[]> => normalizeHistory(await request<RawMessage[]>(credentials, 'history', { chatId }), chatId),
  send: (credentials: Credentials, chatId: string, message: string) => request<{ idMessage: string }>(credentials, 'send', { chatId, message }),
  receive: (credentials: Credentials) => request<Notification | null>(credentials, 'receive'),
  acknowledge: (credentials: Credentials, receiptId: number) => request<unknown>(credentials, 'delete', { receiptId }),
  displayId,
};
