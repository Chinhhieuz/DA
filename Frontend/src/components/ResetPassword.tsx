import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ResetPasswordProps {
  token: string;
  onSuccess: () => void;
}

export function ResetPassword({ token, onSuccess }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Mật khẩu phải dài ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await resp.json();
      
      if (resp.ok && data.status === 'success') {
        toast.success(data.message || 'Đổi mật khẩu thành công! Bạn có thể đăng nhập.');
        setTimeout(() => {
          onSuccess(); // Redirect to login
        }, 1500);
      } else {
        toast.error(data.message || 'Liên kết không hợp lệ hoặc đã hết hạn.');
      }
    } catch (e) {
      toast.error('Lỗi kết nối đến máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -left-10 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
      <Card className="relative z-10 w-full max-w-md p-8 shadow-2xl border-border bg-card rounded-[28px] glass-panel transition-all duration-300">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
             <Lock className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Tạo Mật Khẩu Mới</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vui lòng tạo một mật khẩu mới mạnh mẽ và an toàn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2 relative">
            <Label className="text-sm font-bold text-foreground/80">Mật khẩu mới</Label>
            <div className="relative">
              <Input 
                type={showPass ? 'text' : 'password'} 
                placeholder="Nhập mật khẩu mới..." 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-border bg-muted/30 px-4 pr-10 focus:bg-background transition-all focus:ring-primary/20"
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2 relative">
            <Label className="text-sm font-bold text-foreground/80">Xác nhận mật khẩu</Label>
            <Input 
              type={showPass ? 'text' : 'password'} 
              placeholder="Nhập lại mật khẩu mới..." 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-xl border-border bg-muted/30 px-4 focus:bg-background transition-all focus:ring-primary/20"
              required 
            />
          </div>
          
          <Button 
              type="submit" 
              className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90 rounded-lg shadow-md mt-4"
              disabled={isLoading}
          >
            {isLoading ? 'Đang cập nhật...' : 'Cập nhật Mật Khẩu'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
