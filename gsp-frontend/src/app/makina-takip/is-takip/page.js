'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function MakinaIsTakipPage() {
    const { token } = useAuth();
    const router = useRouter();
    const toast = useToast();
    
    const [makinalar, setMakinalar] = useState([]);
    const [isler, setIsler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMakina, setSelectedMakina] = useState(null);
    const [showIsEkleForm, setShowIsEkleForm] = useState(false);
    const [isEkleForm, setIsEkleForm] = useState({
        makina_id: '',
        is_tipi: 'sulama',
        baslik: '',
        aciklama: '',
        baslangic_zamani: '',
        enlem: '',
        boylam: ''
    });

    useEffect(() => {
        if (token) {
            loadMakinalar();
            loadIsler();
        }
    }, [token]);

    const loadMakinalar = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sulama/makinalar/harita_verileri/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Makinalar yüklendi:', data);
                setMakinalar(data.makinalar || []);
            } else {
                console.error('Makinalar yüklenemedi:', response.status);
                toast.error('Makinalar yüklenemedi');
            }
        } catch (error) {
            console.error('Makinalar yüklenirken hata:', error);
            toast.error('Makinalar yüklenirken hata oluştu');
        }
    };

    const loadIsler = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sulama/makina-isler/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('İşler yüklendi:', data);
                // API'den gelen veri yapısını kontrol et
                setIsler(Array.isArray(data) ? data : []);
            } else {
                console.error('İşler yüklenemedi:', response.status);
                toast.error('İşler yüklenemedi');
                setIsler([]);
            }
        } catch (error) {
            console.error('İşler yüklenirken hata:', error);
            toast.error('İşler yüklenirken hata oluştu');
            setIsler([]);
        } finally {
            setLoading(false);
        }
    };

    const handleIsEkle = async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/sulama/makina-isler/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(isEkleForm)
            });
            
            if (response.ok) {
                toast.success('İş başarıyla eklendi');
                setShowIsEkleForm(false);
                setIsEkleForm({
                    makina_id: '',
                    is_tipi: 'sulama',
                    baslik: '',
                    aciklama: '',
                    baslangic_zamani: '',
                    enlem: '',
                    boylam: ''
                });
                loadIsler();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'İş eklenirken hata oluştu');
            }
        } catch (error) {
            console.error('İş eklenirken hata:', error);
            toast.error('İş eklenirken hata oluştu');
        }
    };

    const handleIsDurumGuncelle = async (isId, yeniDurum) => {
        try {
            let endpoint = '';
            if (yeniDurum === 'devam_ediyor') {
                endpoint = `${API_BASE_URL}/api/sulama/makina-isler/${isId}/is_baslat/`;
            } else if (yeniDurum === 'tamamlandi') {
                endpoint = `${API_BASE_URL}/api/sulama/makina-isler/${isId}/is_tamamla/`;
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                toast.success('İş durumu güncellendi');
                loadIsler();
            } else {
                toast.error('İş durumu güncellenirken hata oluştu');
            }
        } catch (error) {
            console.error('İş durumu güncellenirken hata:', error);
            toast.error('İş durumu güncellenirken hata oluştu');
        }
    };

    const getDurumBadge = (durum) => {
        const badges = {
            'planlandi': 'bg-yellow-100 text-yellow-800',
            'devam_ediyor': 'bg-blue-100 text-blue-800',
            'tamamlandi': 'bg-green-100 text-green-800',
            'iptal': 'bg-red-100 text-red-800'
        };
        return badges[durum] || 'bg-gray-100 text-gray-800';
    };

    const getIsTipiIcon = (tip) => {
        const icons = {
            'sulama': '💧',
            'bakim': '🔧',
            'tamir': '🔨',
            'tasima': '🚚',
            'kazma': '⛏️',
            'diger': '⚙️'
        };
        return icons[tip] || '⚙️';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <h3 className="mt-6 text-xl font-semibold text-blue-900">Makina İş Takibi Yükleniyor...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Başlık */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Makina İş Takibi</h1>
                                <p className="text-gray-600 mt-1">Makinaların yapılan işlerini takip edin</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowIsEkleForm(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Yeni İş Ekle
                        </button>
                    </div>
                </div>

                {/* İş Listesi */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Makina İşleri</h2>
                    
                    {isler.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-gray-500 text-lg">Henüz iş kaydı bulunmuyor.</p>
                            <p className="text-gray-400 text-sm mt-2">Yeni iş eklemek için "Yeni İş Ekle" butonunu kullanın.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            İş
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Makina
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Durum
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Başlangıç
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Bitiş
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            İşlemler
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isler.map((is) => (
                                        <tr key={is.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="text-2xl mr-3">
                                                        {getIsTipiIcon(is.is_tipi)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{is.baslik}</div>
                                                        <div className="text-sm text-gray-500">{is.aciklama}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{is.makina?.isim}</div>
                                                <div className="text-sm text-gray-500">{is.makina?.makina_tipi}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurumBadge(is.durum)}`}>
                                                    {is.durum}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(is.baslangic_zamani).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {is.bitis_zamani ? new Date(is.bitis_zamani).toLocaleString('tr-TR') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    {is.durum === 'planlandi' && (
                                                        <button
                                                            onClick={() => handleIsDurumGuncelle(is.id, 'devam_ediyor')}
                                                            className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                                        >
                                                            Başlat
                                                        </button>
                                                    )}
                                                    {is.durum === 'devam_ediyor' && (
                                                        <button
                                                            onClick={() => handleIsDurumGuncelle(is.id, 'tamamlandi')}
                                                            className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
                                                        >
                                                            Tamamla
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* İş Ekleme Modal */}
                {showIsEkleForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Yeni İş Ekle</h3>
                            
                            <form onSubmit={handleIsEkle}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Makina
                                        </label>
                                        <select
                                            value={isEkleForm.makina_id}
                                            onChange={(e) => setIsEkleForm({...isEkleForm, makina_id: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="">Makina Seçin</option>
                                            {makinalar.map((makina) => (
                                                <option key={makina.id} value={makina.id}>
                                                    {makina.isim} - {makina.makina_tipi}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            İş Tipi
                                        </label>
                                        <select
                                            value={isEkleForm.is_tipi}
                                            onChange={(e) => setIsEkleForm({...isEkleForm, is_tipi: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="sulama">Sulama</option>
                                            <option value="bakim">Bakım</option>
                                            <option value="tamir">Tamir</option>
                                            <option value="tasima">Taşıma</option>
                                            <option value="kazma">Kazma</option>
                                            <option value="diger">Diğer</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            İş Başlığı
                                        </label>
                                        <input
                                            type="text"
                                            value={isEkleForm.baslik}
                                            onChange={(e) => setIsEkleForm({...isEkleForm, baslik: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Açıklama
                                        </label>
                                        <textarea
                                            value={isEkleForm.aciklama}
                                            onChange={(e) => setIsEkleForm({...isEkleForm, aciklama: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Başlangıç Zamanı
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={isEkleForm.baslangic_zamani}
                                            onChange={(e) => setIsEkleForm({...isEkleForm, baslangic_zamani: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowIsEkleForm(false)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        İş Ekle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 