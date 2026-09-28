export type Credentials = { apiUrl: string; idInstance: string; apiTokenInstance: string };
export type Chat = {
  id: string;
  name: string;
  type: 'user' | 'group';
  unreadCount: number;
  newChatId?: string;
};
export type MediaKind = 'text' | 'image' | 'sticker' | 'video' | 'audio' | 'document';
export type ChatMessage = {
  id: string;
  chatId: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: number;
  kind: MediaKind;
  url?: string;
  fileName?: string;
  mimeType?: string;
  status?: string;
  pending?: boolean;
};
export type RawChat = {
  id: string;
  name?: string;
  type?: string;
  unreadCount?: number;
  newChatId?: string;
};
export type RawMessage = {
  idMessage: string;
  type: string;
  timestamp: number;
  typeMessage: string;
  textMessage?: string;
  extendedTextMessage?: { text?: string };
  chatId: string;
  downloadUrl?: string;
  caption?: string;
  fileName?: string;
  mimeType?: string;
  statusMessage?: string;
};
export type Notification = {
  receiptId: number;
  body: {
    typeWebhook?: string;
    chatId?: string;
    idMessage?: string;
    timestamp?: number;
    status?: string;
    senderData?: { chatId?: string; senderName?: string };
    messageData?: {
      typeMessage?: string;
      textMessageData?: { textMessage?: string };
      extendedTextMessageData?: { text?: string };
      fileMessageData?: {
        downloadUrl?: string;
        caption?: string;
        fileName?: string;
        mimeType?: string;
      };
    };
  };
};
export type InstanceSettings = {
  webhookUrl?: string;
  incomingWebhook?: string;
  outgoingWebhook?: string;
};
