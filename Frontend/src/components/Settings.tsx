import { useState } from 'react';
import { Bell, Lock, Palette, LogOut, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function Settings({ currentUser, onUpdatePreferences, onLogout }: 
  { currentUser?: any, onUpdatePreferences?: (prefs: any) => void, onLogout?: () => void }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });

  const [pushNotif, setPushNotif] = useState(currentUser?.preferences?.pushNotifications ?? true);
  const [commentNotif, setCommentNotif] = useState(currentUser?.preferences?.commentNotifications ?? true);
  const [darkMode, setDarkMode] = useState(currentUser?.preferences?.darkMode ?? false);

  const handlePreferencesChange = async (key: string, value: boolean) => {
     const newPrefs = { pushNotifications: pushNotif, commentNotifications: commentNotif, darkMode, [key]: value };
     if (key === 'pushNotifications') setPushNotif(value);
     if (key === 'commentNotifications') setCommentNotif(value);
     if (key === 'darkMode') setDarkMode(value);

     if (onUpdatePreferences) onUpdatePreferences(newPrefs);
     
     if (currentUser?.id) {
       try {
         await fetch(`${API_URL}/auth/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: currentUser.id, preferences: newPrefs })
         });
       } catch (e) {
         toast.error('Lỗi khi lưu cài đặt');
       }
     }
  };

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (!currentUser?.id) {
      toast.error('Bạn cần đăng nhập để đổi mật khẩu');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ accountId: currentUser.id, oldPassword: passData.old, newPassword: passData.new })
      });
      const data = await res.json();
      if (data.status === 'success') {
         toast.success('Đã đổi mật khẩu thành công');
         setIsChangingPassword(false);
         setPassData({ old: '', new: '', confirm: '' });
      } else {
         toast.error(data.message);
      }
    } catch(e) { toast.error('Lỗi máy chủ'); }
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-foreground">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý tài khoản và tùy chỉnh trải nghiệm</p>
      </div>


      {/* Notification Settings */}
      <Card className="border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Thông báo</h3>
            <p className="text-sm text-muted-foreground">Quản lý thông báo và cảnh báo</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications">Thông báo đẩy</Label>
              <p className="text-sm text-muted-foreground">Nhận thông báo về hoạt động mới</p>
            </div>
            <Switch 
              id="push-notifications" 
              checked={pushNotif} 
              onCheckedChange={(v) => handlePreferencesChange('pushNotifications', v)}
              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
            />
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="comment-notifications">Thông báo bình luận</Label>
              <p className="text-sm text-muted-foreground">Được thông báo khi có người bình luận</p>
            </div>
            <Switch 
              id="comment-notifications" 
              checked={commentNotif} 
              onCheckedChange={(v) => handlePreferencesChange('commentNotifications', v)}
              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
            />
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bảo mật</h3>
            <p className="text-sm text-muted-foreground">Mật khẩu và xác thực</p>
          </div>
        </div>

        <div className="space-y-3">
          {!isChangingPassword ? (
            <>
              <Button
                variant="outline"
                className="w-full justify-start border-border hover:bg-muted text-foreground"
                onClick={() => setIsChangingPassword(true)}
              >
                Đổi mật khẩu
              </Button>
            </>
          ) : (
            <form onSubmit={handlePassChange} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Mật khẩu cũ</Label>
                <Input 
                  type="password" 
                  placeholder="Nhập mật khẩu cũ"
                  value={passData.old}
                  onChange={(e) => setPassData({...passData, old: e.target.value})}
                  className="h-10 rounded-lg border-border bg-background"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Mật khẩu mới</Label>
                <div className="relative">
                  <Input 
                    type={showPass ? 'text' : 'password'} 
                    placeholder="Nhập mật khẩu mới"
                    value={passData.new}
                    onChange={(e) => setPassData({...passData, new: e.target.value})}
                    className="h-10 rounded-lg border-border bg-background pr-10"
                    required 
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Xác nhận mật khẩu mới</Label>
                <Input 
                  type="password" 
                  placeholder="Xác nhận mật khẩu mới"
                  value={passData.confirm}
                  onChange={(e) => setPassData({...passData, confirm: e.target.value})}
                  className="h-10 rounded-lg border-border bg-background"
                  required 
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-lg shadow-sm">
                  Lưu mật khẩu
                </Button>
                <Button type="button" variant="ghost" className="px-4" onClick={() => setIsChangingPassword(false)}>
                  Hủy
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>


      {/* Appearance Settings */}
      <Card className="border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Giao diện</h3>
            <p className="text-sm text-muted-foreground">Tùy chỉnh giao diện ứng dụng</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode">Chế độ tối</Label>
              <p className="text-sm text-muted-foreground">Sử dụng giao diện tối</p>
            </div>
            <Switch 
              id="dark-mode" 
              checked={darkMode} 
              onCheckedChange={(v) => handlePreferencesChange('darkMode', v)}
              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
            />
          </div>
        </div>
      </Card>    </div>

  );
}
