import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Action =
  | 'state'
  | 'settings'
  | 'configure'
  | 'chats'
  | 'history'
  | 'send'
  | 'receive'
  | 'delete'
  | 'read'
  | 'avatar';

const actions: Record<Action, { method: 'GET' | 'POST' | 'DELETE'; endpoint: string }> = {
  state: { method: 'GET', endpoint: 'getStateInstance' },
  settings: { method: 'GET', endpoint: 'getSettings' },
  configure: { method: 'POST', endpoint: 'setSettings' },
  chats: { method: 'GET', endpoint: 'getChats' },
  history: { method: 'POST', endpoint: 'getChatHistory' },
  read: { method: 'POST', endpoint: 'readChat' },
  avatar: { method: 'POST', endpoint: 'getAvatar' },
  send: { method: 'POST', endpoint: 'sendMessage' },
  receive: { method: 'GET', endpoint: 'receiveNotification' },
  delete: { method: 'DELETE', endpoint: 'deleteNotification' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiUrl, idInstance, apiTokenInstance, action, chatId, message, receiptId } = body;
    if (
      typeof apiUrl !== 'string' ||
      typeof idInstance !== 'string' ||
      typeof apiTokenInstance !== 'string' ||
      !/^\d{5,20}$/.test(idInstance) ||
      !/^[a-zA-Z0-9_-]{10,200}$/.test(apiTokenInstance) ||
      typeof action !== 'string' ||
      !(action in actions)
    ) {
      return NextResponse.json({ error: 'Проверьте параметры подключения.' }, { status: 400 });
    }

    // Only GREEN-API hosts are allowed: credentials must never be sent to arbitrary hosts.
    const origin = new URL(apiUrl);
    if (
      origin.protocol !== 'https:' ||
      origin.username ||
      origin.password ||
      origin.port ||
      !/(^|\.)(green-api|greenapi)\.com$/i.test(origin.hostname) ||
      (origin.pathname !== '/' && origin.pathname !== '') ||
      origin.search ||
      origin.hash
    ) {
      return NextResponse.json(
        { error: 'Укажите HTTPS API URL из кабинета GREEN-API.' },
        { status: 400 },
      );
    }

    const selected = actions[action as Action];
    let suffix = '';
    let payload: string | undefined;
    if (action === 'send' || action === 'history' || action === 'read' || action === 'avatar') {
      if (
        typeof chatId !== 'string' ||
        !/^(\d{5,25}@(c\.us|lid)|[\d-]{5,50}@g\.us)$/.test(chatId)
      ) {
        return NextResponse.json({ error: 'Введите номер с кодом страны.' }, { status: 400 });
      }
      if (action === 'send') {
        if (typeof message !== 'string' || !message.trim() || message.length > 20000) {
          return NextResponse.json(
            { error: 'Сообщение должно содержать от 1 до 20000 символов.' },
            { status: 400 },
          );
        }
        payload = JSON.stringify({ chatId, message: message.trim() });
      } else if (action === 'history') payload = JSON.stringify({ chatId, count: 50 });
      else payload = JSON.stringify({ chatId });
    }
    if (action === 'delete') {
      if (!Number.isSafeInteger(receiptId) || receiptId < 0) {
        return NextResponse.json(
          { error: 'Некорректный идентификатор уведомления.' },
          { status: 400 },
        );
      }
      suffix = `/${receiptId}`;
    }
    if (action === 'receive') suffix = '?receiveTimeout=5';
    if (action === 'configure')
      payload = JSON.stringify({
        webhookUrl: '',
        incomingWebhook: 'yes',
        outgoingWebhook: 'yes',
        outgoingAPIMessageWebhook: 'yes',
        outgoingMessageWebhook: 'yes',
      });

    const url = `${origin.origin}/waInstance${idInstance}/${selected.endpoint}/${apiTokenInstance}${suffix}`;
    const response = await fetch(url, {
      method: selected.method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const raw = await response.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { error: 'Некорректный ответ API.' };
    }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Не удалось связаться с GREEN-API. Проверьте API URL и подключение.' },
      { status: 502 },
    );
  }
}
