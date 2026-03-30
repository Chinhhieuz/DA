import {
  Search,

  PenSquare,

  Settings,
  Home,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  userRole?: 'user' | 'moderator' | 'admin';
}

export function Sidebar({ currentView, onViewChange, userRole }: SidebarProps) {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Trang Chủ' },
    { id: 'create', icon: PenSquare, label: 'Tạo bài viết' },
  ];

  if (userRole === 'admin') {
    menuItems.push({ id: 'admin', icon: Shield, label: 'Quản trị' });
  }

  // Import Shield if not already present
  // Note: Sidebar already imports from lucide-react, I need to make sure Shield is there.


  return (
    <div className="h-full w-60 border-r border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentView === item.id ? 'secondary' : 'ghost'}
              className={`justify-start gap-3 ${currentView === item.id
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'hover:bg-muted text-muted-foreground'
                }`}
              onClick={() => onViewChange(item.id)}
            >
              <div className={`rounded-xl p-2 shadow-sm ${currentView === item.id ? 'bg-background' : 'bg-muted'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        })}

      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-muted text-muted-foreground"
          onClick={() => onViewChange('settings')}
        >
          <div className="rounded-xl bg-muted p-2 shadow-sm">
            <Settings className="h-5 w-5" />
          </div>
          <span className="font-medium">Cài đặt</span>
        </Button>
      </div>
    </div>
  );
}
