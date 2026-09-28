'use client';
import { useEffect, useState } from 'react';
import { useChat } from '../hooks/use-chat';
import { Connection } from './connection';
import { Sidebar } from './chat-sidebar';
import { Conversation } from './conversation';
import { NewChat } from './new-chat';

export function ChatApp() {
  const app = useChat();
  const [newChat, setNewChat] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    if (app.selected) setMobileChat(true);
  }, [app.selected]);

  if (!app.sessionReady) return <main className="h-dvh bg-emerald-50/50" />;
  if (!app.credentials) return <Connection connect={app.connect} />;

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-white">
      <Sidebar app={app} openNew={() => setNewChat(true)} mobileChat={mobileChat} />
      <Conversation app={app} mobileChat={mobileChat} close={() => setMobileChat(false)} />
      {newChat && <NewChat close={() => setNewChat(false)} add={app.addChat} />}
      {showNewChat && <NewChat close={() => setShowNewChat(false)} add={app.addChat} />}
    </main>
  );
}
