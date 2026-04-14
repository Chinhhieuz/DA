import { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '@/lib/imageUtils';
import { Search, Send, MoreVertical, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_URL, API_BASE_URL } from '@/lib/api';
import { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Share2, RotateCcw } from 'lucide-react';

interface MessagesProps {
    currentUser: any;
    socket: Socket | null;
    onUserClick?: (userId: string) => void;
    onMessagesRead?: () => void;
}

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

export function Messages({ currentUser, socket, onUserClick, onMessagesRead }: MessagesProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [sharingMessage, setSharingMessage] = useState<any | null>(null);
  const [shareSearchTerm, setShareSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  const token = localStorage.getItem('token');

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Helper to add auth query params (legacy support)
  const withAuthParam = (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}userId=${currentUser.id}`;
  };

  // Load conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch(withAuthParam(`${API_URL}/messages/conversations`), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.status === 'success') {
        const conversationsData = data.data;
        setConversations(conversationsData);
        return conversationsData;
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (targetUserId: string, currentConversations: any[]) => {
      // Find matching conversation or create new
      // String comparison for safer matching with MongoDB IDs
      const existing = currentConversations.find(c => 
          c.participants.some((p: any) => String(p._id) === String(targetUserId))
      );
      
      if (existing) {
          setSelectedConversation(existing);
      } else {
          // Create new chat via API
          try {
              const res = await fetch(withAuthParam(`${API_URL}/messages/start/${targetUserId}`), {
                  method: 'POST',
                  headers: getAuthHeaders()
              });
              const data = await res.json();
              if (data.status === 'success') {
                  const newConv = data.data;
                  // Refresh list and select the new chat
                  await fetchConversations();
                  setSelectedConversation(newConv);
              }
          } catch (e) {
              toast.error('Không thể bắt đầu cuộc trò chuyện');
          }
      }
  };

  // Initial load and redirect check
  useEffect(() => {
    const initChat = async () => {
      const convs = await fetchConversations();
      
      const startChatWith = localStorage.getItem('startChatWith');
      if (startChatWith && convs) {
        localStorage.removeItem('startChatWith');
        handleStartChat(startChatWith, convs);
      }
    };
    initChat();
  }, [currentUser.id]);

  // Handle case where user is already on Messages page but clicks "Message" on another profile
  useEffect(() => {
    const handleStorageChange = () => {
      const startChatWith = localStorage.getItem('startChatWith');
      if (startChatWith) {
        localStorage.removeItem('startChatWith');
        handleStartChat(startChatWith, conversations);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check on a short interval in case storage event doesn't fire (same tab navigation)
    const interval = setInterval(() => {
      const startChatWith = localStorage.getItem('startChatWith');
      if (startChatWith) {
        localStorage.removeItem('startChatWith');
        handleStartChat(startChatWith, conversations);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [conversations]);

  const fetchMessages = async (isLoadMore = false) => {
    if (!selectedConversation) return;
    
    // Nếu đang load thêm và không còn dữ liệu thì dừng
    if (isLoadMore && !hasMore) return;

    try {
      if (isLoadMore) setLoadingMore(true);
      
      const before = isLoadMore && messages.length > 0 ? (messages[0].createdAt || messages[0].created_at) : null;
      let url = `${API_URL}/messages/${selectedConversation._id}?limit=20`;
      if (before) url += `&before=${before}`;

      const res = await fetch(withAuthParam(url), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const newMessages = data.data;
        
        if (isLoadMore) {
          // Lưu vị trí scroll hiện tại để ổn định sau khi thêm tin nhắn cũ
          if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
              scrollPositionRef.current = viewport.scrollHeight - viewport.scrollTop;
            }
          }
          
          setMessages(prev => [...newMessages, ...prev]);
          setHasMore(newMessages.length === 20);
        } else {
          setMessages(newMessages);
          setHasMore(newMessages.length === 20);
          setIsInitialLoad(true); // Đánh dấu là load lần đầu để scroll xuống đáy
        }
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const res = await fetch(withAuthParam(`${API_URL}/messages/${conversationId}/read`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        console.error('Lỗi khi gọi API đánh dấu đã đọc:', res.status);
        return;
      }

      console.log('✅ Đã đánh dấu cuộc trò chuyện đã đọc:', conversationId);

      // Locally update conversation list to reflect read status
      setConversations(prev => prev.map(conv => {
        if (conv._id === conversationId && conv.last_message) {
          return { ...conv, last_message: { ...conv.last_message, is_read: true }, unread_count: 0 };
        }
        return conv;
      }));

      // Notify parent to refresh total unread count
      if (onMessagesRead) onMessagesRead();
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Lần đầu load: cuộn xuống ngay lập tức
        scrollToBottom('instant' as ScrollBehavior);
        setIsInitialLoad(false);
      } else if (prevScrollHeightRef.current > 0) {
        // Sau khi load thêm tin nhắn cũ, giữ nguyên vị trí nhìn
        const container = chatContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
        }
        prevScrollHeightRef.current = 0;
      } else {
        // Tin nhắn mới đến: cuộn xuống mượt
        scrollToBottom();
      }
    }
  }, [messages]);

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    // Khi người dùng cuộn lên gần đỉnh (trong vòng 60px)
    if (container.scrollTop <= 60 && !loadingMore && hasMore && messages.length > 0) {
      // Ghi lại chiều cao hiện tại để ổn định vị trí sau khi load
      prevScrollHeightRef.current = container.scrollHeight;
      fetchMessages(true);
    }
  };

  // Load messages when selectedConversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      markAsRead(selectedConversation._id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, token]);

  // Socket listener
  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        // If message belongs to current chat, add it and mark as read
        if (selectedConversation && String(message.conversation) === String(selectedConversation._id)) {
          setMessages(prev => [...prev, message]);
          markAsRead(selectedConversation._id);
        }
        // Always refresh conversation list for "last message" update
        fetchConversations();
      });

      socket.on('message_revoked', ({ messageId, conversationId }) => {
        if (selectedConversation && String(conversationId) === String(selectedConversation._id)) {
          setMessages(prev => prev.map(m => 
            String(m._id) === String(messageId) ? { ...m, is_revoked: true } : m
          ));
        }
        // Refresh conversation list to update "last message" if it was revoked
        fetchConversations();
      });

      return () => {
        socket.off('receive_message');
        socket.off('message_revoked');
      };
    }
  }, [socket, selectedConversation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh quá lớn (tối đa 5MB)');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !selectedFile) || !selectedConversation) return;

    const recipient = selectedConversation.participants.find((p: any) => String(p._id) !== String(currentUser.id));
    const recipientId = recipient?._id;

    if (!recipientId) return;

    try {
      setUploading(true);
      let attachments: string[] = [];

      // 1. Upload file if exists
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const uploadRes = await fetch(`${API_URL}/upload?user_id=${currentUser.id}`, {
          method: 'POST',
          body: formData,
          // Note: Don't set Content-Type header for FormData, browser does it automatically with boundary
        });

        const uploadData = await uploadRes.json();
        if (uploadData.status === 'success') {
          attachments.push(uploadData.data.url);
        } else {
          toast.error('Không thể tải ảnh lên');
          setUploading(false);
          return;
        }
      }

      // 2. Save message to DB
      const res = await fetch(withAuthParam(`${API_URL}/messages`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipientId,
          content: messageInput,
          attachments: attachments
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const newMessage = data.data;
        setMessages([...messages, newMessage]);
        setMessageInput('');
        removeSelectedFile();

        // 3. Emit via socket
        if (socket) {
          socket.emit('send_message', {
            recipientId,
            message: newMessage
          });
        }
        
        // Refresh chat list to update last message
        fetchConversations();
      }
    } catch (e) {
      console.error('Lỗi gửi tin nhắn:', e);
      toast.error('Lỗi gửi tin nhắn');
    } finally {
      setUploading(false);
    }
  };

  const handleRevokeMessage = async (messageId: string) => {
    try {
      const res = await fetch(`${API_URL}/messages/${messageId}/revoke`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setMessages(prev => prev.map(m => 
          String(m._id) === String(messageId) ? { ...m, is_revoked: true } : m
        ));
        
        // Emit via socket
        const recipient = selectedConversation.participants.find((p: any) => String(p._id) !== String(currentUser.id));
        if (socket && recipient) {
          socket.emit('revoke_message', {
            recipientId: recipient._id,
            messageId,
            conversationId: selectedConversation._id
          });
        }
        
        toast.success('Đã thu hồi tin nhắn');
        fetchConversations();
      } else {
        toast.error(data.message || 'Không thể thu hồi tin nhắn');
      }
    } catch (e) {
      toast.error('Lỗi khi thu hồi tin nhắn');
    }
  };

  const handleShareMessage = async (recipientId: string) => {
    if (!sharingMessage) return;
    
    try {
      const res = await fetch(`${API_URL}/messages/share`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messageId: sharingMessage._id,
          recipientId
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const newMessage = data.data;
        toast.success('Đã chia sẻ tin nhắn');
        setSharingMessage(null);
        
        // Update local message list if sharing to the CURRENTLY open conversation
        const otherParticipant = getOtherParticipant(selectedConversation?.participants);
        const currentChatUserId = otherParticipant?._id || otherParticipant?.id;
        
        if (selectedConversation && String(currentChatUserId) === String(recipientId)) {
          setMessages(prev => [...prev, newMessage]);
        }
        
        // Emit via socket for the shared message
        if (socket) {
          socket.emit('send_message', {
            recipientId,
            message: newMessage
          });
        }
        fetchConversations();
      } else {
        toast.error('Không thể chia sẻ tin nhắn');
      }
    } catch (e) {
      toast.error('Lỗi khi chia sẻ tin nhắn');
    }
  };

  // Helper to find recipient info
  const getOtherParticipant = (participants: any[]) => {
      if (!participants || participants.length === 0) return { username: 'Người dùng', full_name: 'Người dùng' };
      return participants.find(p => String(p._id || p.id) !== String(currentUser.id)) || participants[0];
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-input bg-background pl-9 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-120px)]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Chưa có cuộc trò chuyện nào</div>
          ) : conversations.filter(conv => {
            const otherUser = getOtherParticipant(conv.participants);
            const term = searchTerm.toLowerCase();
            return (otherUser.full_name || '').toLowerCase().includes(term) || 
                   (otherUser.username || '').toLowerCase().includes(term);
          }).map((conversation: any) => {
            const isSelected = selectedConversation?._id === conversation._id;
            const otherUser = getOtherParticipant(conversation.participants);
            const unreadCount = conversation.unread_count || 0;
            const isUnread = unreadCount > 0;

            return (
              <button
                key={conversation._id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 flex items-center gap-3 transition-all border-b border-border/50 hover:bg-muted/50 ${
                  isSelected ? 'bg-primary/10 border-r-2 border-r-primary' : (isUnread ? 'bg-primary/5' : '')
                }`}
              >
                <div className="relative">
                  <Avatar 
                    className="h-12 w-12 border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUserClick) onUserClick(otherUser._id || otherUser.id);
                    }}
                  >
                    <AvatarImage src={getImageUrl(otherUser.avatar_url)} />
                    <AvatarFallback className="bg-muted text-muted-foreground">{otherUser.full_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className={`font-medium truncate ${isUnread ? 'text-primary font-bold' : 'text-foreground'}`}>
                      {otherUser.full_name || otherUser.username}
                    </h4>
                    <span className={`text-[10px] ${isUnread ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {conversation.last_message ? new Date(conversation.last_message.createdAt || conversation.last_message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${isUnread ? 'text-foreground font-semibold max-w-[130px]' : 'text-muted-foreground max-w-[160px]'}`}>
                      {conversation.last_message?.content || (conversation.last_message?.attachments?.length > 0 ? '[Hình ảnh]' : 'Chưa có tin nhắn')}
                    </p>
                    {isUnread && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      {selectedConversation ? (
        <Card className="flex flex-1 flex-col border-border bg-card">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                const other = getOtherParticipant(selectedConversation.participants);
                if (onUserClick) onUserClick(other._id || other.id);
              }}
            >
              <Avatar className="h-10 w-10 border-2 border-border/50">
                <AvatarImage src={getImageUrl(getOtherParticipant(selectedConversation.participants).avatar_url)} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                    {getOtherParticipant(selectedConversation.participants).full_name?.[0] || '?' }
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-foreground">{getOtherParticipant(selectedConversation.participants).full_name || getOtherParticipant(selectedConversation.participants).username}</h3>
                <p className="text-sm text-muted-foreground">@{getOtherParticipant(selectedConversation.participants).username}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="hover:bg-muted text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages - Native scrollable container */}
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
            style={{ scrollBehavior: 'auto' }}
          >
            {/* Load more indicator ở đầu */}
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {!hasMore && messages.length >= 20 && (
              <div className="text-center py-2 text-xs text-muted-foreground italic">
                — Đây là điểm bắt đầu cuộc trò chuyện —
              </div>
            )}

            {messages.map((message) => {
              const isMe = String(message.sender) === String(currentUser.id);
              return (
                <div
                  key={message._id || message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-end gap-2 group max-w-[75%]">
                    {isMe && !message.is_revoked && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSharingMessage(message)} className="cursor-pointer">
                              <Share2 className="h-4 w-4 mr-2" /> Chia sẻ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRevokeMessage(message._id)} className="text-destructive cursor-pointer">
                              <RotateCcw className="h-4 w-4 mr-2" /> Thu hồi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {!isMe && !message.is_revoked && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity order-last shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setSharingMessage(message)} className="cursor-pointer">
                              <Share2 className="h-4 w-4 mr-2" /> Chia sẻ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMe
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      } ${message.is_revoked ? 'opacity-50 border border-dashed border-border' : ''}`}
                    >
                      {message.is_revoked ? (
                        <p className="text-sm italic text-muted-foreground">Tin nhắn đã được thu hồi</p>
                      ) : (
                        <>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mb-1 flex flex-wrap gap-1.5">
                              {message.attachments.map((url: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={getImageUrl(url)}
                                  alt="attachment"
                                  className="max-h-52 max-w-[260px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setZoomedImage(getImageUrl(url))}
                                />
                              ))}
                            </div>
                          )}
                          {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                        </>
                      )}
                      <span className={`text-[10px] block mt-1 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                        {new Date(message.createdAt || message.created_at || message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-px" />
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-4 bg-background/50 backdrop-blur-sm">
            {previewUrl && (
              <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2 duration-200">
                <img src={previewUrl} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-border" />
                <button 
                  onClick={removeSelectedFile}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input 
                type="file" 
                id="message-image-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileSelect}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={() => document.getElementById('message-image-upload')?.click()}
                disabled={uploading}
              >
                <ImagePlus className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Nhập tin nhắn..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="border-input bg-background/50 text-foreground focus:ring-primary h-10"
                disabled={uploading}
              />
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 w-10 h-10 p-0 rounded-full transition-all active:scale-95"
                onClick={handleSendMessage}
                disabled={uploading || (!messageInput.trim() && !selectedFile)}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-1 items-center justify-center border-border bg-card">
          <p className="text-muted-foreground">Chọn một cuộc trò chuyện để bắt đầu</p>
        </Card>
      )}
      {/* Image Zoom Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
          >
            <X className="h-6 w-6" />
          </Button>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 pointer-events-none"
          />
        </div>
      )}
      {/* Share Dialog */}
      <Dialog open={!!sharingMessage} onOpenChange={(open) => !open && setSharingMessage(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Chia sẻ tin nhắn</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm người nhận..."
                value={shareSearchTerm}
                onChange={(e) => setShareSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {conversations
                  .filter(conv => {
                    const otherUser = getOtherParticipant(conv.participants);
                    const term = shareSearchTerm.toLowerCase();
                    return (otherUser.full_name || '').toLowerCase().includes(term) || 
                           (otherUser.username || '').toLowerCase().includes(term);
                  })
                  .map(conv => {
                    const otherUser = getOtherParticipant(conv.participants);
                    return (
                      <button
                        key={conv._id}
                        onClick={() => handleShareMessage(otherUser._id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getImageUrl(otherUser.avatar_url)} />
                          <AvatarFallback>{otherUser.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{otherUser.full_name || otherUser.username}</p>
                          <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="ml-auto text-primary">Gửi</Button>
                      </button>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
