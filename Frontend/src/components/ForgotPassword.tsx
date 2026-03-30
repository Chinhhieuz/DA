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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-slate-200 bg-white rounded-2xl">
        <div className="mb-6 flex items-center gap-2 cursor-pointer text-gray-500 hover:text-gray-900 transition-colors" onClick={onBackToLogin}>
           <ArrowLeft className="h-4 w-4" />
           <span className="text-sm font-medium">Quay lại đăng nhập</span>
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
             <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Quên Mật Khẩu?</h1>
          <p className="text-gray-600 text-sm">
            {isSent 
              ? 'Chúng tôi đã gửi một liên kết khôi phục vào email của bạn. Vui lòng kiểm tra hộp thư đến.' 
              : 'Đừng lo lắng, hãy nhập email mà bạn đã đăng ký tài khoản, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.'}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-gray-700">Địa chỉ Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Ví dụ: nguyenvan@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg border-slate-300 bg-slate-50 px-4 focus:bg-white transition-colors"
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
