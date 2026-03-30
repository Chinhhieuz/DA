import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

export function Login({ onLogin, onBackToHome }: { onLogin: (userData?: any) => void, onBackToHome?: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  // --- THÊM STATE CHO CHỨC NĂNG LOGIN ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- HÀM XỬ LÝ ĐĂNG NHẬP GỌI API BACKEND ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Xóa lỗi cũ
    setIsLoading(true); // Bật trạng thái loading

    try {
      // Thay đổi URL này cho khớp với port server Node.js của bạn
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Backend đang mong đợi "email" (hoặc tài khoản) và "password"
        body: JSON.stringify({ email, password }), 
      });

      const data = await response.json();

      if (!response.ok) {
        // Ném lỗi ra nếu API trả về status lỗi (400, 401, 500...)
        throw new Error(data.message || 'Đăng nhập thất bại!');
      }

      // ĐĂNG NHẬP THÀNH CÔNG
      // Lưu Token và thông tin user vào localStorage để dùng cho các trang khác
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data.data));

      // Chuyển trang và truyền thông tin user lên component cha
      onLogin(data.data); 
    } catch (err: any) {
      setError(err.message); // Hiển thị lỗi ra màn hình
    } finally {
      setIsLoading(false); // Tắt trạng thái loading
    }
  };

  if (currentView === 'forgot') {
    return (
      <div className="flex min-h-screen w-full bg-white">
        {/* ... [GIỮ NGUYÊN CODE PHẦN BANNER BÊN TRÁI CỦA FORGOT PASSWORD] ... */}
        <div className="hidden lg:flex flex-col justify-between w-[400px] xl:w-[500px] p-10 bg-primary relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-black/10 z-0"></div>
          <div className="relative z-10">
            <div 
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-8 shadow-lg cursor-pointer transition-transform hover:scale-105"
              onClick={() => setCurrentView('login')}
            >
              <span className="text-2xl text-primary">🔗</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Quên mật khẩu?</h1>
            <p className="text-lg text-white/90">Đừng lo lắng, chúng tôi sẽ giúp bạn lấy lại quyền truy cập tài khoản.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 relative">
          <div className="w-full max-w-[400px] flex flex-col gap-6">
            <Button variant="ghost" className="w-fit p-0 h-auto text-primary hover:bg-transparent" onClick={() => setCurrentView('login')}>
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Quay lại đăng nhập
            </Button>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Khôi phục mật khẩu</h2>
              <p className="text-sm text-zinc-500">Nhập email hoặc tên đăng nhập để nhận hướng dẫn khôi phục qua email hệ thống.</p>
            </div>

            <form className="space-y-4" onSubmit={async (e) => { 
                e.preventDefault(); 
                if (!resetEmail || isSendingForgot) return;
                setIsSendingForgot(true);
                const toastId = toast.loading('Hệ thống đang xử lý và gửi email, vui lòng đợi...');
                try {
                  const res = await fetch(`${API_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail })
                  });
                  const data = await res.json();
                  if (res.ok && data.status === 'success') {
                    toast.success(data.message || `Một email hướng dẫn đã được gửi tới: ${resetEmail}`, { id: toastId });
                    setCurrentView('login');
                  } else {
                    toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại.', { id: toastId });
                  }
                } catch (err) {
                  toast.error('Lỗi kết nối đến server!', { id: toastId });
                } finally {
                  setIsSendingForgot(false);
                }
            }}>
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-semibold">Tài khoản hoặc Email</Label>
                <Input
                  id="reset-email"
                  type="text"
                  placeholder="Nhập tên đăng nhập hoặc email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-12 rounded-xl bg-zinc-50 border-transparent focus:border-primary focus:ring-primary transition-colors"
                  disabled={isSendingForgot}
                  required
                />
              </div>

              <Button disabled={isSendingForgot} type="submit" className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-2 shadow-md">
                {isSendingForgot ? 'Đang gửi...' : 'Gửi mã xác thực'} {!isSendingForgot && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left side - Banner */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] xl:w-[500px] p-10 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="relative z-10 text-white">
          <div 
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-8 shadow-lg cursor-pointer transition-transform hover:scale-105"
            onClick={onBackToHome}
            title="Quay lại trang chủ"
          >
            <span className="text-2xl text-primary">🔗</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Chào mừng quay trở lại</h1>
          <p className="text-lg text-white/90">Hệ thống sử dụng tài khoản được cấp. Vui lòng đăng nhập để tiếp tục.</p>
        </div>
        
        <div className="relative z-10">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt="Abstract landscape" 
            className="rounded-xl shadow-2xl border border-white/20 object-cover h-[300px] w-full"
          />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 relative">
        <div className="w-full max-w-[400px] flex flex-col gap-6">
          <div 
            className="lg:hidden w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-2 shadow-lg cursor-pointer transition-transform hover:scale-105"
            onClick={onBackToHome}
            title="Quay lại trang chủ"
          >
            <span className="text-2xl text-white">🔗</span>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Đăng nhập</h2>
            <p className="text-sm text-zinc-500">
              Vui lòng điền thông tin tài khoản đã được cấp.
            </p>
          </div>

          {/* HIỂN THỊ LỖI NẾU CÓ */}
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-zinc-700">
                Email / Tài khoản
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-zinc-50 border-transparent hover:border-zinc-200 focus:border-primary focus:ring-primary transition-colors"
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
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-zinc-50 border-transparent hover:border-zinc-200 focus:border-primary focus:ring-primary transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button 
                type="button"
                onClick={() => setCurrentView('forgot')}
                className="text-sm text-zinc-500 hover:text-primary transition-colors"
              >
                Quên <span className="text-primary font-medium hover:underline underline-offset-4">mật khẩu</span>?
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-2 shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang xử lý...' : (
                <>Đăng nhập <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}