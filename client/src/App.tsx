import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginButton from './components/LoginButton';
import AuthCallback from './components/AuthCallback';
import ChatSidebar from './components/ChatSidebar';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-4xl font-bold text-white">
          Welcome to ChatGPT Clone
        </h2>
        <p className="mt-4 text-center text-lg text-gray-300">
          Your AI-powered conversation assistant
        </p>
        <p className="mt-2 text-center text-sm text-gray-400">
          Sign in to start chatting with advanced AI
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow-xl rounded-2xl border border-gray-700 sm:px-10">
          <div className="flex justify-center">
            <LoginButton />
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Secure authentication powered by Google
            </p>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center">
        <div className="flex justify-center space-x-8 text-sm text-gray-400">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Real-time responses
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure & Private
          </div>
        </div>
      </div>
    </div>
  );
};

const Chat: React.FC = () => {
  const { user, logout, token } = useAuth();
  const [chats, setChats] = useState<Array<{id: string, title: string, updatedAt: string}>>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

  // Load user's chats on component mount
  React.useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await fetch(`${serverUrl}/api/chat`, {
          headers: {
            'Authorization': `Bearer ${token || 'mock-token'}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Sort chats by updatedAt descending (most recent first)
          const sortedChats = (data.chats || []).sort((a: any, b: any) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setChats(sortedChats);
          
          // Set first chat as active if available (use sorted chats)
          if (sortedChats.length > 0) {
            setActiveChat(sortedChats[0].id);
          }
        } else {
          // Fallback to mock data if server not available
          const mockChat = {
            id: 'mock_chat_1',
            title: 'Sample conversation',
            updatedAt: new Date().toISOString()
          };
          setChats([mockChat]);
          setActiveChat(mockChat.id);
        }
      } catch (error) {
        console.log('Server not available, using mock data');
        const mockChat = {
          id: 'mock_chat_1',
          title: 'Sample conversation',
          updatedAt: new Date().toISOString()
        };
        setChats([mockChat]);
        setActiveChat(mockChat.id);
      } finally {
        setLoadingChats(false);
      }
    };

    loadChats();
  }, [token, serverUrl]);

  // Load messages when active chat changes
  React.useEffect(() => {
    const loadMessages = async () => {
      if (!activeChat) return;

      console.log('Loading messages for chat:', activeChat);
      
      // Clear messages immediately when switching chats
      setMessages([]);
      
      try {
        const response = await fetch(`${serverUrl}/api/chat/${activeChat}/messages`, {
          headers: {
            'Authorization': `Bearer ${token || 'mock-token'}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Loaded messages from server for chat', activeChat, ':', data.messages);
          console.log('Setting messages for chat', activeChat, 'count:', data.messages?.length || 0);
          setMessages(data.messages || []);
        } else {
          console.log('Server response not ok, using fallback');
          // Fallback to mock message
          setMessages([
            { id: '1', role: 'assistant', content: 'Hello! How can I help you today?', timestamp: new Date().toISOString() }
          ]);
        }
      } catch (error) {
        console.log('Error loading messages, using fallback:', error);
        // Fallback to mock message
        setMessages([
          { id: '1', role: 'assistant', content: 'Hello! How can I help you today?', timestamp: new Date().toISOString() }
        ]);
      }
    };

    loadMessages();
  }, [activeChat, token, serverUrl]);

  const handleNewChat = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`,
        },
        body: JSON.stringify({ title: 'New conversation' }),
      });

      if (response.ok) {
        const data = await response.json();
        const newChat = data.chat;
        setChats([newChat, ...chats]);
        setActiveChat(newChat.id);
        setMessages([]);
      } else {
        // Fallback to local chat creation
        const newChat = {
          id: `local_${Date.now()}`,
          title: 'New conversation',
          updatedAt: new Date().toISOString()
        };
        setChats([newChat, ...chats]);
        setActiveChat(newChat.id);
        setMessages([]);
      }
    } catch (error) {
      // Fallback to local chat creation
      const newChat = {
        id: `local_${Date.now()}`,
        title: 'New conversation',
        updatedAt: new Date().toISOString()
      };
      setChats([newChat, ...chats]);
      setActiveChat(newChat.id);
      setMessages([]);
    }
  };

  const updateChatOrder = (chatId: string) => {
    // Move the updated chat to the top of the list
    setChats(prevChats => {
      const updatedChats = [...prevChats];
      const chatIndex = updatedChats.findIndex(chat => chat.id === chatId);
      if (chatIndex > 0) {
        // Move chat to top with updated timestamp
        const chat = updatedChats.splice(chatIndex, 1)[0];
        chat.updatedAt = new Date().toISOString();
        updatedChats.unshift(chat);
      }
      return updatedChats;
    });
  };

  const handleChatSelect = (chatId: string) => {
    console.log('=== CHAT SELECT HANDLER ===');
    console.log('Switching to chat:', chatId, 'from:', activeChat);
    console.log('Chat type:', typeof chatId, 'value:', chatId);
    setActiveChat(chatId);
    // Messages will be loaded by useEffect
  };

  const handleDeleteChat = async (chatId: string) => {
    console.log('=== DELETE CHAT HANDLER ===');
    console.log('Deleting chat:', chatId);
    console.log('Current chats before delete:', chats.map(c => c.id));
    
    try {
      const response = await fetch(`${serverUrl}/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`,
        },
      });

      if (response.ok) {
        console.log('Server confirmed deletion, updating UI');
        
        // Use functional state update to ensure we have latest state
        setChats(prevChats => {
          const remainingChats = prevChats.filter(chat => chat.id !== chatId);
          console.log('Remaining chats after filter:', remainingChats.map(c => c.id));
          
          // Handle active chat switch in the same update cycle
          if (activeChat === chatId) {
            if (remainingChats.length > 0) {
              console.log('Switching to first remaining chat:', remainingChats[0].id);
              setActiveChat(remainingChats[0].id);
            } else {
              console.log('No remaining chats, clearing active chat');
              setActiveChat(null);
              setMessages([]);
            }
          }
          
          return remainingChats;
        });
        
      } else {
        console.error('Failed to delete chat, server response not ok');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChat) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Check if server is available for real streaming
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      
      const response = await fetch(`${serverUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token'}`,
        },
        body: JSON.stringify({
          message: content,
          chatId: activeChat
        })
      });

      if (!response.ok) {
        throw new Error('Server not available');
      }

      // Create assistant message placeholder for streaming
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: '',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ));
                }
              } catch (e) {
                // Ignore malformed JSON
              }
            }
          }
        }
        
        // Update chat order after real streaming is complete
        updateChatOrder(activeChat);
      }
    } catch (error) {
      // Fallback to mock response if server not available
      console.log('Using mock response - server not available');
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      // Simulate streaming with mock data
      const mockResponse = 'This is a mock streaming response. The server will provide real OpenAI responses when configured properly.';
      let currentContent = '';
      
      for (let i = 0; i < mockResponse.length; i++) {
        currentContent += mockResponse[i];
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: currentContent }
            : msg
        ));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      // Update chat order after message is complete
      updateChatOrder(activeChat);
    }
  };

  if (loadingChats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className="flex-1 flex flex-col">
        <nav className="bg-white shadow border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold">ChatGPT Clone</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">Hello, {user?.name || 'Test User'}</span>
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col bg-white">
          <MessageList messages={messages} isLoading={isLoading} />
          <MessageInput 
            onSendMessage={handleSendMessage} 
            disabled={isLoading || !activeChat || activeChat.trim() === ''}
          />
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // For testing: allow access without auth
  if (!user) {
    // Mock user for testing
    return <>{children}</>;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<div>404 - Route not found: {window.location.pathname}</div>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
