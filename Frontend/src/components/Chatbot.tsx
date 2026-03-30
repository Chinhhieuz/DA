import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
}

const botResponses: Record<string, string> = {
  'react': 'React là một thư viện JavaScript mã nguồn mở để xây dựng giao diện người dùng. React sử dụng Virtual DOM để tối ưu hiệu suất và hỗ trợ component-based architecture. Bạn có thể bắt đầu học React tại reactjs.org! 🚀',
  'python': 'Python là ngôn ngữ lập trình đa năng, dễ học và rất phổ biến trong lĩnh vực Data Science, AI/ML, Web Development và Automation. Các thư viện phổ biến: NumPy, Pandas, TensorFlow, Django. 🐍',
  'sql': 'SQL (Structured Query Language) là ngôn ngữ dùng để quản lý và thao tác cơ sở dữ liệu quan hệ. Các lệnh cơ bản: SELECT, INSERT, UPDATE, DELETE. Hệ quản trị CSDL phổ biến: MySQL, PostgreSQL, SQL Server. 🗄️',
  'ai': 'Trí tuệ nhân tạo (AI) bao gồm Machine Learning, Deep Learning, NLP và Computer Vision. Các framework phổ biến: TensorFlow, PyTorch, scikit-learn. AI đang được ứng dụng rộng rãi trong y tế, giáo dục, tài chính. 🤖',
  'javascript': 'JavaScript là ngôn ngữ lập trình phổ biến nhất thế giới. Dùng cho cả Frontend (React, Vue, Angular) và Backend (Node.js). ES6+ mang đến nhiều tính năng hiện đại như arrow functions, async/await, destructuring. ⚡',
  'html': 'HTML (HyperText Markup Language) là ngôn ngữ đánh dấu tiêu chuẩn để tạo trang web. HTML5 hỗ trợ nhiều tính năng mới như semantic elements, canvas, video/audio, geolocation. 📄',
  'css': 'CSS (Cascading Style Sheets) dùng để tạo kiểu cho các phần tử HTML. CSS3 hỗ trợ flexbox, grid, animations, media queries cho responsive design. Framework phổ biến: Tailwind CSS, Bootstrap. 🎨',
  'git': 'Git là hệ thống quản lý phiên bản phân tán. Các lệnh cơ bản: git init, git add, git commit, git push, git pull, git branch, git merge. GitHub và GitLab là các nền tảng hosting repo phổ biến. 📂',
  'database': 'Cơ sở dữ liệu là hệ thống lưu trữ và quản lý dữ liệu. Có 2 loại chính: SQL (MySQL, PostgreSQL) và NoSQL (MongoDB, Redis). Thiết kế CSDL tốt đòi hỏi hiểu về normalization và indexing. 💾',
  'network': 'Mạng máy tính là hệ thống kết nối các thiết bị để chia sẻ tài nguyên. Mô hình OSI gồm 7 tầng. Các giao thức quan trọng: TCP/IP, HTTP/HTTPS, DNS, DHCP. Bảo mật mạng với Firewall, VPN, SSL/TLS. 🌐',
};

function getBotResponse(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  for (const [keyword, response] of Object.entries(botResponses)) {
    if (lowerMsg.includes(keyword)) {
      return response;
    }
  }

  if (lowerMsg.includes('xin chào') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    return 'Xin chào! 👋 Mình là Linky AI Assistant. Mình có thể giúp bạn tìm hiểu về lập trình, công nghệ và các môn học CNTT. Hãy hỏi mình bất cứ điều gì nha!';
  }
  if (lowerMsg.includes('cảm ơn') || lowerMsg.includes('thanks')) {
    return 'Không có gì nha! 😊 Nếu có câu hỏi gì khác thì cứ hỏi mình nhé!';
  }
  if (lowerMsg.includes('giúp') || lowerMsg.includes('help')) {
    return 'Mình có thể giúp bạn về: \n• Lập trình (React, Python, JavaScript, HTML, CSS)\n• Cơ sở dữ liệu (SQL, MongoDB)\n• Trí tuệ nhân tạo (AI/ML)\n• Mạng máy tính\n• Git & Version Control\n\nHãy hỏi mình bất kỳ chủ đề nào nhé! 💡';
  }

  return 'Cảm ơn câu hỏi của bạn! Mình đang tìm hiểu thêm về chủ đề này. Bạn có thể thử hỏi về: React, Python, JavaScript, SQL, AI, HTML, CSS, Git, Database, hoặc Network nhé! 😊';
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'bot',
      content: 'Xin chào! 👋 Mình là **Linky AI Assistant**. Mình có thể giúp bạn giải đáp các câu hỏi về lập trình, công nghệ thông tin và các môn học CNTT. Hãy hỏi mình bất cứ điều gì nha!',
      timestamp: getCurrentTime(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: getBotResponse(userMessage.content),
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'React là gì?',
    'Học Python bắt đầu từ đâu?',
    'SQL cơ bản',
    'Giới thiệu về AI',
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className={`h-8 w-8 shrink-0 ${msg.role === 'bot' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-slate-600'}`}>
                <AvatarFallback className={`text-white text-sm ${msg.role === 'bot' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-slate-600'}`}>
                  {msg.role === 'bot' ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">{msg.timestamp}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0 bg-gradient-to-br from-red-500 to-red-600">
                <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Gợi ý câu hỏi:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm rounded-full transition-colors border border-primary/20"
                  onClick={() => {
                    setInputValue(q);
                    inputRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Nhập câu hỏi của bạn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              className="flex-1 border-input bg-background focus:border-primary focus:ring-primary rounded-full px-4 text-foreground"
            />
            <Button
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 text-white shrink-0 h-10 w-10"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
