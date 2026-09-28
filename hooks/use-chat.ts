'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { greenApi } from '../lib/api';
import { incomingFromNotification, mergeMessages } from '../lib/normalize';
import type { Chat, ChatMessage, Credentials } from '../lib/types';

const keys = {
  chats: (id: string) => ['chats', id] as const,
  history: (id: string, chat: string) => ['history', id, chat] as const,
  settings: (id: string) => ['settings', id] as const,
};

export function useChat() {
  const cache = useQueryClient();
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [customChats, setCustomChats] = useState<Chat[]>([]);
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const selectedRef = useRef(selected);
  const readTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const id = credentials?.idInstance ?? '';
  const chatsQuery = useQuery({ queryKey: keys.chats(id), queryFn: () => greenApi.chats(credentials!), enabled: !!credentials,
    staleTime: 15_000, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const historyQuery = useQuery({ queryKey: keys.history(id, selected ?? ''), queryFn: async () => {
    const fresh = await greenApi.history(credentials!, selected!);
    return mergeMessages(cache.getQueryData<ChatMessage[]>(keys.history(id, selected!)) ?? [], fresh).slice(-100);
  },
    enabled: !!credentials && !!selected, staleTime: 5_000, refetchInterval: 8_000, refetchOnWindowFocus: true });
  const settingsQuery = useQuery({ queryKey: keys.settings(id), queryFn: () => greenApi.settings(credentials!), enabled: !!credentials,
    staleTime: 60_000 });

  const chats = [...customChats.filter(item => !(chatsQuery.data ?? []).some(remote => remote.id === item.id)), ...(chatsQuery.data ?? [])]
    .map(chat => readOverrides[chat.id] ? { ...chat, unreadCount: 0 } : chat);
  const current = chats.find(item => item.id === selected);

  const connect = useCallback(async (value: Credentials) => {
    setError('');
    const state = await greenApi.state(value);
    if (state.stateInstance !== 'authorized') throw new Error('Инстанс не авторизован. Подключите WhatsApp через QR-код в GREEN-API.');
    setCredentials(value);
  }, []);

  const disconnect = useCallback(() => {
    readTimers.current.forEach(clearTimeout); readTimers.current.clear();
    setCredentials(null); setSelected(null); setCustomChats([]); setReadOverrides({}); setError(''); cache.clear();
  }, [cache]);

  const markRead = useCallback((chatId: string) => {
    if (!credentials) return;
    setReadOverrides(old => ({ ...old, [chatId]: true }));
    cache.setQueryData<Chat[]>(keys.chats(id), old => (old ?? []).map(chat => chat.id === chatId ? { ...chat, unreadCount: 0 } : chat));
    const timer = readTimers.current.get(chatId);
    if (timer) clearTimeout(timer);
    readTimers.current.set(chatId, setTimeout(() => {
      readTimers.current.delete(chatId);
      void greenApi.read(credentials, chatId).then(response => {
        if (!response.setRead) throw new Error('Не удалось отметить чат прочитанным.');
      }).catch(cause => {
        setReadOverrides(old => { const updated = { ...old }; delete updated[chatId]; return updated; });
        void cache.invalidateQueries({ queryKey: keys.chats(id) });
        setError(cause instanceof Error ? cause.message : 'Ошибка отметки прочтения.');
      });
    }, 350));
  }, [credentials, cache, id]);

  const select = useCallback((chatId: string) => { setSelected(chatId); markRead(chatId); }, [markRead]);

  const addChat = useCallback((phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(digits)) throw new Error('Введите номер с кодом страны.');
    const chatId = `${digits}@c.us`;
    setCustomChats(old => old.some(chat => chat.id === chatId) ? old : [{ id: chatId, name: `+${digits}`, type: 'user', unreadCount: 0 }, ...old]);
    select(chatId);
    return chatId;
  }, [select]);

  const send = useCallback(async (text: string) => {
    if (!credentials || !selected || !text.trim() || sending) return;
    setSending(true); setError('');
    const key = keys.history(credentials.idInstance, selected);
    const temporary = `pending-${Date.now()}`;
    const message: ChatMessage = { id: temporary, chatId: selected, direction: 'outgoing', kind: 'text', text: text.trim(), timestamp: Math.floor(Date.now() / 1000), pending: true };
    cache.setQueryData<ChatMessage[]>(key, old => mergeMessages(old ?? [], [message]));
    try {
      const result = await greenApi.send(credentials, selected, text.trim());
      cache.setQueryData<ChatMessage[]>(key, old => (old ?? []).map(item => item.id === temporary ? { ...item, id: result.idMessage, pending: false, status: 'sent' } : item));
      setTimeout(() => void cache.invalidateQueries({ queryKey: key }), 1200);
    } catch (cause) {
      cache.setQueryData<ChatMessage[]>(key, old => (old ?? []).filter(item => item.id !== temporary));
      setError(cause instanceof Error ? cause.message : 'Не удалось отправить сообщение.');
      throw cause;
    } finally { setSending(false); }
  }, [credentials, selected, sending, cache]);

  const configure = useCallback(async () => {
    if (!credentials) return;
    await greenApi.configure(credentials);
    await cache.invalidateQueries({ queryKey: keys.settings(id) });
  }, [credentials, cache, id]);

  const refresh = useCallback(async () => {
    if (!credentials) return;
    await Promise.all([cache.invalidateQueries({ queryKey: keys.chats(id) }), selected ? cache.invalidateQueries({ queryKey: keys.history(id, selected) }) : Promise.resolve()]);
  }, [credentials, cache, id, selected]);

  useEffect(() => {
    if (!credentials) return;
    let stopped = false;
    const controller = new AbortController();
    let failures = 0;
    async function loop() {
      while (!stopped && document.visibilityState === 'visible') {
        try {
          const notification = await greenApi.receive(credentials!);
          if (stopped) return;
          failures = 0;
          if (!notification) continue;
          const body = notification.body;
          const incoming = incomingFromNotification(notification);
          if (incoming) {
            if (selectedRef.current !== incoming.chatId) setReadOverrides(old => { const updated = { ...old }; delete updated[incoming.chatId]; return updated; });
            cache.setQueryData<ChatMessage[]>(keys.history(id, incoming.chatId), old => mergeMessages(old ?? [], [incoming]));
            cache.setQueryData<Chat[]>(keys.chats(id), old => {
              const matching = (old ?? []).find(chat => chat.id === incoming.chatId);
              const chat: Chat = matching ? { ...matching } : { id: incoming.chatId, name: body.senderData?.senderName || greenApi.displayId(incoming.chatId), type: incoming.chatId.endsWith('@g.us') ? 'group' : 'user', unreadCount: 0 };
              if (selectedRef.current !== incoming.chatId) chat.unreadCount += 1;
              return [chat, ...(old ?? []).filter(item => item.id !== chat.id)];
            });
          } else if (body?.typeWebhook === 'outgoingMessageStatus' && body.chatId && body.idMessage && body.status) {
            cache.setQueryData<ChatMessage[]>(keys.history(id, body.chatId), old => (old ?? []).map(message => message.id === body.idMessage ? { ...message, status: body.status } : message));
          } else if (body?.typeWebhook === 'outgoingMessageReceived' && body.senderData?.chatId) {
            void cache.invalidateQueries({ queryKey: keys.history(id, body.senderData.chatId) });
          }
          // Acknowledge only after the event has been applied to the local cache.
          await greenApi.acknowledge(credentials!, notification.receiptId);
          if (incoming && selectedRef.current === incoming.chatId) {
            markRead(incoming.chatId);
            void cache.invalidateQueries({ queryKey: keys.history(id, incoming.chatId) });
          }
        } catch (cause) {
          if (stopped) return;
          failures++;
          if (failures === 2) setError(cause instanceof Error ? cause.message : 'Ошибка получения сообщений.');
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** failures, 15000)));
        }
      }
    }
    // The queue has one consumer. A browser lock prevents two tabs from competing for receipts.
    function resume() {
      if (stopped || document.visibilityState !== 'visible') return;
      if ('locks' in navigator) {
        void navigator.locks.request(`green-api-notifications-${id}`, { signal: controller.signal }, loop)
          .catch(() => undefined);
      } else void loop();
    }
    document.addEventListener('visibilitychange', resume);
    resume();
    return () => { stopped = true; controller.abort(); document.removeEventListener('visibilitychange', resume); };
  }, [credentials, cache, id, markRead]);

  return { credentials, selected, select, chats, current, messages: historyQuery.data ?? [],
    chatsQuery, historyQuery, settings: settingsQuery.data, error, setError, sending, connect, disconnect, addChat, send, configure, refresh };
}
