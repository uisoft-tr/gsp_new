'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import MakinaHarita from '@/components/MakinaHarita';
import MakinaDetayPaneli from '@/components/MakinaDetayPaneli';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function MakinaTakipPage() {
    const { token } = useAuth();
    const router = useRouter();
    const toast = useToast();
    
    const [makinalar, setMakinalar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('map'); // 'list' veya 'map'
    const [selectedMakina, setSelectedMakina] = useState(null);
    const [showDetayPaneli, setShowDetayPaneli] = useState(false);
    const [showCalisanMakinalar, setShowCalisanMakinalar] = useState(false);

    useEffect(() => {
        if (token) {
            loadMakinalar();
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
                setMakinalar(data.makinalar || []);
            } else {
                toast.error('Makinalar yüklenemedi');
            }
        } catch (error) {
            toast.error('Makinalar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const getMakinaTypeIcon = (tip) => {
        const icons = {
            'traktor': '🚜',
            'ekskavator': '🏗️',
            'buldozer': '🚧',
            'yukleyici': '📦',
            'diger': '⚙️'
        };
        return icons[tip] || '🚜';
    };

    const getMakinaMarkerColor = (makinaTipi) => {
        const colors = {
            'traktor': '#3B82F6',
            'ekskavator': '#10B981',
            'buldozer': '#F59E0B',
            'yukleyici': '#8B5CF6',
            'diger': '#6B7280'
        };
        return colors[makinaTipi] || '#3B82F6';
    };

    const getMapUrl = () => {
        const center = '40.8311,35.6472'; // Amasya Suluova merkez
        const zoom = '12';
        
        // OpenStreetMap kullanarak ücretsiz harita
        return `https://www.openstreetmap.org/export/embed.html?bbox=35.5,40.7,35.8,41.0&layer=mapnik&marker=40.8311,35.6472`;
    };

    // Koordinatları harita üzerinde pozisyona çevir
    const getMarkerPosition = (enlem, boylam) => {
        // OpenStreetMap bbox koordinatları (Amasya Suluova çevresi)
        const minLat = 40.7;
        const maxLat = 41.0;
        const minLng = 35.5;
        const maxLng = 35.8;
        
        // Koordinatları yüzdeye çevir
        const latPercent = ((enlem - minLat) / (maxLat - minLat)) * 100;
        const lngPercent = ((boylam - minLng) / (maxLng - minLng)) * 100;
        
        // Sınırları kontrol et ve pozisyonu döndür
        return {
            left: `${Math.max(2, Math.min(98, lngPercent))}%`,
            top: `${Math.max(2, Math.min(98, 100 - latPercent))}%` // Y ekseni ters
        };
    };

    // Makina işlem fonksiyonları
    const handleMakinaClick = (makina) => {
        console.log('🎯 handleMakinaClick çağrıldı:', makina);
        setSelectedMakina(makina);
        setShowDetayPaneli(true);
        console.log('✅ selectedMakina ve showDetayPaneli set edildi');
    };

    const handleEdit = (makina) => {
        router.push(`/makina-takip/${makina.id}/duzenle`);
        setShowDetayPaneli(false);
    };

    const handleDelete = async (makina) => {
        if (confirm(`${makina.isim} makinasını silmek istediğinizden emin misiniz?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/sulama/makinalar/${makina.id}/`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    }
                });
                
                if (response.ok) {
                    toast.success('Makina başarıyla silindi');
                    loadMakinalar();
                    setShowDetayPaneli(false);
                } else {
                    toast.error('Makina silinirken hata oluştu');
                }
            } catch (error) {
                console.error('Makina silinirken hata:', error);
                toast.error('Makina silinirken hata oluştu');
            }
        }
    };

    const handleFinishWork = async (makina) => {
        try {
            // Aktif işi bitir
            const response = await fetch(`${API_BASE_URL}/api/sulama/makina-isler/${makina.id}/is_tamamla/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                toast.success('İş başarıyla tamamlandı');
                setShowDetayPaneli(false);
            } else {
                toast.error('İş tamamlanırken hata oluştu');
            }
        } catch (error) {
            console.error('İş tamamlanırken hata:', error);
            toast.error('İş tamamlanırken hata oluştu');
        }
    };

    const handleGoToLocation = (makina) => {
        if (makina.enlem && makina.boylam) {
            // Haritada makina konumuna odaklan
            setSelectedMakina(makina);
            setViewMode('map');
            setShowDetayPaneli(false);
            toast.success(`${makina.isim} konumuna odaklanıldı`);
        } else {
            toast.error('Bu makina için konum bilgisi bulunmuyor');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <h3 className="mt-6 text-xl font-semibold text-blue-900">Makina Takip Yükleniyor...</h3>
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
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Makina Takip Sistemi</h1>
                                <p className="text-gray-600 mt-1">Harita üzerinde makinelerin konumlarını takip edin</p>
                            </div>
                        </div>
                                                <div className="flex space-x-3">
                        <button
                            onClick={() => router.push('/makina-takip/ekle')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Makina Ekle
                        </button>
                        </div>
                    </div>
                </div>

                {/* Görünüm Seçimi */}
                <div className="mb-6 flex justify-center">
                    <div className="bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                        <div className="flex">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                📋 Liste Görünümü
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'map'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                🗺️ Harita Görünümü
                            </button>
                        </div>
                    </div>
                </div>

                {/* Makina Sayısı */}
                <div className="mb-4 p-3 bg-blue-100 rounded-lg">
                    <p className="text-center font-bold text-blue-800">
                        📊 Toplam Makina Sayısı: {makinalar.length}
                    </p>
                </div>

                {/* Liste Görünümü */}
                {viewMode === 'list' && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Makina Listesi</h2>
                        
                        {makinalar.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🚜</div>
                                <p className="text-gray-500 text-lg">Henüz makina bulunmuyor.</p>
                                <p className="text-gray-400 text-sm mt-2">Yeni makina eklemek için "Makina Ekle" butonunu kullanın.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Makina
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tip
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Plaka
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Konum
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Son İş
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tarih
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                İşlemler
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {makinalar.map((makina) => (
                                            <tr 
                                                key={makina.id}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => setSelectedMakina(makina)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div 
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg mr-3 shadow-sm"
                                                            style={{ backgroundColor: getMakinaMarkerColor(makina.makina_tipi) }}
                                                        >
                                                            {getMakinaTypeIcon(makina.makina_tipi)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{makina.isim}</div>
                                                            {makina.model && (
                                                                <div className="text-sm text-gray-500">{makina.model}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900 capitalize">{makina.makina_tipi}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {makina.plaka ? (
                                                        <span className="text-sm text-gray-900 font-mono">{makina.plaka}</span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {makina.enlem && makina.boylam ? (
                                                        <div className="text-sm text-gray-900">
                                                            <div className="font-mono text-xs">
                                                                {makina.enlem.toFixed(4)}
                                                            </div>
                                                            <div className="font-mono text-xs">
                                                                {makina.boylam.toFixed(4)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">Konum yok</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600">
                                                        {makina.aktif_is ? makina.aktif_is.baslik : 'İş yok'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-500">
                                                        {makina.kayit_zamani ? new Date(makina.kayit_zamani).toLocaleDateString('tr-TR') : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedMakina(makina);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                                        >
                                                            Detay
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/makina-takip/${makina.id}/duzenle`);
                                                            }}
                                                            className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
                                                        >
                                                            Düzenle
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Harita Görünümü */}
                {viewMode === 'map' && (
                    <div className="relative h-[80vh]">
                        {/* Harita Bileşeni */}
                        <MakinaHarita 
                            makinalar={makinalar}
                            onMakinaClick={handleMakinaClick}
                            selectedMakina={selectedMakina}
                        />
                        
                        {/* Lejant */}
                        <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
                            <h4 className="font-semibold text-gray-900 mb-3">Makina Tipleri</h4>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                                    <span className="text-sm text-gray-700">Traktör</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                                    <span className="text-sm text-gray-700">Ekskavatör</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                                    <span className="text-sm text-gray-700">Buldozer</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
                                    <span className="text-sm text-gray-700">Yükleyici</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
                                    <span className="text-sm text-gray-700">Diğer</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Alt Panel - Çalışan Makinalar */}
                        <div className="fixed bottom-0 left-0 right-0 bg-teal-600 text-white p-4 transform transition-transform duration-300 z-40">
                            <div className="flex items-center justify-between max-w-7xl mx-auto">
                                <button
                                    onClick={() => setShowCalisanMakinalar(!showCalisanMakinalar)}
                                    className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
                                >
                                    <svg className={`w-5 h-5 transform transition-transform ${showCalisanMakinalar ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="font-semibold">Çalışan Makinalar</span>
                                </button>
                                
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm">
                                        Toplam {makinalar.filter(m => m.durum === 'aktif').length} aktif makina
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Çalışan Makinalar Listesi */}
                        {showCalisanMakinalar && (
                            <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 max-h-96 overflow-y-auto z-30">
                                <div className="max-w-7xl mx-auto p-4">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Birlik No
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Tür
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Çalıştığı Yer
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Aktif İş
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        İşlemler
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {makinalar.filter(m => m.durum === 'aktif').map((makina) => (
                                                    <tr key={makina.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {makina.birlik_no || makina.plaka || makina.id}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {makina.makina_tipi.toUpperCase()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {makina.aktif_is?.calistigi_yer || makina.sulama?.isim || 'Belirtilmemiş'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {makina.aktif_is ? (
                                                                <span className="flex items-center">
                                                                    <span className="mr-2">{makina.aktif_is.baslik}</span>
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                        makina.aktif_is.durum === 'devam_ediyor' 
                                                                            ? 'bg-blue-100 text-blue-800' 
                                                                            : makina.aktif_is.durum === 'tamamlandi'
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {makina.aktif_is.durum === 'devam_ediyor' ? 'Devam Ediyor' : 
                                                                         makina.aktif_is.durum === 'tamamlandi' ? 'Tamamlandı' : 
                                                                         makina.aktif_is.durum}
                                                                    </span>
                                                                </span>
                                                            ) : 'İş yok'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleMakinaClick(makina)}
                                                                    className="text-blue-600 hover:text-blue-900"
                                                                    title="Detayları Görüntüle"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEdit(makina)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                    title="Düzenle"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleFinishWork(makina)}
                                                                    className="text-yellow-600 hover:text-yellow-900"
                                                                    title="Çalışmayı Bitir"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(makina)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                    title="Sil"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Seçili Makina Detayları */}
                {selectedMakina && (
                    <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Seçili Makina Detayları</h3>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => router.push(`/makina-takip/${selectedMakina.id}/duzenle`)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Düzenle
                                </button>
                                <button
                                    onClick={() => setSelectedMakina(null)}
                                    className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Temel Bilgiler</h4>
                                <div className="space-y-2">
                                    <p><span className="font-medium text-gray-700">Makina Adı:</span> {selectedMakina.isim}</p>
                                    <p><span className="font-medium text-gray-700">Tip:</span> {selectedMakina.makina_tipi}</p>
                                    <p><span className="font-medium text-gray-700">Durum:</span> 
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                            selectedMakina.durum === 'aktif' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {selectedMakina.durum}
                                        </span>
                                    </p>
                                    {selectedMakina.plaka && <p><span className="font-medium text-gray-700">Plaka:</span> {selectedMakina.plaka}</p>}
                                    {selectedMakina.model && <p><span className="font-medium text-gray-700">Model:</span> {selectedMakina.model}</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Konum ve Durum</h4>
                                <div className="space-y-2">
                                    <p><span className="font-medium text-gray-700">Konum:</span> {selectedMakina.enlem}, {selectedMakina.boylam}</p>
                                    <p><span className="font-medium text-gray-700">Durum:</span> {selectedMakina.durum}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Makina Detay Paneli */}
            {showDetayPaneli && selectedMakina && (
                <MakinaDetayPaneli
                    makina={selectedMakina}
                    onClose={() => setShowDetayPaneli(false)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onFinishWork={handleFinishWork}
                    onGoToLocation={handleGoToLocation}
                />
            )}
        </div>
    );
} 