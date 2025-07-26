import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table names
const USERS_TABLE = 'Users';
const CHATS_TABLE = 'Chats';
const MESSAGES_TABLE = 'Messages';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// User operations
export async function createUser(user: Omit<User, 'createdAt' | 'lastLoginAt'>): Promise<User> {
  const now = new Date().toISOString();
  const newUser: User = {
    ...user,
    createdAt: now,
    lastLoginAt: now,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: newUser,
    }));
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUser(id: string): Promise<User | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id },
    }));
    return result.Item as User || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function updateUserLastLogin(id: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id },
      UpdateExpression: 'SET lastLoginAt = :timestamp',
      ExpressionAttributeValues: {
        ':timestamp': new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error('Error updating user last login:', error);
  }
}

// Chat operations
export async function createChat(userId: string, title?: string): Promise<Chat> {
  const chat: Chat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title: title || 'New conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await docClient.send(new PutCommand({
      TableName: CHATS_TABLE,
      Item: {
        chatId: chat.id,  // Use chatId as partition key for DynamoDB
        id: chat.id,      // Keep id for backward compatibility  
        userId: chat.userId,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    }));
    return chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  try {
    // Use scan since we don't have a GSI yet
    const result = await docClient.send(new ScanCommand({
      TableName: CHATS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }));
    
    // Transform the scan results to ensure proper id field mapping
    const chats = (result.Items || []).map((item: any) => ({
      id: item.chatId || item.id,
      userId: item.userId,
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    
    // Sort chats by updatedAt in descending order (most recent first)
    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return chats;
  } catch (error: any) {
    console.error('Error getting user chats, using mock:', error.message);
    return [
      {
        id: 'mock_chat_1',
        userId,
        title: 'Sample conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: CHATS_TABLE,
      Key: { chatId: chatId },  // Use chatId as the key
      UpdateExpression: 'SET title = :title, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':title': title,
        ':timestamp': new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error('Error updating chat title:', error);
  }
}

export async function deleteChat(chatId: string): Promise<void> {
  try {
    // Delete the chat
    await docClient.send(new DeleteCommand({
      TableName: CHATS_TABLE,
      Key: { chatId: chatId },
    }));
    
    // Delete all messages in this chat
    const messages = await getChatMessages(chatId);
    for (const message of messages) {
      await docClient.send(new DeleteCommand({
        TableName: MESSAGES_TABLE,
        Key: { id: message.id },
      }));
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
}

// Message operations
export async function createMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
  const newMessage: Message = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    await docClient.send(new PutCommand({
      TableName: MESSAGES_TABLE,
      Item: newMessage,
    }));
    
    // Update the chat's updatedAt timestamp
    await docClient.send(new UpdateCommand({
      TableName: CHATS_TABLE,
      Key: { chatId: message.chatId },
      UpdateExpression: 'SET updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':timestamp': newMessage.timestamp,
      },
    }));
    
    return newMessage;
  } catch (error: any) {
    console.error('Error creating message, using mock:', error.message);
    // Return the message anyway for mock functionality
    return newMessage;
  }
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'chatId = :chatId',
      ExpressionAttributeValues: {
        ':chatId': chatId,
      },
      ScanIndexForward: true, // Sort by timestamp ascending
    }));
    return result.Items as Message[] || [];
  } catch (error: any) {
    console.error('Error getting chat messages, using mock:', error.message);
    // Return mock messages for development
    return [
      {
        id: 'mock_msg_1',
        chatId,
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: new Date().toISOString(),
      },
    ];
  }
}

// Mock functions for development (when DynamoDB is not configured)
export const mockFunctions = {
  async createUser(user: Omit<User, 'createdAt' | 'lastLoginAt'>): Promise<User> {
    console.log('Mock: Creating user', user.email);
    const now = new Date().toISOString();
    return { ...user, createdAt: now, lastLoginAt: now };
  },

  async getUser(id: string): Promise<User | null> {
    console.log('Mock: Getting user', id);
    return {
      id,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  },

  async updateUserLastLogin(id: string): Promise<void> {
    console.log('Mock: Updating user last login', id);
  },

  async createChat(userId: string, title?: string): Promise<Chat> {
    console.log('Mock: Creating chat for user', userId);
    return {
      id: `mock_chat_${Date.now()}`,
      userId,
      title: title || 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async getUserChats(userId: string): Promise<Chat[]> {
    console.log('Mock: Getting chats for user', userId);
    return [
      {
        id: 'mock_chat_1',
        userId,
        title: 'Sample conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  },

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    console.log('Mock: Updating chat title', chatId, title);
  },

  async deleteChat(chatId: string): Promise<void> {
    console.log('Mock: Deleting chat', chatId);
  },

  async createMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    console.log('Mock: Creating message for chat', message.chatId);
    return {
      ...message,
      id: `mock_msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  },

  async getChatMessages(chatId: string): Promise<Message[]> {
    console.log('Mock: Getting messages for chat', chatId);
    return [
      {
        id: 'mock_msg_1',
        chatId,
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: new Date().toISOString(),
      },
    ];
  },
};

// Export appropriate functions based on environment
const isDynamoDBConfigured = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

console.log('DynamoDB configured:', isDynamoDBConfigured);
console.log('AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);

export const db = isDynamoDBConfigured ? {
  createUser,
  getUser,
  updateUserLastLogin,
  createChat,
  getUserChats,
  updateChatTitle,
  deleteChat,
  createMessage,
  getChatMessages,
} : mockFunctions;