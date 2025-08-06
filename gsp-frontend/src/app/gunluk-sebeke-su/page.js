'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { sulamaAPI } from '@/utils/api';

export default function GunlukSebekeSuPage() {
    const { user, token } = useAuth();
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast, info: showInfoToast } = useToast();
    
    const [veriler, setVeriler] = useState([]);
    const [depolamaTesisleri, setDepolamaTesisleri] = useState([]);
    const [kanallar, setKanallar] = useState([]);
    const [tumKanallar, setTumKanallar] = useState([]); // Filtreleme için tüm kanallar
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    // Bugünün tarihi
    const today = new Date().toISOString().split('T')[0];
    
    // Mevcut ayın başlangıcı - daha güvenli yöntem
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11 arası
    const currentMonthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    console.log('Bugün:', today);
    console.log('Mevcut ay başlangıcı:', currentMonthStart);
    console.log('Yıl:', year, 'Ay (0-11):', month, 'Ay (1-12):', month + 1);
    
    // Filtreleme state'leri
    const [filters, setFilters] = useState({
        baslangic_tarih: currentMonthStart,
        bitis_tarih: today,
        kanal: '',
        depolama_tesisi: ''
    });
    
    // İstatistikler
    const [istatistikler, setIstatistikler] = useState({
        toplam_kayit: 0,
        toplam_su_miktari: 0,
        ortalama_su_miktari: 0,
        aktif_kanal_sayisi: 0
    });
    
    // Manuel giriş durumu
    const [manuelGiris, setManuelGiris] = useState(false);
    const [abakDurumu, setAbakDurumu] = useState(''); // 'loading', 'success', 'error', ''
    
    const [formData, setFormData] = useState({
        depolama_tesisi: '',
        kanal: '',
        tarih: today,
        baslangic_saati: '',
        bitis_saati: '',
        yukseklik: '',
        debi: '', // Manuel giriş için debi (m³/sn)
        su_miktari: ''
    });

    // İstatistikleri hesapla
    const hesaplaIstatistikler = (data) => {
        if (!Array.isArray(data) || data.length === 0) {
            setIstatistikler({
                toplam_kayit: 0,
                toplam_su_miktari: 0,
                ortalama_su_miktari: 0,
                aktif_kanal_sayisi: 0
            });
            return;
        }

        const toplamSu = data.reduce((sum, item) => sum + (parseFloat(item.su_miktari) || 0), 0);
        const uniqueKanallar = new Set(data.map(item => item.kanal));

        setIstatistikler({
            toplam_kayit: data.length,
            toplam_su_miktari: toplamSu,
            ortalama_su_miktari: data.length > 0 ? toplamSu / data.length : 0,
            aktif_kanal_sayisi: uniqueKanallar.size
        });
    };

    // Sayıları formatla (tam sayı)
    const formatSayi = (sayi) => {
        if (!sayi || sayi === 0) return '0';
        return Math.round(sayi).toLocaleString();
    };

    // Verileri yükle
    const loadData = async () => {
        try {
            const params = {};
            
            // Tarih aralığı filtresi
            if (filters.baslangic_tarih) {
                params.baslangic_tarih = filters.baslangic_tarih;
            }
            if (filters.bitis_tarih) {
                params.bitis_tarih = filters.bitis_tarih;
            }
            
            // Kanal filtresi
            if (filters.kanal) {
                params.kanal = filters.kanal;
            }
            
            // Depolama tesisi filtresi
            if (filters.depolama_tesisi) {
                params.kanal__depolama_tesisi = filters.depolama_tesisi;
            }
            
            const data = await sulamaAPI.getGunlukSebekeSu(params);
            
            let filteredData = [];
            if (Array.isArray(data)) {
                filteredData = data;
            } else if (data && Array.isArray(data.results)) {
                filteredData = data.results;
            }
            
            setVeriler(filteredData);
            hesaplaIstatistikler(filteredData);
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            showErrorToast('Veriler yüklenirken hata oluştu');
            setVeriler([]);
            hesaplaIstatistikler([]);
        } finally {
            setLoading(false);
        }
    };

    // Filtreleri uygula
    const applyFilters = () => {
        setLoading(true);
        loadData();
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setFilters({
            baslangic_tarih: currentMonthStart,
            bitis_tarih: today,
            kanal: '',
            depolama_tesisi: ''
        });
        setLoading(true);
        setTimeout(() => loadData(), 100);
    };

    // Depolama tesislerini yükle
    const loadDepolamaTesisleri = async () => {
        try {
            const data = await sulamaAPI.getDepolamaTesisleri();
            
            if (Array.isArray(data)) {
                setDepolamaTesisleri(data);
            } else if (data && Array.isArray(data.results)) {
                setDepolamaTesisleri(data.results);
            } else {
                setDepolamaTesisleri([]);
            }
        } catch (error) {
            console.error('Depolama tesisi yükleme hatası:', error);
            showErrorToast('Depolama tesisleri yüklenirken hata oluştu');
            setDepolamaTesisleri([]);
        }
    };

    // Kanalları yükle (depo seçimine göre)
    const loadKanallar = async (depolamaId = null) => {
        try {
            const data = await sulamaAPI.getKanallar(depolamaId);
            
            if (Array.isArray(data)) {
                setKanallar(data);
            } else if (data && Array.isArray(data.results)) {
                setKanallar(data.results);
            } else {
                setKanallar([]);
            }
        } catch (error) {
            console.error('Kanal yükleme hatası:', error);
            showErrorToast('Kanallar yüklenirken hata oluştu');
            setKanallar([]);
        }
    };

    // Tüm kanalları yükle (filtreleme için)
    const loadTumKanallar = async () => {
        try {
            const data = await sulamaAPI.getKanallar();
            
            if (Array.isArray(data)) {
                setTumKanallar(data);
            } else if (data && Array.isArray(data.results)) {
                setTumKanallar(data.results);
            } else {
                setTumKanallar([]);
            }
        } catch (error) {
            console.error('Kanallar yüklenirken hata oluştu:', error);
        }
    };

    // Depo değiştiğinde kanalları yükle
    const handleDepoChange = (depoId) => {
        setFormData(prev => ({ 
            ...prev, 
            depolama_tesisi: depoId,
            kanal: '',
            yukseklik: '',
            debi: '',
            su_miktari: ''
        }));
        
        // Manuel giriş durumunu sıfırla
        setManuelGiris(false);
        setAbakDurumu('');
        
        if (depoId) {
            loadKanallar(depoId);
        } else {
            setKanallar([]);
        }
    };

    // Yükseklik değiştiğinde su miktarını hesapla (debounced)
    const [yukseklikTimeout, setYukseklikTimeout] = useState(null);
    
    const handleYukseklikChange = (yukseklik) => {
        setFormData(prev => ({ ...prev, yukseklik: yukseklik }));
        
        // Önceki timeout'u temizle
        if (yukseklikTimeout) {
            clearTimeout(yukseklikTimeout);
        }
        
        if (!yukseklik || !formData.kanal) {
            setFormData(prev => ({ ...prev, su_miktari: '' }));
            setAbakDurumu('');
            setManuelGiris(false);
            return;
        }

        // Abak yükleniyor durumu
        setAbakDurumu('loading');
        setManuelGiris(false);

        // 500ms timeout ile API çağrısı
        const newTimeout = setTimeout(async () => {
            try {
                console.log('Su hacmi hesaplama API çağrısı:', {
                    kanal: formData.kanal,
                    yukseklik: parseFloat(yukseklik)
                });
                
                // İlk önce doğrudan kanal endpoint'ini deneyelim
                const data = await sulamaAPI.hesaplaKanalSuHacmi(formData.kanal, parseFloat(yukseklik));
                
                console.log('API yanıtı:', data);
                
                if (data.success) {
                    setFormData(prev => ({
                        ...prev,
                        su_miktari: data.su_hacmi
                    }));
                    setAbakDurumu('success');
                    setManuelGiris(false);
                    showSuccessToast(`Su hacmi abaktan hesaplandı: ${data.su_hacmi} m³/sn`);
                } else {
                    // Abak verisi yok, manuel girişe geç
                    setFormData(prev => ({
                        ...prev,
                        su_miktari: ''
                    }));
                    setAbakDurumu('error');
                    setManuelGiris(true);
                    showInfoToast('Bu kanal için abak verisi bulunamadı. Debi kendiniz gireceksiniz.');
                }
            } catch (error) {
                console.error('Su hacmi hesaplama hatası:', error);
                
                // Fallback: Eski API'yi dene
                try {
                    console.log('Fallback API deneniyor...');
                    const fallbackData = await sulamaAPI.hesaplaSuMiktari({
                        kanal: formData.kanal,
                        yukseklik: parseFloat(yukseklik)
                    });
                    
                    console.log('Fallback API yanıtı:', fallbackData);
                    
                    if (fallbackData.success) {
                        setFormData(prev => ({
                            ...prev,
                            su_miktari: fallbackData.su_miktari
                        }));
                        setAbakDurumu('success');
                        setManuelGiris(false);
                        showSuccessToast(`Su miktarı abaktan hesaplandı: ${fallbackData.su_miktari} m³/sn`);
                    } else {
                        // Fallback de başarısız, manuel girişe geç
                        setFormData(prev => ({
                            ...prev,
                            su_miktari: ''
                        }));
                        setAbakDurumu('error');
                        setManuelGiris(true);
                        showInfoToast('Bu kanal için abak verisi bulunamadı. Debi kendiniz gireceksiniz.');
                    }
                } catch (fallbackError) {
                    console.error('Fallback API hatası:', fallbackError);
                    // Her iki API de başarısız, manuel girişe geç
                    setFormData(prev => ({
                        ...prev,
                        su_miktari: ''
                    }));
                    setAbakDurumu('error');
                    setManuelGiris(true);
                    showWarningToast('Abak verisi alınamadı. Debi kendiniz gireceksiniz.');
                }
            }
        }, 500);
        
        setYukseklikTimeout(newTimeout);
    };

    // Debi değiştiğinde su miktarını ayarla (manuel giriş için)
    const handleDebiChange = (debi) => {
        setFormData(prev => ({ ...prev, debi: debi, su_miktari: debi }));
        
        if (debi) {
            showInfoToast(`Debi ayarlandı: ${debi} m³/sn`);
        }
    };

    // Süre hesaplama fonksiyonu
    const hesaplaSureVeSuMiktari = () => {
        if (!formData.baslangic_saati || !formData.bitis_saati || !formData.su_miktari) {
            return {
                sure_saniye: 0,
                toplam_su_miktari: parseFloat(formData.su_miktari) || 0
            };
        }

        // Başlangıç ve bitiş zamanlarını Date objelerine çevir
        const baslangic = new Date(formData.baslangic_saati);
        const bitis = new Date(formData.bitis_saati);
        
        // Süreyi saniye cinsinden hesapla
        const sure_ms = bitis.getTime() - baslangic.getTime();
        const sure_saniye = Math.floor(sure_ms / 1000);
        
        // Su miktarını saniye ile çarp
        const birim_su_miktari = parseFloat(formData.su_miktari) || 0;
        const toplam_su_miktari = birim_su_miktari * sure_saniye;
        
        console.log('Süre hesaplama:', {
            baslangic: baslangic.toLocaleString('tr-TR'),
            bitis: bitis.toLocaleString('tr-TR'),
            sure_saniye,
            birim_su_miktari,
            toplam_su_miktari
        });
        
        return {
            sure_saniye,
            toplam_su_miktari
        };
    };

    // Form gönder
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            // Süre ve toplam su miktarını hesapla
            const { sure_saniye, toplam_su_miktari } = hesaplaSureVeSuMiktari();
            
            if (sure_saniye <= 0) {
                showErrorToast('Bitiş saati başlangıç saatinden sonra olmalıdır');
                setFormLoading(false);
                return;
            }

            const submitData = {
                ...formData,
                yukseklik: manuelGiris ? null : parseFloat(formData.yukseklik), // Manuel modda yükseklik gönderme
                su_miktari: toplam_su_miktari, // Süre × m³/sn = Toplam harcanan su (m³)
                sure_saniye: sure_saniye, // Ek bilgi olarak
                manuel_giris: manuelGiris // Manuel giriş modunu backend'e bildir
            };

            console.log('Gönderilen veri:', submitData);

            if (editingItem) {
                await sulamaAPI.updateGunlukSebekeSu(editingItem.id, submitData);
                showSuccessToast(`Kayıt güncellendi - Toplam Su: ${toplam_su_miktari.toFixed(2)} m³ (${sure_saniye} saniye)`);
            } else {
                await sulamaAPI.createGunlukSebekeSu(submitData);
                showSuccessToast(`Kayıt eklendi - Toplam Su: ${toplam_su_miktari.toFixed(2)} m³ (${sure_saniye} saniye)`);
            }
            
            resetForm();
            loadData();
        } catch (error) {
            console.error('Form gönderme hatası:', error);
            if (error.message.includes('400')) {
                showErrorToast('Geçersiz veri girişi');
            } else {
                showErrorToast('Kayıt işlemi başarısız');
            }
        } finally {
            setFormLoading(false);
        }
    };

    // Formu sıfırla
    const resetForm = () => {
        setFormData({
            depolama_tesisi: '',
            kanal: '',
            tarih: today, // Bugünün tarihi
            baslangic_saati: '',
            bitis_saati: '',
            yukseklik: '',
            debi: '',
            su_miktari: ''
        });
        setKanallar([]);
        setEditingItem(null);
        setShowForm(false);
        // Manuel giriş durumunu sıfırla
        setManuelGiris(false);
        setAbakDurumu('');
    };

    // Düzenle
    const handleEdit = (item) => {
        // Önce kanalları yükle
        const kanal = kanallar.find(k => k.id === item.kanal);
        if (kanal) {
            loadKanallar(kanal.depolama_tesisi);
        }
        
        // Backend'den gelen toplam su miktarını süreye bölerek akış hızına çevir
        let akisHizi = item.su_miktari;
        if (item.baslangic_saati && item.bitis_saati && item.su_miktari) {
            const baslangic = new Date(item.baslangic_saati);
            const bitis = new Date(item.bitis_saati);
            const sure_saniye = Math.floor((bitis.getTime() - baslangic.getTime()) / 1000);
            
            if (sure_saniye > 0) {
                akisHizi = item.su_miktari / sure_saniye; // Toplam ÷ Süre = Akış hızı (m³/sn)
            }
        }
        
        setFormData({
            depolama_tesisi: kanal ? kanal.depolama_tesisi : '',
            kanal: item.kanal,
            tarih: item.tarih,
            baslangic_saati: item.baslangic_saati,
            bitis_saati: item.bitis_saati,
            yukseklik: item.yukseklik,
            debi: akisHizi, // Akış hızı (m³/sn) - debi olarak da kullanılabilir
            su_miktari: akisHizi // Akış hızı (m³/sn)
        });
        setEditingItem(item);
        setShowForm(true);
    };

    // Sil
    const handleDelete = async (id) => {
        if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

        try {
            await sulamaAPI.deleteGunlukSebekeSu(id);
            showSuccessToast('Kayıt silindi');
            loadData();
        } catch (error) {
            console.error('Silme hatası:', error);
            showErrorToast('Silme işlemi başarısız');
        }
    };

    useEffect(() => {
        if (token) {
            loadData();
            loadDepolamaTesisleri();
            loadTumKanallar();
        }
    }, [token]);

    if (loading && veriler.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Veriler yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Başlık */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900">Günlük Şebeke Su Miktarı</h1>
                   
                </div>

                {/* İstatistik Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Toplam Kayıt</p>
                                <p className="text-2xl font-bold text-gray-900">{formatSayi(istatistikler.toplam_kayit)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Toplam Su Miktarı</p>
                                <p className="text-2xl font-bold text-gray-900">{formatSayi(istatistikler.toplam_su_miktari)} m³</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Ortalama Su Miktarı</p>
                                <p className="text-2xl font-bold text-gray-900">{formatSayi(istatistikler.ortalama_su_miktari)} m³</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Aktif Kanal Sayısı</p>
                                <p className="text-2xl font-bold text-gray-900">{formatSayi(istatistikler.aktif_kanal_sayisi)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Filtreler */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex items-center mb-6">
                        <div className="p-2 bg-gray-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Başlangıç Tarihi
                            </label>
                            <input
                                type="date"
                                value={filters.baslangic_tarih}
                                onChange={(e) => setFilters(prev => ({ ...prev, baslangic_tarih: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                            />
                        </div>
                        
                        <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Bitiş Tarihi
                            </label>
                            <input
                                type="date"
                                value={filters.bitis_tarih}
                                onChange={(e) => setFilters(prev => ({ ...prev, bitis_tarih: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                            />
                        </div>
                        
                        <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Depolama Tesisi
                            </label>
                            <select
                                value={filters.depolama_tesisi}
                                onChange={(e) => setFilters(prev => ({ ...prev, depolama_tesisi: e.target.value, kanal: '' }))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                            >
                                <option value="">Tümü</option>
                                {depolamaTesisleri.map(depo => (
                                    <option key={depo.id} value={depo.id}>
                                        {depo.sulama_isim} - {depo.isim}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                Kanal
                            </label>
                            <select
                                value={filters.kanal}
                                onChange={(e) => setFilters(prev => ({ ...prev, kanal: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                            >
                                <option value="">Tümü</option>
                                {(filters.depolama_tesisi ? 
                                    tumKanallar.filter(k => k.depolama_tesisi == filters.depolama_tesisi) : 
                                    tumKanallar
                                ).map(kanal => (
                                    <option key={kanal.id} value={kanal.id}>
                                        {kanal.isim}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={applyFilters}
                                    disabled={loading}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center font-medium"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    ) : (
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                    Filtrele
                                </button>
                                <button
                                    onClick={clearFilters}
                                    disabled={loading}
                                    className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center font-medium"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Temizle
                                </button>
                            </div>
                            
                            <button
                                onClick={() => setShowForm(true)}
                                className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-medium"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Yeni Kayıt Ekle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {editingItem ? 'Kayıt Düzenle' : 'Yeni Kayıt'}
                                </h2>
                                <button
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Veri Giriş Modu Seçimi */}
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                            </svg>
                                            <h3 className="text-lg font-semibold text-gray-900">Veri Giriş Modu</h3>
                                        </div>
                                        
                                        {/* Toggle Switch */}
                                        <div className="flex items-center space-x-3">
                                            <span className={`text-sm font-medium ${!manuelGiris ? 'text-blue-600' : 'text-gray-500'}`}>
                                                Otomatik (Abak)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setManuelGiris(!manuelGiris);
                                                    setFormData(prev => ({ ...prev, yukseklik: '', debi: '', su_miktari: '' }));
                                                    setAbakDurumu('');
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                    manuelGiris ? 'bg-red-600' : 'bg-blue-600'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        manuelGiris ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                            <span className={`text-sm font-medium ${manuelGiris ? 'text-red-600' : 'text-gray-500'}`}>
                                                Manuel
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Mod Açıklaması */}
                                    <div className={`p-3 rounded-lg border-l-4 ${
                                        manuelGiris 
                                            ? 'bg-red-50 border-red-400' 
                                            : 'bg-blue-50 border-blue-400'
                                    }`}>
                                        <div className="flex items-center">
                                            {manuelGiris ? (
                                                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                            <p className={`text-sm ${manuelGiris ? 'text-red-800' : 'text-blue-800'}`}>
                                                {manuelGiris 
                                                    ? 'Manuel Mod:  Debi kendiniz gireceksiniz. Abak verisi olmayan kanallar için kullanın.'
                                                    : 'Otomatik Mod: Debi, girdiğiniz yükseklik değerine göre abak tablolarından otomatik hesaplanacak.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Depolama Tesisi */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                            <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            Depolama Tesisi *
                                        </label>
                                        <select
                                            value={formData.depolama_tesisi}
                                            onChange={(e) => handleDepoChange(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                                        >
                                            <option value="">Depolama tesisi seçin</option>
                                            {depolamaTesisleri.map(depo => (
                                                <option key={depo.id} value={depo.id}>
                                                    {depo.sulama_isim} - {depo.isim}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Kanal */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                            <svg className="w-4 h-4 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                            Kanal *
                                        </label>
                                        <select
                                            value={formData.kanal}
                                            onChange={(e) => setFormData(prev => ({ ...prev, kanal: e.target.value }))}
                                            required
                                            disabled={!formData.depolama_tesisi}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <option value="">
                                                {formData.depolama_tesisi ? 'Kanal seçin' : 'Önce depolama tesisi seçin'}
                                            </option>
                                            {kanallar.map(kanal => (
                                                <option key={kanal.id} value={kanal.id}>
                                                    {kanal.isim}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Yükseklik - Sadece otomatik modda */}
                                    {!manuelGiris && (
                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                                </svg>
                                                Yükseklik (m) * - Abaktan Hesaplama
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.yukseklik}
                                                    onChange={(e) => handleYukseklikChange(e.target.value)}
                                                    required={!manuelGiris}
                                                    disabled={!formData.kanal}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                                    placeholder={formData.kanal ? "Örn: 1.25" : "Önce kanal seçin"}
                                                />
                                                {abakDurumu === 'loading' && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Debi - Sadece manuel modda */}
                                    {manuelGiris && (
                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                </svg>
                                                Debi (m³/sn) * - Manuel Giriş
                                            </label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={formData.debi}
                                                onChange={(e) => handleDebiChange(e.target.value)}
                                                required={manuelGiris}
                                                disabled={!formData.kanal}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                                placeholder={formData.kanal ? "Örn: 0.025" : "Önce kanal seçin"}
                                            />
                                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Bu kanal için abak verisi bulunamadı. Saniyedeki akış miktarını giriniz.
                                            </p>
                                        </div>
                                    )}

                                    {/* Tarih */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Tarih *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.tarih}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tarih: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                                        />
                                    </div>

                                    {/* Başlangıç Saati */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Başlangıç Saati *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.baslangic_saati ? formData.baslangic_saati.split('T')[1]?.substring(0, 5) || '' : ''}
                                            onChange={(e) => {
                                                const dateTime = `${formData.tarih}T${e.target.value}:00`;
                                                setFormData(prev => ({ ...prev, baslangic_saati: dateTime }));
                                            }}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                                        />
                                    </div>

                                    {/* Bitiş Saati */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                            <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Bitiş Saati *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.bitis_saati ? formData.bitis_saati.split('T')[1]?.substring(0, 5) || '' : ''}
                                            onChange={(e) => {
                                                const dateTime = `${formData.tarih}T${e.target.value}:00`;
                                                setFormData(prev => ({ ...prev, bitis_saati: dateTime }));
                                            }}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Su Akış Hızı - Hesaplanmış */}
                                <div className={`p-4 rounded-lg border ${manuelGiris ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        Debi (m³/sn) - {manuelGiris ? 'Manuel Girildi' : 'Abaktan Hesaplandı'}
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={formData.su_miktari}
                                            disabled
                                            className={`flex-1 px-4 py-3 border rounded-lg cursor-not-allowed ${
                                                manuelGiris 
                                                    ? 'border-red-300 bg-red-100 text-red-800' 
                                                    : 'border-gray-300 bg-gray-100 text-gray-600'
                                            }`}
                                        />
                                        <div className={`ml-3 p-2 rounded-lg ${manuelGiris ? 'bg-red-100' : 'bg-blue-100'}`}>
                                            {manuelGiris ? (
                                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {manuelGiris 
                                            ? 'Manuel olarak girilen debi değeri. Kayıt edilecek toplam su = Debi × Süre(saniye)'
                                            : 'Bu değer yükseklik girildikten sonra kanal abağından hesaplanır. Kayıt edilecek toplam su = Akış hızı × Süre(saniye)'
                                        }
                                    </p>
                                </div>

                                {/* Toplam Su Hesaplama Önizleme */}
                                {formData.baslangic_saati && formData.bitis_saati && formData.su_miktari && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <div className="flex items-center mb-2">
                                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <h4 className="text-sm font-medium text-blue-900">Hesaplama Önizleme</h4>
                                        </div>
                                        
                                        {(() => {
                                            const { sure_saniye, toplam_su_miktari } = hesaplaSureVeSuMiktari();
                                            const sure_saat = Math.floor(sure_saniye / 3600);
                                            const sure_dakika = Math.floor((sure_saniye % 3600) / 60);
                                            
                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                                    <div className="bg-white p-3 rounded border">
                                                        <span className="text-gray-600">İşletme Süresi:</span>
                                                        <div className="font-semibold text-blue-900">
                                                            {sure_saat}s {sure_dakika}dk ({sure_saniye} saniye)
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded border">
                                                        <span className="text-gray-600">Debi:</span>
                                                        <div className="font-semibold text-blue-900">
                                                            {parseFloat(formData.su_miktari).toFixed(6)} m³/sn
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded border">
                                                        <span className="text-gray-600">Toplam Su Tüketimi:</span>
                                                        <div className="font-semibold text-green-900">
                                                            {toplam_su_miktari.toFixed(2)} m³
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Butonlar */}
                                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium flex items-center"
                                    >
                                        {formLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {editingItem ? 'Güncelle' : 'Kaydet'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Veri Tablosu */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Kanal
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tarih
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Başlangıç
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Bitiş
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Yükseklik (m)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Su Miktarı (m³)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Süre (dk)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {veriler.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                                            Henüz veri bulunmuyor
                                        </td>
                                    </tr>
                                ) : (
                                    veriler.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>
                                                    <div className="font-medium">{item.kanal_isim}</div>
                                                    <div className="text-gray-500">{item.depolama_tesisi_isim}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(item.tarih).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(item.baslangic_saati).toLocaleTimeString('tr-TR', { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(item.bitis_saati).toLocaleTimeString('tr-TR', { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.yukseklik}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-medium">{item.su_miktari}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.sure_dakika || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                                        title="Düzenle"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                                        title="Sil"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
} 