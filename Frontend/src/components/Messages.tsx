import { useState } from 'react';
import { Search, Send, MoreVertical, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Conversation {
  id: string;
  user: {
    name: string;
    avatar: string;
    username: string;
  };
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: string;
}

const conversations: Conversation[] = [
  {
    id: '1',
    user: {
      name: 'Minh Anh',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      username: 'minhanh',
    },
    lastMessage: 'Cảm ơn bạn đã chia sẻ!',
    timestamp: '5 phút trước',
    unread: 2,
  },
  {
    id: '2',
    user: {
      name: 'Tuấn Kiệt',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      username: 'tuankiet',
    },
    lastMessage: 'Được rồi, hẹn gặp lại!',
    timestamp: '1 giờ trước',
    unread: 0,
  },
  {
    id: '3',
    user: {
      name: 'Thu Hà',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      username: 'thuha',
    },
    lastMessage: 'Bạn có thời gian không?',
    timestamp: '3 giờ trước',
    unread: 1,
  },
];

export function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    conversations[0]
  );
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Chào bạn! Mình thấy bài viết của bạn rất hay.',
      sender: 'other',
      timestamp: '10:30',
    },
    {
      id: '2',
      content: 'Cảm ơn bạn! Rất vui khi bài viết có ích cho bạn.',
      sender: 'me',
      timestamp: '10:32',
    },
    {
      id: '3',
      content: 'Bạn có thể chia sẻ thêm về chủ đề này được không?',
      sender: 'other',
      timestamp: '10:35',
    },
    {
      id: '4',
      content: 'Chắc chắn rồi! Mình sẽ viết thêm bài về nó.',
      sender: 'me',
      timestamp: '10:37',
    },
    {
      id: '5',
      content: 'Cảm ơn bạn đã chia sẻ!',
      sender: 'other',
      timestamp: '10:40',
    },
  ]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageInput,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations List */}
      <Card className="w-full border-border bg-card md:w-80">
        <div className="border-b border-border p-4">
          <h2 className="mb-3 font-semibold text-foreground">Tin nhắn</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm cuộc trò chuyện"
              className="border-input bg-background pl-9 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-120px)]">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`flex w-full gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted ${
                selectedConversation?.id === conversation.id ? 'bg-muted' : ''
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <Avatar className="h-12 w-12 border-2 border-border/50">
                <AvatarImage src={conversation.user.avatar} />
                <AvatarFallback className="bg-muted text-muted-foreground">{conversation.user.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{conversation.user.name}</span>
                  <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
                  {conversation.unread > 0 && (
                    <span className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      {selectedConversation ? (
        <Card className="flex flex-1 flex-col border-border bg-card">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-border/50">
                <AvatarImage src={selectedConversation.user.avatar} />
                <AvatarFallback className="bg-muted text-muted-foreground">{selectedConversation.user.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-foreground">{selectedConversation.user.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedConversation.user.username}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="hover:bg-muted text-muted-foreground hover:text-foreground">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-muted text-muted-foreground hover:text-foreground">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-muted text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      message.sender === 'me'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p>{message.content}</p>
                    <span
                      className={`text-xs ${
                        message.sender === 'me' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}
                    >
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nhập tin nhắn..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="border-input bg-background text-foreground focus:ring-primary"
              />
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-1 items-center justify-center border-border bg-card">
          <p className="text-muted-foreground">Chọn một cuộc trò chuyện để bắt đầu</p>
        </Card>
      )}
    </div>
  );
}
