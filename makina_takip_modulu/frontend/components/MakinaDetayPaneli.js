'use client';

import { useState, useEffect } from 'react';

export default function MakinaDetayPaneli({ makina, onClose, onEdit, onDelete, onFinishWork, onGoToLocation }) {
    const [isler, setIsler] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log('🔄 useEffect çağrıldı, makina:', makina);
        if (makina && makina.id) {
            console.log('✅ loadMakinaIsleri çağrılıyor...');
            loadMakinaIsleri();
        } else {
            console.log('❌ Makina veya makina.id yok');
        }
    }, [makina?.id]); // makina.id değiştiğinde yeniden çağır

    const loadMakinaIsleri = async () => {
        if (!makina) {
            console.log('❌ Makina objesi yok');
            return;
        }
        
        console.log('🚀 loadMakinaIsleri çağrıldı, makina:', makina);
        setLoading(true);
        try {
            // API'den makina işlerini yükle
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn('❌ Token bulunamadı, işler yüklenemeyecek');
                setIsler([]);
                return;
            }

            console.log('✅ Makina ID:', makina.id);
            console.log('✅ Makina objesi:', makina);
            console.log('✅ Token:', token ? 'Mevcut' : 'Yok');
            
            // API URL'ini düzelt - makina ID'sini doğru şekilde gönder
            const apiUrl = `http://localhost:8001/api/sulama/makina-isler/?makina=${makina.id}`;
            console.log('🌐 API URL:', apiUrl);
            
            console.log('📡 API çağrısı yapılıyor...');
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('📊 API Response Status:', response.status);
            console.log('📊 API Response Headers:', response.headers);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📦 API Response Data:', data);
                console.log('📦 Data type:', typeof data);
                console.log('📦 Is Array:', Array.isArray(data));
                
                // Artık pagination kapalı olduğu için veri direkt array olarak geliyor
                const islerData = Array.isArray(data) ? data : [];
                console.log('📋 İşler data:', islerData);
                console.log('📋 İş sayısı:', islerData.length);
                
                // Her işin detaylarını logla
                islerData.forEach((is, index) => {
                    console.log(`📝 İş ${index + 1}:`, {
                        id: is.id,
                        baslik: is.baslik,
                        durum: is.durum,
                        makina: is.makina,
                        makina_id: is.makina_id
                    });
                });
                
                setIsler(islerData);
                console.log('✅ State güncellendi, iş sayısı:', islerData.length);
            } else {
                console.error('❌ İşler yüklenemedi:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                
                // Hata durumunda boş array set et
                setIsler([]);
                
                // Kullanıcıya hata mesajı göster
                if (typeof window !== 'undefined' && window.alert) {
                    alert(`İş geçmişi yüklenirken hata oluştu: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('❌ İşler yüklenirken hata:', error);
            console.error('❌ Error stack:', error.stack);
            setIsler([]);
            
            // Kullanıcıya hata mesajı göster
            if (typeof window !== 'undefined' && window.alert) {
                alert(`İş geçmişi yüklenirken hata oluştu: ${error.message}`);
            }
        } finally {
            setLoading(false);
            console.log('🏁 loadMakinaIsleri tamamlandı');
        }
    };

    const getMakinaTypeDisplay = (tip) => {
        const types = {
            'traktor': 'TRAKTÖR',
            'ekskavator': 'EKSKAVATÖR',
            'buldozer': 'BULDOZER',
            'yukleyici': 'YÜKLEYİCİ',
            'diger': 'DİĞER'
        };
        return types[tip] || 'MAKİNA';
    };

    const getDurumBadge = (durum) => {
        const badges = {
            'aktif': 'bg-green-100 text-green-800',
            'pasif': 'bg-red-100 text-red-800',
            'bakim': 'bg-yellow-100 text-yellow-800',
            'ariza': 'bg-red-100 text-red-800'
        };
        return badges[durum] || 'bg-gray-100 text-gray-800';
    };

    const getIsDurumBadge = (durum) => {
        const badges = {
            'planlandi': 'bg-yellow-100 text-yellow-800',
            'devam_ediyor': 'bg-blue-100 text-blue-800',
            'tamamlandi': 'bg-green-100 text-green-800',
            'iptal': 'bg-red-100 text-red-800'
        };
        return badges[durum] || 'bg-gray-100 text-gray-800';
    };

    const getIsDurumText = (durum) => {
        const texts = {
            'planlandi': 'Planlandı',
            'devam_ediyor': 'Devam Ediyor',
            'tamamlandi': 'Tamamlandı',
            'iptal': 'İptal'
        };
        return texts[durum] || durum;
    };

    const handleFinishWork = async (makina) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn('Token bulunamadı, çalışmayı bitir işlemi yapılamayacak');
                return;
            }

            // Aktif işi bul
            const aktifIs = isler.find(is => is.durum === 'devam_ediyor');
            if (!aktifIs) {
                console.warn('Bu makina için aktif iş bulunamadı');
                return;
            }

            // İşi tamamla
            const response = await fetch(`http://localhost:8001/api/sulama/makina-isler/${aktifIs.id}/is_tamamla/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                console.log('İş başarıyla tamamlandı!');
                // Popup'ı kapat ve ana sayfayı yenile
                onClose();
                // Ana sayfayı yenilemek için window.location.reload() kullanabiliriz
                // veya parent component'e callback gönderebiliriz
                window.location.reload();
            } else {
                const errorData = await response.json();
                console.error('İş tamamlanırken hata oluştu:', errorData);
            }
        } catch (error) {
            console.error('İş tamamlanırken hata:', error);
        }
    };

    if (!makina) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-teal-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                        </svg>
                        <h2 className="text-xl font-semibold">Makina Detayları</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex h-[calc(90vh-80px)]">
                    {/* Sol Panel - Makina Bilgileri */}
                    <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                        <div className="space-y-6">
                            {/* Makina Temel Bilgileri */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Makina Bilgileri</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Birlik No:</span>
                                        <span className="font-medium">{makina.birlik_no || 'Belirtilmemiş'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Plaka:</span>
                                        <span className="font-medium">{makina.plaka || 'Belirtilmemiş'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tür:</span>
                                        <span className="font-medium">{getMakinaTypeDisplay(makina.makina_tipi)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">İsim:</span>
                                        <span className="font-medium">{makina.isim}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Model:</span>
                                        <span className="font-medium">{makina.model || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Durum:</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurumBadge(makina.durum)}`}>
                                            {makina.durum}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Konum:</span>
                                        <span className="font-medium">
                                            {makina.enlem && makina.boylam 
                                                ? `${makina.enlem.toFixed(6)}, ${makina.boylam.toFixed(6)}`
                                                : 'Konum bilgisi yok'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* İşlem Butonları */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">İşlemler</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => onGoToLocation(makina)}
                                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Konuma Git
                                    </button>
                                    
                                    <button
                                        onClick={() => onEdit(makina)}
                                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Düzenle
                                    </button>
                                    
                                    <button
                                        onClick={() => handleFinishWork(makina)}
                                        className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Çalışmayı Bitir
                                    </button>
                                    
                                    <button
                                        onClick={() => onDelete(makina)}
                                        className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sağ Panel - İş Geçmişi */}
                    <div className="w-1/2 p-6 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">İş Geçmişi</h3>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Sayfada</span>
                                    <select className="text-sm border border-gray-300 rounded px-2 py-1">
                                        <option>10</option>
                                        <option>25</option>
                                        <option>50</option>
                                    </select>
                                    <span className="text-sm text-gray-600">kayıt göster</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-600 mt-2">İşler yükleniyor...</p>
                                </div>
                            ) : isler.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-2">📋</div>
                                    <p className="text-gray-500">Bu makina için henüz iş kaydı bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    İş Başlığı
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Çalıştığı Yer
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Başlangıç
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Bitiş
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Durum
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {isler.map((is) => (
                                                <tr key={is.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {is.baslik}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {is.calistigi_yer || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {is.baslangic_zamani 
                                                            ? new Date(is.baslangic_zamani).toLocaleDateString('tr-TR')
                                                            : '-'
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {is.bitis_zamani 
                                                            ? new Date(is.bitis_zamani).toLocaleDateString('tr-TR')
                                                            : '-'
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIsDurumBadge(is.durum)}`}>
                                                            {getIsDurumText(is.durum)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Sayfalama */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <span className="text-sm text-gray-600">
                                    Toplam {isler.length} işten {isler.length} gösteriliyor.
                                </span>
                                <div className="flex space-x-1">
                                    <button className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center text-sm">
                                        1
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 