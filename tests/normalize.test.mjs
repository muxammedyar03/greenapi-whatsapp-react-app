import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChats, normalizeHistory, incomingFromNotification, mergeMessages } from '../lib/normalize.ts';

test('recent chats include groups and WhatsApp lid contacts in API order', () => {
  assert.deepEqual(normalizeChats([
    { id: '120363153000000000@g.us', name: 'Team', type: 'group' },
    { id: '138788093320001@lid', name: 'Ali', type: 'user', newChatId: '138788093320002@lid' },
    { id: '998901234567@c.us', type: 'user' },
  ]).map(chat => chat.id), ['120363153000000000@g.us', '138788093320002@lid', '998901234567@c.us']);
});

test('history includes received and sent text in time order', () => {
  const result = normalizeHistory([
    { idMessage: 'two', chatId: '12345@lid', type: 'outgoing', typeMessage: 'textMessage', textMessage: 'reply', timestamp: 2, statusMessage: 'read' },
    { idMessage: 'one', chatId: '12345@lid', type: 'incoming', typeMessage: 'textMessage', textMessage: 'hello', timestamp: 1 },
  ], '12345@lid');
  assert.deepEqual(result.map(message => message.text), ['hello', 'reply']);
  assert.equal(result[1].status, 'read');
});

test('notification appears immediately, then history refresh deduplicates it', () => {
  const incoming = incomingFromNotification({ receiptId: 1, body: {
    typeWebhook: 'incomingMessageReceived', idMessage: 'one', timestamp: 5,
    senderData: { chatId: '1234567890@lid', senderName: 'Ali' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'hello' } },
  } });
  assert.equal(incoming?.text, 'hello');
  assert.equal(mergeMessages([incoming], [incoming]).length, 1);
});
