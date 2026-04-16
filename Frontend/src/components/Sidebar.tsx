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
    <div className="glass-panel flex h-full w-72 flex-col rounded-r-[28px] border-l-0 p-4">
      <div className="mb-5 px-2">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground">Điều hướng</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-foreground">Khám phá nhanh</h2>
      </div>
      <div className="flex flex-col gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'secondary' : 'ghost'}
                className={`group relative h-14 w-full justify-start gap-3 rounded-2xl ${currentView === item.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
                    : 'text-muted-foreground hover:bg-white/70 dark:hover:bg-white/10 hover:text-foreground'
                  }`}
                onClick={() => onViewChange(item.id)}
              >
                <div className={`rounded-2xl p-2.5 shadow-sm ${currentView === item.id ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
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

      <div className="mt-auto flex flex-col gap-2 border-t border-border/70 pt-4">
        <Button
          variant={currentView === 'settings' ? 'secondary' : 'ghost'}
          className={`h-14 w-full justify-start gap-3 rounded-2xl ${currentView === 'settings'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
              : 'text-muted-foreground hover:bg-white/70 dark:hover:bg-white/10 hover:text-foreground'
            }`}
          onClick={() => onViewChange('settings')}
        >
          <div className={`rounded-2xl p-2.5 shadow-sm ${currentView === 'settings' ? 'bg-white/15 text-white' : 'bg-muted text-foreground'}`}>
            <Settings className="h-5 w-5" />
          </div>
          <span className="font-medium">Cài đặt</span>
        </Button>
      </div>
    </div>
  );
}
