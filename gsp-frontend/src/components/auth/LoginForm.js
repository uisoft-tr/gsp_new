'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function LoginForm() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = 'Kullanıcı adı gereklidir';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Şifre en az 4 karakter olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || loading) return;
    
    // Basic validation
    if (!formData.username || !formData.password) {
      toast.error('Kullanıcı adı ve şifre gerekli');
      return;
    }

    try {
      setIsSubmitting(true);
      
      console.log('🚀 Form submitted with data:', { username: formData.username });
      
      const result = await login(formData);
      
      console.log('🎉 Login result:', result);
      
      toast.success('Giriş başarılı! Yönlendiriliyorsunuz...');

      // AuthContext will handle the redirect automatically after login
      // No manual redirect needed here

    } catch (error) {
      console.error('💥 Login form error:', error);
      
      // Show user-friendly error message
      let errorMessage = error.message || 'Giriş yapılırken bir hata oluştu';
      
      // Handle specific error cases
      if (error.message.includes('Backend sunucusuna bağlanılamıyor')) {
        errorMessage = 'Backend sunucusu çalışmıyor. Lütfen sunucuyu başlatın.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Kullanıcı adı veya şifre hatalı';
      } else if (error.message.includes('500')) {
        errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || loading;

  return (
    <Card className="w-full max-w-md" shadow="xl" padding="lg">
      <Card.Header>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">GSP'ye Hoş Geldiniz</h2>
          <p className="text-gray-600">Hesabınıza giriş yapın</p>
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Test kullanıcısı ile giriş yapabilirsiniz
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Kullanıcı Adı"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Kullanıcı adınızı girin"
            error={errors.username}
            required
            disabled={isDisabled}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <Input
            label="Şifre"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Şifrenizi girin"
            error={errors.password}
            required
            disabled={isDisabled}
            showPasswordToggle
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={isDisabled}
              />
              <span className="ml-2 text-sm text-gray-600">Beni hatırla</span>
            </label>
            
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium disabled:opacity-50"
              onClick={() => router.push('/forgot-password')}
              disabled={isDisabled}
            >
              Şifremi unuttum
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isDisabled}
            disabled={isDisabled}
          >
            {isDisabled ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
      </Card.Body>
    </Card>
  );
} 