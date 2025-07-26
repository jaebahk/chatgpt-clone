import request from 'supertest';
import express from 'express';
import chatRoutes from '../routes/chat';

const app = express();
app.use(express.json());
app.use('/api/chat', chatRoutes);

describe('Chat Routes', () => {
  describe('GET /api/chat', () => {
    it('should return mock chats', async () => {
      const response = await request(app)
        .get('/api/chat')
        .expect(200);

      expect(response.body).toHaveProperty('chats');
      expect(Array.isArray(response.body.chats)).toBe(true);
      expect(response.body.chats[0]).toHaveProperty('id', 'mock_chat_1');
      expect(response.body.chats[0]).toHaveProperty('title', 'Sample conversation');
    });
  });

  describe('GET /api/chat/:chatId/messages', () => {
    it('should return mock messages for a chat', async () => {
      const response = await request(app)
        .get('/api/chat/test-chat/messages')
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages[0]).toHaveProperty('role', 'assistant');
      expect(response.body.messages[0]).toHaveProperty('content');
    });
  });

  describe('POST /api/chat', () => {
    it('should create a new chat', async () => {
      const newChatData = { title: 'Test Chat' };

      const response = await request(app)
        .post('/api/chat')
        .send(newChatData)
        .expect(200);

      expect(response.body).toHaveProperty('chat');
      expect(response.body.chat).toHaveProperty('title', 'Test Chat');
      expect(response.body.chat).toHaveProperty('id');
      expect(response.body.chat.id).toMatch(/^chat_\d+$/);
    });

    it('should create a chat with default title when none provided', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({})
        .expect(200);

      expect(response.body.chat).toHaveProperty('title', 'New conversation');
    });
  });

  describe('POST /api/chat/stream', () => {
    it('should stream a response', async () => {
      const message = { message: 'Hello, world!' };

      const response = await request(app)
        .post('/api/chat/stream')
        .send(message)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('should handle missing message gracefully', async () => {
      const response = await request(app)
        .post('/api/chat/stream')
        .send({});
        
      // The endpoint doesn't validate message, so it will try to stream
      expect(response.status).toBe(200);
    });
  });
});