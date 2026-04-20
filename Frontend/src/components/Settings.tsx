import { useState, useEffect } from 'react';
import { Bell, Lock, Palette, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';

const normalizeBoolean = (value: any, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

export function Settings({ currentUser, onUpdatePreferences, onLogout }: { currentUser?: any, onUpdatePreferences?: (prefs: any) => void, onLogout?: () => void }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const { setTheme } = useTheme();

  const [pushNotif, setPushNotif] = useState(normalizeBoolean(currentUser?.preferences?.pushNotifications, true));
  const [commentNotif, setCommentNotif] = useState(normalizeBoolean(currentUser?.preferences?.commentNotifications, true));
  const [darkMode, setDarkMode] = useState(normalizeBoolean(currentUser?.preferences?.darkMode, false));
  const accountId = currentUser?.id || currentUser?._id;
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
  };

  useEffect(() => {
    if (currentUser?.preferences) {
      setPushNotif(normalizeBoolean(currentUser.preferences.pushNotifications, true));
      setCommentNotif(normalizeBoolean(currentUser.preferences.commentNotifications, true));
      setDarkMode(normalizeBoolean(currentUser.preferences.darkMode, false));
    }
  }, [currentUser?.preferences]);

  const handlePreferencesChange = async (key: string, value: boolean) => {
    const previousPrefs = { pushNotifications: pushNotif, commentNotifications: commentNotif, darkMode };
    const nextValue = normalizeBoolean(value, false);
    const newPrefs = { ...previousPrefs, [key]: nextValue };

    setPushNotif(newPrefs.pushNotifications);
    setCommentNotif(newPrefs.commentNotifications);
    setDarkMode(newPrefs.darkMode);
    if (key === 'darkMode') {
      setTheme(nextValue ? 'dark' : 'light');
    }

    if (key === 'pushNotifications' && nextValue && 'Notification' in window && Notification.permission !== 'granted') {
      try {
        Notification.requestPermission().then(perm => {
          if (perm !== 'granted') {
            toast.error('Vui lòng cấp quyền thông báo trong cài đặt trình duyệt');
          }
        }).catch(() => {
          toast.error('Trình duyệt đang chặn cửa sổ xin quyền thông báo');
        });
      } catch (e) {
        toast.error('Vui lòng cấp quyền thông báo trong cài đặt trình duyệt');
      }
    }

    if (!accountId) {
      toast.error('Bạn cần đăng nhập để thay đổi cài đặt');
      setPushNotif(previousPrefs.pushNotifications);
      setCommentNotif(previousPrefs.commentNotifications);
      setDarkMode(previousPrefs.darkMode);
      if (key === 'darkMode') {
        setTheme(previousPrefs.darkMode ? 'dark' : 'light');
      }
      return;
    }

    setIsSavingPreferences(true);
    try {
      const response = await fetch(`${API_URL}/auth/settings`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ accountId, preferences: newPrefs })
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Lỗi khi lưu cài đặt');
      }
      if (onUpdatePreferences) onUpdatePreferences(newPrefs);
      toast.success('Đã cập nhật cài đặt');
    } catch (e: any) {
      setPushNotif(previousPrefs.pushNotifications);
      setCommentNotif(previousPrefs.commentNotifications);
      setDarkMode(previousPrefs.darkMode);
      if (key === 'darkMode') {
        setTheme(previousPrefs.darkMode ? 'dark' : 'light');
      }
      toast.error(e.message || 'Lỗi khi lưu cài đặt');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.old || !passData.new || !passData.confirm) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (passData.new.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passData.new !== passData.confirm) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (!accountId) {
      toast.error('Bạn cần đăng nhập để đổi mật khẩu');
      return;
    }

    try {
      setIsSubmittingPassword(true);
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ accountId, oldPassword: passData.old, newPassword: passData.new })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.success('Đã đổi mật khẩu thành công');
        setIsChangingPassword(false);
        setPassData({ old: '', new: '', confirm: '' });
      } else {
        toast.error(data.message || 'Không thể đổi mật khẩu');
      }
    } catch (e) {
      toast.error('Lỗi máy chủ');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="page-hero px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative z-[1] space-y-5">
          <div className="max-w-2xl">
            <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Control Panel
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">Kiểm soát thông báo, bảo mật và chế độ hiển thị từ một nơi.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Sắp xếp lại các tùy chọn quan trọng theo từng nhóm để dễ quét, dễ đổi và dễ quay lại sau này.
            </p>
          </div>
          <div className="page-stat-grid max-w-3xl">
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Push</div>
              <div className="mt-2 text-2xl font-black text-foreground">{pushNotif ? 'On' : 'Off'}</div>
              <div className="mt-1 text-sm text-muted-foreground">Thông báo đẩy</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Comment</div>
              <div className="mt-2 text-2xl font-black text-foreground">{commentNotif ? 'On' : 'Off'}</div>
              <div className="mt-1 text-sm text-muted-foreground">Cảnh báo bình luận</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Theme</div>
              <div className="mt-2 text-2xl font-black text-foreground">{darkMode ? 'Dark' : 'Light'}</div>
              <div className="mt-1 text-sm text-muted-foreground">Chế độ hiện tại</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="page-section-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Thông báo</h3>
            <p className="text-sm text-muted-foreground">Quản lý thông báo và cảnh báo cho từng loại tương tác.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="page-soft-surface rounded-[22px] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="push-notifications">Thông báo đẩy</Label>
                <p className="mt-1 text-sm text-muted-foreground">Nhận thông báo về hoạt động mới trên hệ thống.</p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotif}
                onCheckedChange={(v) => handlePreferencesChange('pushNotifications', v)}
                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                disabled={isSavingPreferences}
              />
            </div>
          </div>

          <Separator className="bg-border/60" />

          <div className="page-soft-surface rounded-[22px] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="comment-notifications">Thông báo bình luận</Label>
                <p className="mt-1 text-sm text-muted-foreground">Được thông báo khi có người bình luận vào bài viết của bạn.</p>
              </div>
              <Switch
                id="comment-notifications"
                checked={commentNotif}
                onCheckedChange={(v) => handlePreferencesChange('commentNotifications', v)}
                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                disabled={isSavingPreferences}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="page-section-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10">
            <Lock className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bảo mật</h3>
            <p className="text-sm text-muted-foreground">Cập nhật mật khẩu và giữ tài khoản an toàn.</p>
          </div>
        </div>

        {!isChangingPassword ? (
          <div className="page-soft-surface rounded-[22px] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Làm mới thông tin đăng nhập
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Nên đổi mật khẩu định kỳ và sử dụng chuỗi ký tự khó đoán.</p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => setIsChangingPassword(true)}>
                Đổi mật khẩu
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePassChange} className="page-soft-surface space-y-4 rounded-[24px] p-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mật khẩu cũ</Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu cũ"
                value={passData.old}
                onChange={(e) => setPassData({ ...passData, old: e.target.value })}
                className="h-11 rounded-xl border-border bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới"
                  value={passData.new}
                  onChange={(e) => setPassData({ ...passData, new: e.target.value })}
                  className="h-11 rounded-xl border-border bg-background pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Xác nhận mật khẩu</Label>
              <Input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={passData.confirm}
                onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
                className="h-11 rounded-xl border-border bg-background"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmittingPassword} className="h-11 flex-1 rounded-full bg-primary font-bold text-white hover:bg-primary/90">
                {isSubmittingPassword ? 'Đang lưu...' : 'Lưu mật khẩu'}
              </Button>
              <Button type="button" variant="ghost" className="h-11 rounded-full px-5" onClick={() => setIsChangingPassword(false)} disabled={isSubmittingPassword}>
                Huy
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="page-section-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Giao diện</h3>
            <p className="text-sm text-muted-foreground">Tùy chỉnh chế độ hiển thị cho trải nghiệm phù hợp hơn.</p>
          </div>
        </div>

        <div className="page-soft-surface rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="dark-mode">Chế độ tối</Label>
              <p className="mt-1 text-sm text-muted-foreground">Sử dụng giao diện tối cho không gian hiển thị đậm hơn.</p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={(v) => handlePreferencesChange('darkMode', v)}
              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              disabled={isSavingPreferences}
            />
          </div>
        </div>
      </Card>

      <Card className="page-section-card p-6 shadow-sm">
        <div className="rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Đăng xuất</h3>
              <p className="mt-1 text-sm text-muted-foreground">Thoát khỏi phiên hiện tại và xóa thông tin đăng nhập trên thiết bị này.</p>
            </div>
            <Button type="button" variant="destructive" className="rounded-full" onClick={() => onLogout?.()}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
