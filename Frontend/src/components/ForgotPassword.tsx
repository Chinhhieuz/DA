import React, { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Vui lòng nhập email');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        setIsSent(true);
        toast.success(data.message || 'Đã gửi email khôi phục mật khẩu!');
      } else {
        toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
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
        <div className="mb-6 flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors" onClick={onBackToLogin}>
           <ArrowLeft className="h-4 w-4" />
           <span className="text-sm font-medium">Quay lại đăng nhập</span>
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
             <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Quên Mật Khẩu?</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isSent 
              ? 'Chúng tôi đã gửi một liên kết khôi phục vào email của bạn. Vui lòng kiểm tra hộp thư đến.' 
              : 'Đừng lo lắng, hãy nhập email mà bạn đã đăng ký tài khoản, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.'}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-foreground/80">Địa chỉ Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Ví dụ: nguyenvan@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-border bg-muted/30 px-4 focus:bg-background transition-all focus:ring-primary/20"
                required 
              />
            </div>
            
            <Button 
                type="submit" 
                className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90 rounded-lg shadow-md"
                disabled={isLoading}
            >
              {isLoading ? 'Đang gửi yêu cầu...' : 'Khôi phục Mật Khẩu'}
            </Button>
          </form>
        ) : (
          <Button 
              className="w-full h-11 text-base font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg shadow-sm"
              onClick={onBackToLogin}
          >
            Trở về màn hình đăng nhập
          </Button>
        )}
      </Card>
    </div>
  );
}
