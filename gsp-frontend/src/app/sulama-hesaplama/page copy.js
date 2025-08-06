'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { sulamaAPI } from '@/utils/api';

export default function SulamaHesaplamaPage() {
    const { user, token } = useAuth();
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    
    // Form verileri
    const [formData, setFormData] = useState({
        sulama: '',
        kurumAdi: '',
        yil: new Date().getFullYear(),
        ciftlikRandi: 80,
        iletimRandi: 85
    });

    // Data state'leri
    const [sulamalar, setSulamalar] = useState([]);
    const [urunler, setUrunler] = useState([]);
    
    // Tablo verileri
    const [tableData, setTableData] = useState([
        {
            id: 1,
            urun: '',
            ekim_alani: '',
            ekim_orani: '',
            ur_values: Array(12).fill(''),
            toplam_ur: 0,
            su_tuketimi: 0
        }
    ]);

    // Sonuçlar
    const [results, setResults] = useState({
        aylik_toplamlari: Array(12).fill(0),
        toplam_alan: 0,
        toplam_oran: 0,
        net_su_toplam: 0,
        ciftlik_su_toplam: 0,
        brut_su_toplam: 0,
        net_su_aylik: Array(12).fill(0),
        ciftlik_su_aylik: Array(12).fill(0),
        brut_su_aylik: Array(12).fill(0)
    });

    const [editingRow, setEditingRow] = useState(null); // Düzenlenmekte olan satır

    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    const monthsShort = [
        'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
        'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
    ];

    // Sulamaları yükle
    const loadSulamalar = async () => {
        try {
            setLoading(true);
            console.log('Kullanıcı bilgisi:', user);
            console.log('Token:', token);
            
            const data = await sulamaAPI.getSulamalar();
            console.log('API yanıtı:', data);
            
            if (Array.isArray(data)) {
                setSulamalar(data);
                console.log('Sulamalar set edildi:', data);
            } else if (data && Array.isArray(data.results)) {
                setSulamalar(data.results);
                console.log('Sulamalar results alanından set edildi:', data.results);
            } else {
                console.warn('Beklenmeyen veri formatı:', data);
                setSulamalar([]);
            }
        } catch (error) {
            console.error('Sulama sistemleri yüklenirken hata:', error);
            showErrorToast('Sulama sistemleri yüklenirken hata oluştu: ' + error.message);
            setSulamalar([]);
        } finally {
            setLoading(false);
        }
    };

    // Ürünleri yükle
    const loadUrunler = async (sulamaId) => {
        try {
            const data = await sulamaAPI.getUrunler({ sulama: sulamaId });
            if (Array.isArray(data)) {
                setUrunler(data);
            } else if (data && Array.isArray(data.results)) {
                setUrunler(data.results);
            }
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
            showErrorToast('Ürünler yüklenirken hata oluştu');
        }
    };

    // Form değişiklikleri
    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'sulama' && value) {
            loadUrunler(value);
        }
    };

    // Tablo satırı ekleme
    const addTableRow = () => {
        const newRow = {
            id: Date.now(),
            urun: '',
            ekim_alani: '',
            ekim_orani: '0',
            ur_values: Array(12).fill(0),
            toplam_ur: 0,
            su_tuketimi: 0
        };
        setTableData(prev => [...prev, newRow]);
        // Yeni satır eklendiğinde hesaplama yapmayalım, sadece gerektiğinde
    };

    // Tablo satırı silme
    const removeTableRow = (id) => {
        if (tableData.length > 1) {
            const filteredData = tableData.filter(row => row.id !== id);
            setTableData(filteredData);
            // Oranları yeniden hesapla
            calculatePercentages(filteredData);
        }
    };

    // Tablo değişiklikleri
    const handleTableChange = (id, field, value) => {
        const newTableData = tableData.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };
                
                // Ürün seçildiğinde UR değerlerini doldur
                if (field === 'urun' && value) {
                    const selectedUrun = urunler.find(u => u.id === parseInt(value));
                    if (selectedUrun) {
                        updatedRow.ur_values = [
                            selectedUrun.ocak || 0,
                            selectedUrun.subat || 0,
                            selectedUrun.mart || 0,
                            selectedUrun.nisan || 0,
                            selectedUrun.mayis || 0,
                            selectedUrun.haziran || 0,
                            selectedUrun.temmuz || 0,
                            selectedUrun.agustos || 0,
                            selectedUrun.eylul || 0,
                            selectedUrun.ekim || 0,
                            selectedUrun.kasim || 0,
                            selectedUrun.aralik || 0
                        ];
                        updatedRow.toplam_ur = updatedRow.ur_values.reduce((sum, val) => sum + parseFloat(val || 0), 0);
                    }
                }
                
                // UR değeri değiştiğinde toplam hesapla
                if (field === 'ur_values') {
                    updatedRow.toplam_ur = value.reduce((sum, val) => sum + parseFloat(val || 0), 0);
                }
                
                // Su tüketimi hesapla
                const alan = parseFloat(updatedRow.ekim_alani || 0);
                const urToplam = parseFloat(updatedRow.toplam_ur || 0);
                updatedRow.su_tuketimi = alan * urToplam;
                
                return updatedRow;
            }
            return row;
        });
        
        setTableData(newTableData);
        
        // Önce oranları hesapla, sonra sonuçları hesapla
        calculatePercentages(newTableData);
    };

    // Yüzdeleri hesapla
    const calculatePercentages = (data) => {
        // Sadece dolu satırların alanlarını topla
        const validRows = data.filter(row => 
            row.urun && row.ekim_alani && parseFloat(row.ekim_alani) > 0
        );
        const totalArea = validRows.reduce((sum, row) => sum + parseFloat(row.ekim_alani || 0), 0);
        
        if (totalArea > 0) {
            const updatedData = data.map(row => {
                // Eğer satır dolu ise oran hesapla, değilse 0 yap
                if (row.urun && row.ekim_alani && parseFloat(row.ekim_alani) > 0) {
                    return {
                        ...row,
                        ekim_orani: ((parseFloat(row.ekim_alani || 0) / totalArea) * 100).toFixed(1)
                    };
                } else {
                    return {
                        ...row,
                        ekim_orani: '0'
                    };
                }
            });
            setTableData(updatedData);
            
            // Oranlar güncellendikten sonra sonuçları hesapla
            calculateResults(updatedData);
        }
    };

    // Sonuçları hesapla
    const calculateResults = (data) => {
        const aylik_toplamlari = Array(12).fill(0);
        let toplam_alan = 0;
        let toplam_oran = 0;

        // Sadece dolu satırları hesaba kat (ürün seçilmiş ve alan girilmiş)
        const validRows = data.filter(row => 
            row.urun && row.ekim_alani && parseFloat(row.ekim_alani) > 0
        );

        validRows.forEach(row => {
            const alan = parseFloat(row.ekim_alani || 0);
            const oran = parseFloat(row.ekim_orani || 0) / 100; // Oranı decimal'e çevir
            
            toplam_alan += alan;
            toplam_oran += parseFloat(row.ekim_orani || 0);

            // Net sulama hesabı: Alan × Backend UR değeri ÷ 100000
            row.ur_values.forEach((urValue, monthIndex) => {
                const netSulamaHesabi = (alan * parseFloat(urValue || 0)) / 100000;
                aylik_toplamlari[monthIndex] += netSulamaHesabi;
            });
        });

        // Net su ihtiyacı - Django template'deki gibi direkt m³ cinsinden
        const net_su_aylik = aylik_toplamlari.map(val => val); // Direkt m³ değer (1000'e bölme yok)
        const net_su_toplam = net_su_aylik.reduce((sum, val) => sum + val, 0);
        
        // Çiftlik su ihtiyacı - Django template'deki randıman formülü
        const ciftlikRandi = formData.ciftlikRandi || 80;
        const ciftlik_su_aylik = net_su_aylik.map(val => (val * 100) / ciftlikRandi);
        const ciftlik_su_toplam = ciftlik_su_aylik.reduce((sum, val) => sum + val, 0);
        
        // Brüt su ihtiyacı - Django template'deki randıman formülü  
        const iletimRandi = formData.iletimRandi || 85;
        const brut_su_aylik = ciftlik_su_aylik.map(val => (val * 100) / iletimRandi);
        const brut_su_toplam = brut_su_aylik.reduce((sum, val) => sum + val, 0);

        // Tüm değerleri hm³ cinsine çevir (template'de hm³ olarak gösteriliyor)
        const net_su_aylik_hm3 = net_su_aylik.map(val => val / 1000);
        const net_su_toplam_hm3 = net_su_toplam / 1000;
        
        const ciftlik_su_aylik_hm3 = ciftlik_su_aylik.map(val => val / 1000);
        const ciftlik_su_toplam_hm3 = ciftlik_su_toplam / 1000;
        
        const brut_su_aylik_hm3 = brut_su_aylik.map(val => val / 1000);
        const brut_su_toplam_hm3 = brut_su_toplam / 1000;

        setResults({
            aylik_toplamlari,
            toplam_alan,
            toplam_oran,
            net_su_toplam: net_su_toplam_hm3,
            ciftlik_su_toplam: ciftlik_su_toplam_hm3,
            brut_su_toplam: brut_su_toplam_hm3,
            net_su_aylik: net_su_aylik_hm3,
            ciftlik_su_aylik: ciftlik_su_aylik_hm3,
            brut_su_aylik: brut_su_aylik_hm3
        });
    };

    // Verileri kaydet
    const saveData = async () => {
        // Doğrulama kontrolleri
        if (!formData.sulama) {
            showErrorToast('Lütfen sulama seçin');
            return;
        }

        if (!formData.yil) {
            showErrorToast('Lütfen yıl bilgisini girin');
            return;
        }

        // En az bir geçerli satır var mı kontrol et
        const validRows = tableData.filter(row => 
            row.urun && row.ekim_alani && parseFloat(row.ekim_alani) > 0
        );

        if (validRows.length === 0) {
            showErrorToast('Lütfen en az bir geçerli ürün satırı ekleyin');
            return;
        }

        setFormLoading(true);
        try {
            // API'ye gönderilecek veriyi hazırla
            const saveData = {
                sulama: formData.sulama,
                yil: formData.yil,
                ciftlik_randi: formData.ciftlikRandi,
                iletim_randi: formData.iletimRandi,
                table_data: validRows.map(row => {
                    // Su tüketimini hesapla (Alan × Toplam UR)
                    const alan = parseFloat(row.ekim_alani) || 0;
                    const toplamUr = parseFloat(row.toplam_ur) || 0;
                    const suTuketimi = alan * toplamUr; // ha × m³/ha → m³ (direkt çarpım, 1000 çarpımı yok)

                    return {
                        urun: row.urun,
                        ekim_alani: alan, // hektar cinsinden
                        su_tuketimi: suTuketimi // m³ cinsinden
                    };
                })
            };

            console.log('Kaydedilecek veri:', saveData);

            const response = await sulamaAPI.saveSulamaHesaplama(saveData);
            
            showSuccessToast(`${response.kayit_sayisi} kayıt başarıyla kaydedildi`);
            
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            
            // API'den gelen hata mesajını göster
            let errorMessage = 'Veriler kaydedilirken hata oluştu';
            
            if (error.message.includes('error')) {
                try {
                    const errorData = JSON.parse(error.message.split('message: ')[1]);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (parseError) {
                    // JSON parse başarısız olursa default mesajı kullan
                }
            }
            
            showErrorToast(errorMessage);
        } finally {
            setFormLoading(false);
        }
    };

    // Excel'e aktar
    const exportToExcel = () => {
        // Excel export işlemi
        showSuccessToast('Excel dosyası indiriliyor...');
    };

    const toggleEdit = (rowId) => {
        setEditingRow(editingRow === rowId ? null : rowId);
    };

    useEffect(() => {
        if (token) {
            loadSulamalar();
        }
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <h3 className="mt-6 text-xl font-semibold text-blue-900">Yükleniyor...</h3>
                    <p className="mt-2 text-blue-600">Sulama hesaplama sistemi hazırlanıyor</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Başlık */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-blue-900 mb-4">Sulama Su İhtiyacı Hesaplama</h1>
                    <p className="text-lg text-blue-700 max-w-2xl mx-auto">
                        Bitki türlerine göre aylık su ihtiyacı hesaplaması yapın ve sulama planınızı optimize edin
                    </p>
                </div>

                {/* Form Kartı */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8 mb-8 backdrop-blur-sm">
                    <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-blue-900">Genel Bilgiler</h2>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-3 lg:gap-6">
                        {/* Sulama */}
                        <div className="col-span-6 sm:col-span-2">
                            <label className="block text-sm font-semibold text-blue-800 mb-2">
                                Sulama  *
                            </label>
                            <select
                                value={formData.sulama}
                                onChange={(e) => handleFormChange('sulama', e.target.value)}
                                className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium transition-all duration-200"
                            >
                                <option value="">Sulama  seçin</option>
                                {sulamalar.map(sulama => (
                                    <option key={sulama.id} value={sulama.id}>
                                        {sulama.isim}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Kurum/Kanal Adı */}
                        <div className="col-span-6 sm:col-span-2">
                            <label className="block text-sm font-semibold text-blue-800 mb-2">
                                Kurum/Kanal Adı
                            </label>
                            <input
                                type="text"
                                value={formData.kurumAdi}
                                onChange={(e) => handleFormChange('kurumAdi', e.target.value)}
                                placeholder="DSİ ... Barajı"
                                className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium placeholder-blue-400 transition-all duration-200"
                            />
                        </div>

                        {/* Yıl */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-semibold text-blue-800 mb-2">
                                Yıl
                            </label>
                            <input
                                type="number"
                                value={formData.yil}
                                onChange={(e) => handleFormChange('yil', parseInt(e.target.value))}
                                className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium transition-all duration-200"
                            />
                        </div>

                        {/* Çiftlik Randımanı */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-semibold text-blue-800 mb-2">
                                Çiftlik % *
                            </label>
                            <input
                                type="number"
                                value={formData.ciftlikRandi}
                                onChange={(e) => handleFormChange('ciftlikRandi', parseInt(e.target.value))}
                                min="1"
                                max="100"
                                className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium transition-all duration-200"
                            />
                        </div>

                        {/* İletim Randımanı */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-semibold text-blue-800 mb-2">
                                İletim % *
                            </label>
                            <input
                                type="number"
                                value={formData.iletimRandi}
                                onChange={(e) => handleFormChange('iletimRandi', parseInt(e.target.value))}
                                min="1"
                                max="100"
                                className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Tablo Kartı */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-8 mb-8 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-blue-900">Bitki Türleri ve Su Tüketimi</h2>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                            <button
                                onClick={addTableRow}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Satır Ekle
                            </button>
                        </div>
                    </div>

                    {/* Responsive Tablo Container */}
                    <div className="w-full">
                        {/* Mobile ve Tablet için Uyarı */}
                        <div className="lg:hidden mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm text-blue-700 font-medium">
                                    En iyi deneyim için tabloya yatay kaydırarak erişebilirsiniz
                                </span>
                            </div>
                        </div>

                        {/* Tablo Container - Horizontal Scroll */}
                        <div className="overflow-x-auto rounded-lg border border-blue-200 shadow-inner bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="min-w-[1400px]"> {/* Minimum genişlik garantisi */}
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-30">
                                        <tr>
                                            <th className="sticky left-0 z-40 px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r-2 border-blue-400 bg-blue-700" style={{width: '356px'}}>
                                                <div className="flex">
                                                    <div className="w-[180px] text-left">Bitki Türü</div>
                                                    <div className="w-24 text-center border-l border-blue-400 pl-2">Alan<br/><span className="text-xs opacity-90">(ha)</span></div>
                                                    <div className="w-20 text-center border-l border-blue-400 pl-2">Oran<br/><span className="text-xs opacity-90">(%)</span></div>
                                                </div>
                                            </th>
                                            {monthsShort.map(month => (
                                                <th key={month} className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500 w-20">
                                                    {month}
                                                </th>
                                            ))}
                                            <th className="sticky right-[60px] z-40 px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-l-2 border-blue-400 bg-blue-700 w-20">
                                                Toplam
                                            </th>
                                            <th className="sticky right-0 z-40 px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-l-2 border-blue-400 bg-blue-700 w-20">
                                                İşlem
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-blue-100">
                                        {tableData.map((row, index) => (
                                            <React.Fragment key={row.id}>
                                                {/* Ana Satır */}
                                                <tr className="hover:bg-blue-50 transition-colors duration-150">
                                                    {/* İlk 3 Kolon - Sticky */}
                                                    <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-blue-200 bg-white hover:bg-blue-50 transition-colors duration-150" style={{width: '356px'}}>
                                                        <div className="flex items-center">
                                                            {/* Bitki Türü */}
                                                            <div className="w-[180px] pr-2">
                                                                <select
                                                                    value={row.urun}
                                                                    onChange={(e) => handleTableChange(row.id, 'urun', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs border-2 border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium"
                                                                >
                                                                    <option value="">Ürün seçin</option>
                                                                    {urunler.map(urun => (
                                                                        <option key={urun.id} value={urun.id}>
                                                                            {urun.isim}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            
                                                            {/* Alan */}
                                                            <div className="w-24 px-1 border-l border-blue-200">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={row.ekim_alani}
                                                                    onChange={(e) => handleTableChange(row.id, 'ekim_alani', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs text-center border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 text-blue-900 font-medium"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            
                                                            {/* Oran */}
                                                            <div className="w-20 px-1 border-l border-blue-200 text-center">
                                                                <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded-full">
                                                                    {row.ekim_orani}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* UR Değerleri - Sadece Gösterim */}
                                                    {row.ur_values.map((urValue, monthIndex) => (
                                                        <td key={monthIndex} className="px-2 py-3 border-r border-blue-100 w-20 text-center">
                                                            {editingRow === row.id ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={urValue}
                                                                    onChange={(e) => {
                                                                        const newUrValues = [...row.ur_values];
                                                                        newUrValues[monthIndex] = e.target.value;
                                                                        handleTableChange(row.id, 'ur_values', newUrValues);
                                                                    }}
                                                                    className="w-full px-2 py-1 text-xs text-center border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-blue-900 font-medium"
                                                                    placeholder="0"
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-medium text-blue-800 bg-blue-50 px-2 py-1 rounded border">
                                                                    {parseFloat(urValue || 0).toFixed(2)}
                                                                </span>
                                                            )}
                                                        </td>
                                                    ))}

                                                    {/* Toplam - Sticky Right */}
                                                    <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-blue-200 bg-white hover:bg-blue-50 transition-colors duration-150">
                                                        <span className="text-xs font-bold text-green-800 bg-green-100 px-2 py-1 rounded-full">
                                                            {row.toplam_ur.toFixed(2)}
                                                        </span>
                                                    </td>

                                                    {/* İşlemler - Sticky Right */}
                                                    <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-blue-200 bg-white hover:bg-blue-50 transition-colors duration-150">
                                                        <div className="flex justify-center items-center space-x-1">
                                                            {/* Edit/Save Button */}
                                                            <button
                                                                onClick={() => toggleEdit(row.id)}
                                                                className={`p-1 rounded transition-all duration-200 transform hover:scale-110 ${
                                                                    editingRow === row.id 
                                                                        ? 'text-green-600 hover:text-green-800 hover:bg-green-100' 
                                                                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                                                                }`}
                                                                title={editingRow === row.id ? "Kaydet" : "Düzenle"}
                                                            >
                                                                {editingRow === row.id ? (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                )}
                                                            </button>

                                                            {/* Delete Button */}
                                                            {tableData.length > 1 && (
                                                                <button
                                                                    onClick={() => removeTableRow(row.id)}
                                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition-all duration-200 transform hover:scale-110"
                                                                    title="Satırı Sil"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* U-R x Oran Satırı */}
                                                <tr className="bg-gray-50 text-gray-700 text-xs">
                                                    <td className="sticky left-0 z-30 px-3 py-2 text-right font-medium border-r-2 border-blue-200 bg-gray-50" style={{width: '356px'}}>
                                                        u-r × oran
                                                    </td>
                                                    {/* UR x Oran değerleri */}
                                                    {row.ur_values.map((urValue, monthIndex) => {
                                                        const oran = parseFloat(row.ekim_orani || 0) / 100;
                                                        const urOranCarpimi = (parseFloat(urValue || 0) * oran).toFixed(2);
                                                        return (
                                                            <td key={monthIndex} className="px-2 py-2 text-center border-r border-blue-100 w-20">
                                                                <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-800 text-xs">
                                                                    {urOranCarpimi}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Toplam UR x Oran - Sticky Right */}
                                                    <td className="sticky right-[60px] z-30 px-2 py-2 text-center border-l-2 border-blue-200 bg-gray-50">
                                                        <span className="bg-green-100 px-2 py-0.5 rounded text-green-800 font-medium">
                                                            {((parseFloat(row.toplam_ur) * parseFloat(row.ekim_orani || 0)) / 100).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="sticky right-0 z-30 px-2 py-2 border-l-2 border-blue-200 bg-gray-50"></td>
                                                </tr>
                                            </React.Fragment>
                                        ))}

                                        {/* Sonuç Satırları */}
                                        {/* Sonuç Satırları */}
                                        <tr className="bg-gradient-to-r from-blue-100 to-blue-200 font-bold text-sm">
                                            <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-blue-300 text-blue-900 bg-blue-100" style={{width: '356px'}}>
                                                <div className="flex items-center">
                                                    <div className="w-[180px]">TOPLAM (UR×ORAN)</div>
                                                    <div className="w-24 text-center border-l border-blue-300 pl-2">{results.toplam_alan.toFixed(2)} ha</div>
                                                    <div className="w-20 text-center border-l border-blue-300 pl-2">{results.toplam_oran.toFixed(1)}%</div>
                                                </div>
                                            </td>
                                            {results.aylik_toplamlari.map((total, index) => (
                                                <td key={index} className="px-2 py-3 text-center text-sm border-r border-blue-200 text-blue-900 w-20">
                                                    {total.toFixed(2)}
                                                </td>
                                            ))}
                                            <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-blue-300 text-blue-900 bg-blue-100">
                                                {results.aylik_toplamlari.reduce((sum, val) => sum + val, 0).toFixed(2)}
                                            </td>
                                            <td className="sticky right-0 z-30 px-2 py-3 border-l-2 border-blue-300 bg-blue-100"></td>
                                        </tr>
                                        <tr className="bg-gradient-to-r from-blue-100 to-blue-200 font-bold text-sm">
                                            <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-blue-300 text-blue-900 bg-blue-100" style={{width: '356px'}}>
                                                <div className="flex items-center">
                                                    <div className="w-[180px]">NET SULAMA</div>
                                                    <div className="w-24 text-center border-l border-blue-300 pl-2">{results.toplam_alan.toFixed(2)} ha</div>
                                                    <div className="w-20 text-center border-l border-blue-300 pl-2">{results.toplam_oran.toFixed(1)}%</div>
                                                </div>
                                            </td>
                                            {results.aylik_toplamlari.map((total, index) => (
                                                <td key={index} className="px-2 py-3 text-center text-sm border-r border-blue-200 text-blue-900 w-20">
                                                    {total.toFixed(2)}
                                                </td>
                                            ))}
                                            <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-blue-300 text-blue-900 bg-blue-100">
                                                {results.aylik_toplamlari.reduce((sum, val) => sum + val, 0).toFixed(2)}
                                            </td>
                                            <td className="sticky right-0 z-30 px-2 py-3 border-l-2 border-blue-300 bg-blue-100"></td>
                                        </tr>

                                        <tr className="bg-gradient-to-r from-green-100 to-green-200 font-bold text-sm">
                                            <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-green-300 text-green-900 bg-green-100" style={{width: '356px'}}>
                                                NET SU İHTİYACI (hm³)
                                            </td>
                                            {results.net_su_aylik.map((total, index) => (
                                                <td key={index} className="px-2 py-3 text-center text-sm border-r border-green-200 text-green-900 w-20">
                                                    {total.toFixed(3)}
                                                </td>
                                            ))}
                                            <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-green-300 text-green-900 bg-green-100">
                                                {results.net_su_toplam.toFixed(3)}
                                            </td>
                                            <td className="sticky right-0 z-30 px-2 py-3 border-l-2 border-green-300 bg-green-100"></td>
                                        </tr>

                                        <tr className="bg-gradient-to-r from-yellow-100 to-yellow-200 font-bold text-sm">
                                            <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-yellow-300 text-yellow-900 bg-yellow-100" style={{width: '356px'}}>
                                                ÇİFTLİK SU İHTİYACI (hm³)
                                            </td>
                                            {results.ciftlik_su_aylik.map((total, index) => (
                                                <td key={index} className="px-2 py-3 text-center text-sm border-r border-yellow-200 text-yellow-900 w-20">
                                                    {total.toFixed(3)}
                                                </td>
                                            ))}
                                            <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-yellow-300 text-yellow-900 bg-yellow-100">
                                                {results.ciftlik_su_toplam.toFixed(3)}
                                            </td>
                                            <td className="sticky right-0 z-30 px-2 py-3 border-l-2 border-yellow-300 bg-yellow-100"></td>
                                        </tr>

                                        <tr className="bg-gradient-to-r from-red-100 to-red-200 font-bold text-sm">
                                            <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-red-300 text-red-900 bg-red-100" style={{width: '356px'}}>
                                                BRÜT SU İHTİYACI (hm³)
                                            </td>
                                            {results.brut_su_aylik.map((total, index) => (
                                                <td key={index} className="px-2 py-3 text-center text-sm border-r border-red-200 text-red-900 w-20">
                                                    {total.toFixed(3)}
                                                </td>
                                            ))}
                                            <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-red-300 text-red-900 bg-red-100">
                                                {results.brut_su_toplam.toFixed(3)}
                                            </td>
                                            <td className="sticky right-0 z-30 px-2 py-3 border-l-2 border-red-300 bg-red-100"></td>
                                        </tr>

                                        {/* Toplam Sulama Suyu İhtiyacı */}
                                        <tr className="bg-gradient-to-r from-purple-100 to-purple-200 font-bold text-sm">
                                            <td className="sticky left-0 z-30 px-3 py-3 text-center border-r-2 border-purple-300 text-purple-900 bg-purple-100" style={{width: '356px'}}>
                                                TOPLAM SULAMA SUYU İHTİYACI (hm³)
                                            </td>
                                            {/* Boş aylik sütunlar */}
                                            {monthsShort.map((_, index) => (
                                                <td key={index} className="px-2 py-3 w-20"></td>
                                            ))}
                                            <td className="sticky right-[60px] z-30 px-2 py-3 text-center border-l-2 border-purple-300 text-purple-900 bg-purple-100 text-sm">
                                                {results.brut_su_toplam.toFixed(3)}
                                            </td>
                                            <td className="sticky right-0 z-30 px-2 py-3 border-l-2 border-purple-300 bg-purple-100"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Açıklamalar ve Öneriler */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8 mb-8">
                    <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-orange-900">AÇIKLAMA ve ÖNERİLER</h2>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-6">
                        <ul className="space-y-3 text-orange-800">
                            <li className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></span>
                                <span>Su ihtiyacı hesaplaması, bitki türlerinin aylık su tüketim katsayıları (u-r) ve ekim alanlarına göre yapılmaktadır.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></span>
                                <span>Net sulama suyu ihtiyacı, bitkinin direkt su ihtiyacını gösterir (hm³ cinsinden).</span>
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></span>
                                <span>Çiftlik su ihtiyacı, çiftlik düzeyindeki randıman kayıpları dikkate alınarak hesaplanır.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></span>
                                <span>Brüt sulama suyu ihtiyacı, iletim kayıpları da dahil edilerek toplam ihtiyacı gösterir.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></span>
                                <span>Randıman değerleri bölgesel koşullara göre ayarlanmalı, genellikle çiftlik randımanı %75-85, iletim randımanı %80-90 aralığında olmalıdır.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3"></span>
                                <span>Hesaplama sonuçları, sulama sisteminin planlanması ve su kaynaklarının yönetimi için kullanılabilir.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 mb-8">
                    <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:gap-6 lg:justify-between lg:items-center">
                        <button
                            onClick={() => {
                                // Tabloyu yeniden hesapla
                                calculateResults(tableData);
                                showSuccessToast('Tablo başarıyla hesaplandı');
                            }}
                            className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Tabloyu Hesapla
                        </button>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                                onClick={exportToExcel}
                                className="w-full sm:w-auto px-6 py-3 border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-all duration-200 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Excel'e Aktar
                            </button>
                            
                            <button
                                onClick={saveData}
                                disabled={formLoading}
                                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                            >
                                {formLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                                        <span className="hidden sm:inline">Kaydediliyor...</span>
                                        <span className="sm:hidden">Kaydediliyor</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="hidden sm:inline">Hesaplamayı Kaydet</span>
                                        <span className="sm:hidden">Kaydet</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
 