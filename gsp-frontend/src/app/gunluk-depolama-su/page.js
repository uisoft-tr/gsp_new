'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { sulamaAPI } from '@/utils/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

export default function GunlukDepolamaSuPage() {
    const { user, token } = useAuth();
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast, info: showInfoToast } = useToast();
    
    const [veriler, setVeriler] = useState([]);
    const [depolamaTesisleri, setDepolamaTesisleri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    // Bugünün tarihi
    const today = new Date().toISOString().split('T')[0];
    
    // Mevcut ayın başlangıcı
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentMonthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Filtreleme state'leri
    const [filters, setFilters] = useState({
        baslangic_tarih: currentMonthStart,
        bitis_tarih: today,
        depolama_tesisi: ''
    });
    
    // Grafik verileri
    const [grafikVerileri, setGrafikVerileri] = useState([]);
    
    // İstatistikler
    const [istatistikler, setIstatistikler] = useState({
        toplam_kayit: 0,
        toplam_su_miktari: 0,
        ortalama_su_miktari: 0,
        aktif_tesis_sayisi: 0
    });
    
    const [formData, setFormData] = useState({
        depolama_tesisi: '',
        tarih: today,
        kot: '',
        su_miktari: ''
    });

    // Aylar listesi
    const months = [
        { no: 1, name: 'Ocak', short: 'Oca' },
        { no: 2, name: 'Şubat', short: 'Şub' },
        { no: 3, name: 'Mart', short: 'Mar' },
        { no: 4, name: 'Nisan', short: 'Nis' },
        { no: 5, name: 'Mayıs', short: 'May' },
        { no: 6, name: 'Haziran', short: 'Haz' },
        { no: 7, name: 'Temmuz', short: 'Tem' },
        { no: 8, name: 'Ağustos', short: 'Ağu' },
        { no: 9, name: 'Eylül', short: 'Eyl' },
        { no: 10, name: 'Ekim', short: 'Eki' },
        { no: 11, name: 'Kasım', short: 'Kas' },
        { no: 12, name: 'Aralık', short: 'Ara' }
    ];

    // Yıllık grafik verilerini hazırla (her yıl için ilk kayıt)
    const prepareGrafikVerileri = (data) => {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        // Yıllık verileri grupla
        const yillikGruplar = {};
        
        // Verileri yıllara göre grupla
        data.forEach(item => {
            const tarih = new Date(item.tarih);
            const yil = tarih.getFullYear();
            
            if (!yillikGruplar[yil]) {
                yillikGruplar[yil] = {
                    yil: yil,
                    ilk_kayitlar: [],
                    su_miktari: 0,
                    kayit_sayisi: 0
                };
            }
            
            yillikGruplar[yil].ilk_kayitlar.push({
                ...item,
                tarih_obj: tarih
            });
        });

        // Her yıl için en erken tarihdeki toplam su miktarını hesapla
        const yillikVeri = Object.values(yillikGruplar).map(grup => {
            // Tarihe göre sırala ve ilk tarih grubunu al
            grup.ilk_kayitlar.sort((a, b) => a.tarih_obj - b.tarih_obj);
            
            if (grup.ilk_kayitlar.length === 0) {
                return {
                    yil: grup.yil,
                    su_miktari: 0,
                    kayit_sayisi: 0
                };
            }

            // İlk tarih
            const ilkTarih = grup.ilk_kayitlar[0].tarih_obj;
            const ilkTarihStr = ilkTarih.toISOString().split('T')[0];
            
            // O tarihteki tüm tesislerin kayıtlarını topla
            let toplamSuMiktari = 0;
            let kayitSayisi = 0;
            const tesisler = new Set();
            
            grup.ilk_kayitlar.forEach(kayit => {
                const kayitTarihi = kayit.tarih_obj.toISOString().split('T')[0];
                if (kayitTarihi === ilkTarihStr) {
                    const tesisKey = kayit.depolama_tesisi;
                    if (!tesisler.has(tesisKey)) {
                        tesisler.add(tesisKey);
                        toplamSuMiktari += parseFloat(kayit.su_miktari || 0);
                        kayitSayisi += 1;
                    }
                }
            });
            
            return {
                yil: grup.yil,
                su_miktari: toplamSuMiktari,
                kayit_sayisi: kayitSayisi,
                ilk_tarih: ilkTarihStr
            };
        });

        // Yıla göre sırala
        return yillikVeri.sort((a, b) => a.yil - b.yil);
    };

    // Su miktarını formatla (tam sayı)
    const formatSuMiktari = (miktar) => {
        if (!miktar || miktar === 0) return '0 m³';
        return Math.round(miktar).toLocaleString() + ' m³';
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900 mb-2">{label} Yılı</p>
                    <div className="space-y-1">
                        <div className="flex items-center text-sm">
                            <div 
                                className="w-3 h-3 rounded mr-2" 
                                style={{ backgroundColor: payload[0].color }}
                            ></div>
                            <span className="text-gray-700">
                                Su Miktarı: {formatSuMiktari(payload[0].value)}
                            </span>
                        </div>
                        {data.ilk_tarih && (
                            <div className="text-xs text-gray-500">
                                İlk Kayıt: {new Date(data.ilk_tarih).toLocaleDateString('tr-TR')}
                            </div>
                        )}
                        <div className="text-xs text-gray-500">
                            Kayıt Sayısı: {data.kayit_sayisi}
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // İstatistikleri backend'den getir
    const fetchIstatistikler = async () => {
        try {
            const params = {};
            if (filters.baslangic_tarih) params.baslangic_tarih = filters.baslangic_tarih;
            if (filters.bitis_tarih) params.bitis_tarih = filters.bitis_tarih;
            if (filters.depolama_tesisi) params.depolama_tesisi = filters.depolama_tesisi;
            
            const response = await sulamaAPI.getGunlukDepolamaSuIstatistikleri(params);
            if (response && response.data) {
                setIstatistikler(response.data);
            } else if (response) {
                setIstatistikler(response);
            } else {
                setIstatistikler({
                    toplam_kayit: 0,
                    toplam_su_miktari: 0,
                    ortalama_su_miktari: 0,
                    aktif_tesis_sayisi: 0
                });
            }
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
            setIstatistikler({
                toplam_kayit: 0,
                toplam_su_miktari: 0,
                ortalama_su_miktari: 0,
                aktif_tesis_sayisi: 0
            });
        }
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
            
            // Depolama tesisi filtresi
            if (filters.depolama_tesisi) {
                params.depolama_tesisi = filters.depolama_tesisi;
            }
            
            const data = await sulamaAPI.getGunlukDepolamaSu(params);
            
            let filteredData = [];
            if (Array.isArray(data)) {
                filteredData = data;
            } else if (data && Array.isArray(data.results)) {
                filteredData = data.results;
            }
            
            setVeriler(filteredData);
            
            // Grafik verilerini de yükle
            await loadGrafikData();
            await fetchIstatistikler();
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            showErrorToast('Veriler yüklenirken hata oluştu');
            setVeriler([]);
            setGrafikVerileri([]);
            setIstatistikler({
                toplam_kayit: 0,
                toplam_su_miktari: 0,
                ortalama_su_miktari: 0,
                aktif_tesis_sayisi: 0
            });
        } finally {
            setLoading(false);
        }
    };

    // Grafik verilerini yükle (tüm yıllar)
    const loadGrafikData = async () => {
        try {
            // Son 10 yılın verilerini al
            const currentYear = new Date().getFullYear();
            const params = {
                baslangic_tarih: `${currentYear - 9}-01-01`,
                bitis_tarih: `${currentYear}-12-31`
            };
            
            // Depolama tesisi filtresi varsa ekle
            if (filters.depolama_tesisi) {
                params.depolama_tesisi = filters.depolama_tesisi;
            }
            
            const data = await sulamaAPI.getGunlukDepolamaSu(params);
            
            let grafikData = [];
            if (Array.isArray(data)) {
                grafikData = data;
            } else if (data && Array.isArray(data.results)) {
                grafikData = data.results;
            }
            
            const processedData = prepareGrafikVerileri(grafikData);
            setGrafikVerileri(processedData);
        } catch (error) {
            console.error('Grafik verileri yükleme hatası:', error);
            setGrafikVerileri([]);
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

    // Kot değiştiğinde su miktarını hesapla (debounced)
    const [kotTimeout, setKotTimeout] = useState(null);
    
    const handleKotChange = (kot) => {
        setFormData(prev => ({ ...prev, kot: kot }));
        
        // Önceki timeout'u temizle
        if (kotTimeout) {
            clearTimeout(kotTimeout);
        }
        
        if (!kot || !formData.depolama_tesisi) {
            setFormData(prev => ({ ...prev, su_miktari: '' }));
            return;
        }

        // 500ms timeout ile API çağrısı
        const newTimeout = setTimeout(async () => {
            try {
                const data = await sulamaAPI.hesaplaDepolamaSuMiktari(formData.depolama_tesisi, parseFloat(kot));
                
                if (data.success) {
                    setFormData(prev => ({
                        ...prev,
                        su_miktari: data.su_hacmi
                    }));
                    showSuccessToast(`Su hacmi hesaplandı: ${data.su_hacmi} m³`);
                } else {
                    setFormData(prev => ({
                        ...prev,
                        su_miktari: 0
                    }));
                    showWarningToast(data.error || 'Su hacmi hesaplanamadı');
                }
            } catch (error) {
                console.error('Su hacmi hesaplama hatası:', error);
                setFormData(prev => ({
                    ...prev,
                    su_miktari: 0
                }));
                showErrorToast('Su miktarı hesaplanırken hata oluştu');
            }
        }, 500);
        
        setKotTimeout(newTimeout);
    };

    // Form gönder
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            const submitData = {
                ...formData,
                kot: parseFloat(formData.kot),
                su_miktari: parseFloat(formData.su_miktari)
            };

            if (editingItem) {
                await sulamaAPI.updateGunlukDepolamaSu(editingItem.id, submitData);
                showSuccessToast('Kayıt güncellendi');
            } else {
                await sulamaAPI.createGunlukDepolamaSu(submitData);
                showSuccessToast('Kayıt eklendi');
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
            tarih: today,
            kot: '',
            su_miktari: ''
        });
        setEditingItem(null);
        setShowForm(false);
    };

    // Düzenle
    const handleEdit = (item) => {
        setFormData({
            depolama_tesisi: item.depolama_tesisi,
            tarih: item.tarih,
            kot: item.kot,
            su_miktari: item.su_miktari
        });
        setEditingItem(item);
        setShowForm(true);
    };

    // Sil
    const handleDelete = async (id) => {
        if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

        try {
            await sulamaAPI.deleteGunlukDepolamaSu(id);
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
                    <h1 className="text-4xl font-bold text-gray-900">Günlük Depolama Tesisi Su Miktarı</h1>
                   
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
                                <p className="text-2xl font-bold text-gray-900">
                                    {istatistikler.toplam_kayit.toLocaleString('tr-TR')}
                                </p>
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
                                <p className="text-2xl font-bold text-gray-900">
                                    {Math.round(istatistikler.toplam_su_miktari || 0).toLocaleString()} m³
                                </p>
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
                                <p className="text-2xl font-bold text-gray-900">
                                    {Math.round(istatistikler.ortalama_su_miktari || 0).toLocaleString()} m³
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Aktif Tesis Sayısı</p>
                                <p className="text-2xl font-bold text-gray-900">{istatistikler.aktif_tesis_sayisi}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Yıllık Grafik */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Yıllara Göre Depolama Tesisi Su Miktarı Değişimi
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {filters.depolama_tesisi 
                                    ? `${depolamaTesisleri.find(t => t.id == filters.depolama_tesisi)?.isim || 'Seçili Tesis'} için yıllık ilk kayıt değişimi`
                                    : 'Tüm depolama tesisleri için yıllık ilk kayıt toplamı'}
                            </p>
                        </div>
                    </div>

                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={grafikVerileri}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="yil" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    tickFormatter={(value) => Math.round(value).toLocaleString()}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    iconType="rect"
                                />
                                <Bar 
                                    dataKey="su_miktari" 
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    name="Su Miktarı (m³)"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Grafik Özeti */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Toplam Su Miktarı</span>
                                </div>
                                <p className="text-xl font-bold text-blue-600 mt-1">
                                    {formatSuMiktari(grafikVerileri.reduce((sum, item) => sum + item.su_miktari, 0))}
                                </p>
                            </div>
                            
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">En Yüksek Yıl</span>
                                </div>
                                <p className="text-xl font-bold text-green-600 mt-1">
                                    {(() => {
                                        const maxItem = grafikVerileri.reduce((max, item) => 
                                            item.su_miktari > max.su_miktari ? item : max, 
                                            { yil: '-', su_miktari: 0 }
                                        );
                                        return `${maxItem.yil}`;
                                    })()}
                                </p>
                            </div>
                            
                            <div className="bg-purple-50 rounded-lg p-3">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Ortalama</span>
                                </div>
                                <p className="text-xl font-bold text-purple-600 mt-1">
                                    {(() => {
                                        const yilSayisi = grafikVerileri.length;
                                        const toplam = grafikVerileri.reduce((sum, item) => sum + item.su_miktari, 0);
                                        return yilSayisi > 0 ? formatSuMiktari(toplam / yilSayisi) : '0';
                                    })()}
                                </p>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                onChange={(e) => setFilters(prev => ({ ...prev, depolama_tesisi: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                            >
                                <option value="">Tümü</option>
                                {depolamaTesisleri.map(tesis => (
                                    <option key={tesis.id} value={tesis.id}>
                                        {tesis.sulama_isim} - {tesis.isim}
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
                        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
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
                                <div className="grid grid-cols-1 gap-6">
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
                                            onChange={(e) => setFormData(prev => ({ ...prev, depolama_tesisi: e.target.value, kot: '', su_miktari: '' }))}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                                        >
                                            <option value="">Depolama tesisi seçin</option>
                                            {depolamaTesisleri.map(tesis => (
                                                <option key={tesis.id} value={tesis.id}>
                                                    {tesis.sulama_isim} - {tesis.isim}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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

                                    {/* Kot */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                            <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                            </svg>
                                            Kot (m) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.kot}
                                            onChange={(e) => handleKotChange(e.target.value)}
                                            required
                                            disabled={!formData.depolama_tesisi}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                            placeholder={formData.depolama_tesisi ? "Örn: 125.50" : "Önce depolama tesisi seçin"}
                                        />
                                    </div>
                                </div>

                                {/* Su Miktarı - Disabled */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        Su Miktarı (m³) - Otomatik Hesaplanır
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.su_miktari}
                                            disabled
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                        <div className="ml-3 p-2 bg-blue-100 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Bu değer kot girildikten sonra depolama tesisi abağından otomatik hesaplanır
                                    </p>
                                </div>

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
                                        Depolama Tesisi
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tarih
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Kot (m)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Su Miktarı (m³)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Doluluk Oranı
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {veriler.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                            Henüz veri bulunmuyor
                                        </td>
                                    </tr>
                                ) : (
                                    veriler.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>
                                                    <div className="font-medium">{item.depolama_tesisi_isim}</div>
                                                    <div className="text-gray-500">{item.sulama_isim}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(item.tarih).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-medium">{item.kot}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-medium">
                                                    {Math.round(parseFloat(item.su_miktari || 0)).toLocaleString()} m³
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.doluluk_orani ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        item.doluluk_orani >= 80 ? 'bg-green-100 text-green-800' :
                                                        item.doluluk_orani >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        %{item.doluluk_orani}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
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
