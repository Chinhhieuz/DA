import {
  Search,

  PenSquare,

  Settings,
  Home,
  Shield,
  Bookmark,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  userRole?: 'user' | 'moderator' | 'admin';
  unreadMessagesCount: number;
}

export function Sidebar({ currentView, onViewChange, userRole, unreadMessagesCount }: SidebarProps) {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Trang Chủ' },
    { id: 'create', icon: PenSquare, label: 'Tạo bài viết' },
    { id: 'messages', icon: MessageSquare, label: 'Tin nhắn' },
    { id: 'saved', icon: Bookmark, label: 'Đã lưu' },
  ];

  if (userRole === 'admin') {
    menuItems.push({ id: 'admin', icon: Shield, label: 'Quản trị' });
  }


  return (
    <div className="h-full w-60 border-r border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'secondary' : 'ghost'}
                className={`justify-start gap-3 w-full group relative ${currentView === item.id
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'hover:bg-muted text-muted-foreground'
                  }`}
                onClick={() => onViewChange(item.id)}
              >
                <div className={`rounded-xl p-2 shadow-sm ${currentView === item.id ? 'bg-background' : 'bg-muted'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium flex-1 text-left">{item.label}</span>
                
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <div className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] h-5 shadow-sm animate-in zoom-in duration-300">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </div>
                )}
              </Button>
            );
        })}

      </div>

      <div className="mt-auto pt-4 flex flex-col gap-2">
        <Button
          variant={currentView === 'settings' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-3 ${currentView === 'settings'
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'hover:bg-muted text-muted-foreground'
            }`}
          onClick={() => onViewChange('settings')}
        >
          <div className={`rounded-xl p-2 shadow-sm ${currentView === 'settings' ? 'bg-background' : 'bg-muted'}`}>
            <Settings className="h-5 w-5" />
          </div>
          <span className="font-medium">Cài đặt</span>
        </Button>
      </div>
    </div>
  );
}
