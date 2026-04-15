import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  Eye,
  EyeOff,
  ChevronLeft,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

type LoginAccount = {
  _id?: string;
  id?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  role?: string;
  preferences?: unknown;
  savedPosts?: string[];
};

type LoginPayload = {
  token?: string;
  user?: LoginAccount;
} & Record<string, unknown>;

export function Login({
  onLogin,
  onBackToHome,
}: {
  onLogin: (userData?: LoginPayload) => void;
  onBackToHome?: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isForgotView = currentView === 'forgot';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại!');
      }

      const token = data.data?.token || data.token;
      const userData = data.data as LoginPayload | undefined;
      const account = userData?.user;

      if (!token || !account) {
        throw new Error('Dữ liệu đăng nhập trả về không hợp lệ!');
      }

      localStorage.setItem('token', token);
      localStorage.setItem(
        'currentUser',
        JSON.stringify({
          id: account._id || account.id,
          _id: account._id || account.id,
          name: account.full_name || account.username,
          username: account.username,
          avatar: account.avatar_url || '',
          role: (account.role || 'user').toLowerCase(),
          preferences: account.preferences,
          savedPosts: account.savedPosts || [],
        }),
      );

      onLogin(userData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại!';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || isSendingForgot) return;

    setIsSendingForgot(true);
    const toastId = toast.loading('Hệ thống đang xử lý và gửi email, vui lòng đợi...');

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        toast.success(data.message || `Hướng dẫn đã được gửi tới: ${resetEmail}`, { id: toastId });
        setCurrentView('login');
      } else {
        toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại.', { id: toastId });
      }
    } catch {
      toast.error('Lỗi kết nối đến server!', { id: toastId });
    } finally {
      setIsSendingForgot(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(201,31,40,0.2),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(18,59,116,0.16),transparent_38%),linear-gradient(145deg,#fffefc_0%,#f5f7fb_55%,#eef2f7_100%)]">
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[96rem] items-center px-3 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[88vh] w-full overflow-hidden rounded-[38px] border border-white/70 bg-white/85 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:grid-cols-[1.15fr_1fr]">
          <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#ab111f_0%,#c91f28_46%,#7c102d_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_88%_82%,rgba(18,59,116,0.45),transparent_36%)]" />
            <div className="relative z-10">
              <button
                type="button"
                className="mb-8 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-lg transition hover:-translate-y-0.5"
                onClick={onBackToHome}
                title="Quay lại trang chủ"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" />
                Linky workspace
              </p>

              <h1 className="text-4xl font-black leading-tight">
                {isForgotView ? 'Khôi phục tài khoản an toàn' : 'Chào mừng quay trở lại'}
              </h1>

              <p className="mt-4 max-w-md text-sm leading-6 text-white/85">
                {isForgotView
                  ? 'Nhập tài khoản hoặc email để nhận hướng dẫn khôi phục mật khẩu ngay lập tức.'
                  : 'Đăng nhập để tiếp tục công việc, theo dõi thông báo và quản lý nội dung của bạn.'}
              </p>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-white/75">Bảo mật</p>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold">
                  <ShieldCheck className="h-5 w-5 text-white/90" />
                  Xác thực tài khoản theo phiên
                </p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-white/75">Truy cập nhanh</p>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold">
                  <KeyRound className="h-5 w-5 text-white/90" />
                  Đơn giản, rõ ràng, dễ sử dụng
                </p>
              </div>
            </div>
          </section>

          <section className="relative px-6 py-7 sm:px-12 sm:py-12 lg:px-14">
            <div className="pointer-events-none absolute right-5 top-5 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />

            <button
              type="button"
              className="mb-4 inline-flex items-center gap-1 rounded-xl border border-zinc-200/70 bg-white/85 px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 lg:hidden"
              onClick={isForgotView ? () => setCurrentView('login') : onBackToHome}
            >
              <ChevronLeft className="h-4 w-4" />
              {isForgotView ? 'Quay lại đăng nhập' : 'Quay lại'}
            </button>

            <div className="relative z-10 mx-auto w-full max-w-[500px]">
              <div className="mb-7 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/80">
                  {isForgotView ? 'Password support' : 'Secure login'}
                </p>
                <h2 className="text-3xl font-black tracking-tight text-zinc-900">
                  {isForgotView ? 'Khôi phục mật khẩu' : 'Đăng nhập'}
                </h2>
                <p className="text-sm leading-6 text-zinc-500">
                  {isForgotView
                    ? 'Nhập tài khoản hoặc email, hệ thống sẽ gửi hướng dẫn về hộp thư của bạn.'
                    : 'Nhập thông tin tài khoản đã được cấp để tiếp tục.'}
                </p>
              </div>

              {error && !isForgotView && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {isForgotView ? (
                <form className="space-y-5" onSubmit={handleForgotSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-semibold text-zinc-700">
                      Tài khoản hoặc Email
                    </Label>
                    <Input
                      id="reset-email"
                      type="text"
                      placeholder="Nhập tài khoản hoặc email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="h-12 rounded-2xl border-zinc-200/80 bg-white/80 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-visible:border-primary focus-visible:ring-primary/20"
                      disabled={isSendingForgot}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSendingForgot}
                    className="h-12 w-full rounded-2xl bg-primary text-primary-foreground font-semibold shadow-[0_14px_30px_rgba(201,31,40,0.3)] transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0"
                  >
                    {isSendingForgot ? 'Đang gửi...' : 'Gửi hướng dẫn'}
                    {!isSendingForgot && <ArrowRight className="ml-1 h-4 w-4" />}
                  </Button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleLoginSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-zinc-700">
                      Email / Tài khoản
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Nhập email hoặc tên đăng nhập"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-2xl border-zinc-200/80 bg-white/80 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-visible:border-primary focus-visible:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-zinc-700">
                      Mật khẩu
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-2xl border-zinc-200/80 bg-white/80 px-4 pr-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-visible:border-primary focus-visible:ring-primary/20"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition hover:text-zinc-700"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentView('forgot')}
                      className="text-sm font-medium text-zinc-500 transition hover:text-primary"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-2xl bg-primary text-primary-foreground font-semibold shadow-[0_14px_30px_rgba(201,31,40,0.3)] transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0"
                  >
                    {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                    {!isLoading && <ArrowRight className="ml-1 h-4 w-4" />}
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
