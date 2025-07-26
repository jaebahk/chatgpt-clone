import express from 'express';
import OpenAI from 'openai';
import { db } from '../services/dynamodb';

const router = express.Router();

console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('OPENAI_API_KEY starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// OpenAI streaming endpoint
router.post('/stream', async (req, res) => {
  try {
    const { message, chatId } = req.body;
    const userId = (req as any).user?.id || 'mock-user-id';
    
    console.log('=== STREAMING REQUEST DEBUG ===');
    console.log('OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
    console.log('OpenAI client initialized:', !!openai);
    console.log('User ID:', userId);
    console.log('Received message:', message, 'for chat:', chatId);
    console.log('Request user object:', (req as any).user);

    // Save user message to database
    try {
      await db.createMessage({
        chatId: chatId || 'default-chat',
        role: 'user',
        content: message,
      });
      console.log('Successfully saved user message to database');
    } catch (dbError: any) {
      console.error('Database error, continuing with response:', dbError.message);
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!openai) {
      console.log('Using mock response - no OpenAI client');
      // Fallback to mock if no API key
      const mockResponse = `Mock response to: "${message}"`;
      for (let i = 0; i < mockResponse.length; i++) {
        res.write(`data: ${JSON.stringify({ content: mockResponse[i] })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      
      // Save assistant message to database
      await db.createMessage({
        chatId: chatId || 'default-chat',
        role: 'assistant',
        content: mockResponse,
      });
      return;
    }

    console.log('Using OpenAI streaming response');
    let assistantResponse = '';
    try {
      // Create OpenAI streaming completion
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          assistantResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      
      // Save assistant message to database
      await db.createMessage({
        chatId: chatId || 'default-chat',
        role: 'assistant',
        content: assistantResponse,
      });
    } catch (openaiError: any) {
      console.log('OpenAI error, falling back to mock:', openaiError.message);
      // Fallback to mock response on OpenAI errors
      const mockResponse = `[Mock due to OpenAI quota exceeded] Response to: "${message}"`;
      for (let i = 0; i < mockResponse.length; i++) {
        res.write(`data: ${JSON.stringify({ content: mockResponse[i] })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      
      // Save assistant message to database
      await db.createMessage({
        chatId: chatId || 'default-chat',
        role: 'assistant',
        content: mockResponse,
      });
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log('Getting messages for chat:', chatId);
    const messages = await db.getChatMessages(chatId);
    console.log('Found messages:', messages.length);
    res.json({ messages });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get chats
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'mock-user-id';
    const chats = await db.getUserChats(userId);
    res.json({ chats });
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

// Create chat
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'mock-user-id';
    const { title } = req.body;
    console.log('Creating chat for user:', userId, 'with title:', title);
    const chat = await db.createChat(userId, title);
    console.log('Chat created successfully:', chat);
    res.json({ chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = (req as any).user?.id || 'mock-user-id';
    console.log('Deleting chat:', chatId, 'for user:', userId);
    
    await db.deleteChat(chatId);
    console.log('Chat deleted successfully:', chatId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;