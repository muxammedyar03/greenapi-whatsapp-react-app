'use client';
import { useState } from 'react';
import { ChevronRight, Smartphone } from 'lucide-react';
import { Logo, input, primary } from './chat-shared';
import type { Credentials } from '../lib/types';

export function Connection({ connect }: { connect: (value: Credentials) => Promise<void> }) {
  const [apiUrl, setApiUrl] = useState('https://api.greenapi.com');
  const [idInstance, setId] = useState('');
  const [apiTokenInstance, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await connect({
        apiUrl: apiUrl.trim().replace(/\/$/, ''),
        idInstance: idInstance.trim(),
        apiTokenInstance: apiTokenInstance.trim(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка подключения.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-emerald-50/50 p-5">
      <div className="w-full max-w-[455px] rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl sm:p-10">
        <Logo />
        <div className="pt-10 pb-7">
          <div className="flex items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Smartphone size={29} />
            </div>
            <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-emerald-600">
              Whatsapp
            </h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Подключите инстанс GREEN-API и общайтесь в WhatsApp прямо здесь.
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-bold text-slate-700">
            API URL
            <input
              className={input}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            idInstance
            <input
              className={input}
              value={idInstance}
              onChange={(e) => setId(e.target.value)}
              inputMode="numeric"
              required
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            apiTokenInstance
            <input
              className={input}
              value={apiTokenInstance}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button className={`${primary} w-full`} disabled={busy}>
            {busy ? 'Подключаем...' : 'Подключиться'} <ChevronRight size={18} />
          </button>
        </form>
        <p className="mt-6 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">
          Данные подключения сохраняются в этом браузере и остаются после обновления страницы, пока
          вы не выйдете.
        </p>
      </div>
      <p className="mt-5 text-center text-xs text-slate-500">
        Авторизуйте инстанс в{' '}
        <a
          className="font-bold text-emerald-700 underline"
          href="https://console.green-api.com/"
          target="_blank"
          rel="noreferrer">
          кабинете GREEN-API
        </a>
        .
      </p>
    </main>
  );
}
