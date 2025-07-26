import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Bot, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  return (
    <ScrollArea className="flex-1 px-4">
      <div className="space-y-6 py-4 max-w-4xl mx-auto">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p>Type a message below to begin chatting</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <Card className={`p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                </Card>
                <div className="text-xs text-muted-foreground mt-1 px-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-muted">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            
            <Card className="p-4 bg-muted">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default MessageList;