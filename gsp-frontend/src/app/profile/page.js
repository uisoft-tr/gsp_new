'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function ProfilePage() {
    const { user, token, updateUser } = useAuth();
    const router = useRouter();
    const toast = useToast();
    
    const [loading, setLoading] = useState(false);
    const [loginHistory, setLoginHistory] = useState([]);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        loadLoginHistory();
    }, [user]);

    const loadLoginHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login-history/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setLoginHistory(data.results || data || []);
            }
        } catch (error) {
            console.error('Login history yüklenirken hata:', error);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error('Yeni şifreler eşleşmiyor');
            return;
        }
        
        if (passwordData.new_password.length < 8) {
            toast.error('Yeni şifre en az 8 karakter olmalıdır');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/change-password/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: passwordData.current_password,
                    new_password: passwordData.new_password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                toast.success('Şifre başarıyla değiştirildi');
                setShowPasswordForm(false);
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                });
            } else {
                toast.error(data.message || 'Şifre değiştirilemedi');
            }
        } catch (error) {
            console.error('Şifre değiştirme hatası:', error);
            toast.error('Şifre değiştirilirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Başlık */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Profil</h1>
                            <p className="text-gray-600 mt-1">Hesap bilgilerinizi ve giriş geçmişinizi görüntüleyin</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Profil Bilgileri */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Hesap Bilgileri</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                                <p className="mt-1 text-lg text-gray-900">{user.username}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ad</label>
                                <p className="mt-1 text-lg text-gray-900">{user.first_name || 'Belirtilmemiş'}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Soyad</label>
                                <p className="mt-1 text-lg text-gray-900">{user.last_name || 'Belirtilmemiş'}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                                <p className="mt-1 text-lg text-gray-900">{user.email || 'Belirtilmemiş'}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hesap Türü</label>
                                <p className="mt-1 text-lg text-gray-900">
                                    {user.is_superuser ? 'Süper Kullanıcı' : 'Normal Kullanıcı'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowPasswordForm(!showPasswordForm)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {showPasswordForm ? 'İptal' : 'Şifre Değiştir'}
                            </button>
                        </div>
                        
                        {showPasswordForm && (
                            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mevcut Şifre
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData(prev => ({
                                            ...prev,
                                            current_password: e.target.value
                                        }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Yeni Şifre
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData(prev => ({
                                            ...prev,
                                            new_password: e.target.value
                                        }))}
                                        required
                                        minLength={8}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Yeni Şifre (Tekrar)
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData(prev => ({
                                            ...prev,
                                            confirm_password: e.target.value
                                        }))}
                                        required
                                        minLength={8}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Giriş Geçmişi */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Giriş Geçmişi</h2>
                        
                        {loginHistory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">📊</div>
                                <p className="text-gray-600">Henüz giriş geçmişi bulunmuyor</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {loginHistory.map((login, index) => (
                                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {login.ip_address || 'Bilinmeyen IP'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {login.user_agent || 'Bilinmeyen Tarayıcı'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">
                                                    {new Date(login.created_at).toLocaleString('tr-TR')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {login.success ? 'Başarılı' : 'Başarısız'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 