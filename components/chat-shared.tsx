'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Group, MessageCircle } from 'lucide-react';
import { greenApi } from '../lib/api';
import type { Chat, Credentials } from '../lib/types';

export const input = 'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
export const primary = 'flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50';
export const icon = 'flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700';

export function Logo() { return <div className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-slate-800"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white"><MessageCircle size={21} /></span>green<span className="-ml-2 text-emerald-600">chat</span></div>; }
export function Avatar({ chat, credentials }: { chat: Chat; credentials: Credentials }) {
  const element = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const node = element.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) setVisible(true); }, { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  const avatar = useQuery({ queryKey: ['avatar', credentials.idInstance, chat.id],
    queryFn: () => greenApi.avatar(credentials, chat.id), enabled: visible,
    staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: false, refetchOnWindowFocus: false });
  const src = avatar.data?.urlAvatar || (avatar.data?.base64Avatar && avatar.data.base64Avatar.length < 600_000 ? `data:image/jpeg;base64,${avatar.data.base64Avatar}` : '');
  return <span ref={element} className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold ${chat.type === 'group' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-700'}`}>
    {src && !broken ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} /> : chat.type === 'group' ? <Group size={19} /> : chat.name.replace('+', '').charAt(0).toUpperCase()}
  </span>;
}
