'use client';
import { useState } from 'react';
import { ChevronRight, Plus, X } from 'lucide-react';
import { icon, input, primary } from './chat-shared';

export function NewChat({ close, add }: { close: () => void; add: (phone: string) => string }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      add(phone);
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Некорректный номер.');
    }
  }
  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-emerald-950/50 p-4"
      onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-title"
        className="w-full max-w-[420px] rounded-3xl bg-white p-7 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Plus size={21} />
          </span>
          <button className={icon} onClick={close} title="Закрыть">
            <X size={20} />
          </button>
        </div>
        <h2 id="new-title" className="font-display text-2xl font-extrabold text-slate-800">
          Новый чат
        </h2>
        <p className="mt-2 mb-6 text-sm text-slate-500">Введите номер WhatsApp с кодом страны.</p>
        <form onSubmit={submit}>
          <label className="text-sm font-bold text-slate-700">
            Номер телефона
            <input
              autoFocus
              className={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="998 90 123 45 67"
              inputMode="tel"
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-600">
              {error}
            </p>
          )}
          <button className={`${primary} mt-5 w-full`}>
            Открыть чат <ChevronRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
