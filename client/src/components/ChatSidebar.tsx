import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, MessageCircle } from 'lucide-react';

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  chats: Chat[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  activeChat,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}) => {
  return (
    <div className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col h-screen">
      <div className="p-4">
        <Button 
          onClick={onNewChat}
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={`group transition-all duration-200 cursor-pointer ${
                  activeChat === chat.id
                    ? 'bg-accent border-accent-foreground/20'
                    : 'hover:bg-accent/50 border-transparent'
                }`}
              >
                <div className="flex items-center p-3">
                  <button
                    onClick={() => onChatSelect(chat.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center mb-1">
                      <div className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                        activeChat === chat.id ? 'bg-primary' : 'bg-muted-foreground/50'
                      }`}></div>
                      <div className="truncate font-medium text-sm">{chat.title}</div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;