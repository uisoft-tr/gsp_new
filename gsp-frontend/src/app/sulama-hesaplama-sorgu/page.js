'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { sulamaAPI } from '@/utils/api';
import { exportToExcelWithTemplate } from '@/utils/excelExport';

export default function SulamaHesaplamaSorguPage() {
    const { token } = useAuth();
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToast();
    
    const [queryLoading, setQueryLoading] = useState(false);
    
    // Mevcut yıl varsayılan olarak seçili
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedSulama, setSelectedSulama] = useState('');
    const [availableSulamalar, setAvailableSulamalar] = useState([]);
    const [sorguSonucu, setSorguSonucu] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [results, setResults] = useState({});
    
    const [hesaplamaData, setHesaplamaData] = useState({
        sulama: '',
        kurumAdi: '',
        yil: '',
        ciftlikRandi:"" ,
        iletimRandi: ""
    });

    // 2010-2030 yıl aralığı
    const yillar = Array.from({ length: 10 }, (_, i) => 2017 + i);

    // Yıla göre mevcut sulama sistemlerini yükle
    const loadAvailableSulamalar = async (yil) => {
        if (!yil) {
            setAvailableSulamalar([]);
            return;
        }

        try {
            const params = { yil: yil };
            const veriler = await sulamaAPI.getYillikTuketim(params);
            const kayitlar = Array.isArray(veriler) ? veriler : (veriler.results || []);
            
            // Benzersiz sulama sistemlerini al
            const uniqueSulamalar = [];
            const seenSulamaIds = new Set();
            
            kayitlar.forEach(kayit => {
                if (!seenSulamaIds.has(kayit.sulama)) {
                    seenSulamaIds.add(kayit.sulama);
                    uniqueSulamalar.push({
                        id: kayit.sulama,
                        isim: kayit.sulama_isim || `Sulama ${kayit.sulama}`,
                        yil: kayit.yil
                    });
                }
            });

            setAvailableSulamalar(uniqueSulamalar);
            
            // Eğer daha önce seçilen sulama bu listede yoksa sıfırla
            if (selectedSulama && !uniqueSulamalar.some(s => s.id === selectedSulama)) {
                setSelectedSulama('');
            }
            
            return uniqueSulamalar;
            
        } catch (error) {
            console.error('Mevcut sulama sistemleri yüklenirken hata:', error);
            setAvailableSulamalar([]);
            return [];
        }
    };

    // Yıl değiştirme fonksiyonu
    const handleYearChange = async (yil) => {
        setSelectedYear(yil);
        setSelectedSulama(''); // Yıl değiştiğinde sulama seçimini sıfırla
        setSorguSonucu([]);
        setTableData([]);
        setResults({});
        
        // Token kontrolü yap
        if (!token) {
            showErrorToast('Oturum süresi dolmuş, lütfen tekrar giriş yapın');
            return;
        }
        
        // O yıla ait sulama sistemlerini yükle
        await loadAvailableSulamalar(yil);
    };

    // Sulama  değiştirme fonksiyonu
    const handleSulamaChange = (sulamaId) => {
        setSelectedSulama(sulamaId.toString()); // String olarak set et
        if (sulamaId && selectedYear) {
            // Seçilen yıl ve sulamaya göre veri getir
            sorgulaVeriler(selectedYear, sulamaId);
        } else {
            // Sulama seçimi kaldırıldıysa verileri temizle
            setSorguSonucu([]);
            setTableData([]);
            setResults({});
        }
    };

    // Veri sorgulama
    const sorgulaVeriler = async (yil = null, sulamaId = null) => {
        const sorguYili = yil || selectedYear;
        const sorguSulama = sulamaId || selectedSulama;
        
        if (!sorguYili) {
            showErrorToast('Lütfen bir yıl seçin');
            return;
        }

        if (!sorguSulama) {
            showErrorToast('Lütfen bir sulama seçin');
            return;
        }

        console.log('🔍 Veri sorgulama başlatılıyor:', { sorguYili, sorguSulama, token: !!token });
        setQueryLoading(true);

        try {
            const params = { yil: sorguYili, sulama: sorguSulama };
            console.log('📡 API çağrısı yapılıyor:', params);
            
            const veriler = await sulamaAPI.getYillikTuketim(params);
            console.log('✅ API yanıtı alındı:', veriler);
            
            const kayitlar = Array.isArray(veriler) ? veriler : (veriler.results || []);
            console.log('📊 İşlenen kayıtlar:', kayitlar);

            // Sadece seçilen sulama sisteminin kayıtlarını filtrele
            const filteredKayitlar = kayitlar.filter(kayit => kayit.sulama === parseInt(sorguSulama));

            if (filteredKayitlar.length === 0) {
                showWarningToast(`${sorguYili} yılı için seçilen sulamaya ait veri bulunamadı`);
                setSorguSonucu([]);
                setTableData([]);
                setHesaplamaData({
                    sulama: sorguSulama,
                    kurumAdi: '',
                    yil: sorguYili,
                    ciftlikRandi: "",
                    iletimRandi: ""
                });
                return;
            }

            setSorguSonucu(filteredKayitlar);

            // İlk kaydın bilgilerini form verilerine doldur
            const ilkKayit = filteredKayitlar[0];
            console.log('API Randıman Değerleri:', {
                ciftlik: ilkKayit.ciftlik_randi,
                iletim: ilkKayit.iletim_randi
            });
            setHesaplamaData({
                sulama: ilkKayit.sulama,
                kurumAdi: ilkKayit.sulama_isim || '',
                yil: ilkKayit.yil,
                ciftlikRandi: ilkKayit.ciftlik_randi,
                iletimRandi: ilkKayit.iletim_randi
            });

            // Tablo verilerini hazırla
            const tableRows = [];
            
            filteredKayitlar.forEach((anaKayit, anaIndex) => {
                // Her ana kayıtın ürün detaylarını işle
                if (anaKayit.urun_detaylari && Array.isArray(anaKayit.urun_detaylari)) {
                    anaKayit.urun_detaylari.forEach((detay, detayIndex) => {
                        // Alan zaten hektar cinsinden geliyor
                        const alan_ha = detay.alan || 0;
                        
                        // Aylık UR değerlerini API'den al
                        let urValues = Array(12).fill('0');
                        let toplamUr = 0;
                        
                        if (detay.aylik_ur_degerleri) {
                            const urData = detay.aylik_ur_degerleri;
                            urValues = [
                                urData.ocak || 0,
                                urData.subat || 0,
                                urData.mart || 0,
                                urData.nisan || 0,
                                urData.mayis || 0,
                                urData.haziran || 0,
                                urData.temmuz || 0,
                                urData.agustos || 0,
                                urData.eylul || 0,
                                urData.ekim || 0,
                                urData.kasim || 0,
                                urData.aralik || 0
                            ];
                            toplamUr = urValues.reduce((sum, val) => sum + parseFloat(val || 0), 0);
                        }

                        tableRows.push({
                            id: detay.id || `${anaIndex}_${detayIndex}`,
                            urun: detay.urun,
                            urun_isim: detay.urun_isim,
                            ekim_alani: alan_ha.toFixed(2),
                            ekim_orani: detay.ekim_orani || '', // Hesaplanacak
                            ur_values: urValues,
                            toplam_ur: toplamUr,
                            su_tuketimi: detay.su_tuketimi || 0
                        });
                    });
                }
            });

            setTableData(tableRows);
            
            // Oranları hesapla - API'den gelen randıman değerleriyle
            calculatePercentages(tableRows, ilkKayit.ciftlik_randi, ilkKayit.iletim_randi);
            
            // Toplam ürün sayısını hesapla
            const toplamUrunSayisi = filteredKayitlar.reduce((toplam, anaKayit) => {
                return toplam + (anaKayit.urun_detaylari ? anaKayit.urun_detaylari.length : 0);
            }, 0);
            
            const selectedSulamaName = availableSulamalar.find(s => s.id === parseInt(sorguSulama))?.isim || 'Seçilen Sulama';
            showSuccessToast(`${selectedSulamaName} - ${sorguYili} yılı için ${toplamUrunSayisi} ürün verisi yüklendi`);

        } catch (error) {
            console.error('Sorgu hatası:', error);
            showErrorToast('Veriler sorgulanırken hata oluştu');
            setSorguSonucu([]);
            setTableData([]);
        } finally {
            setQueryLoading(false);
        }
    };

    // Yüzdeleri hesapla
    const calculatePercentages = (data, ciftlikRandi = null, iletimRandi = null) => {
        const totalArea = data.reduce((sum, row) => sum + parseFloat(row.ekim_alani || 0), 0);
        
        if (totalArea > 0) {
            const updatedData = data.map(row => ({
                ...row,
                ekim_orani: totalArea > 0 ? ((parseFloat(row.ekim_alani || 0) / totalArea) * 100).toFixed(1) : '0'
            }));
            setTableData(updatedData);
            calculateResults(updatedData, ciftlikRandi, iletimRandi);
        }
    };

    // Sonuçları hesapla (hesaplama sayfasındaki doğru formüllerle)
    const calculateResults = (data, apiCiftlikRandi = null, apiIletimRandi = null) => {
        const aylik_toplamlari = Array(12).fill(0);
        const net_su_aylik = Array(12).fill(0); // NET SU İHTİYACI için ayrı hesaplama
        let toplam_alan = 0;
        let toplam_oran = 0;

        // Sadece dolu satırları hesaba kat (ürün seçilmiş ve alan girilmiş)
        const validRows = data.filter(row => 
            row.urun && row.ekim_alani && parseFloat(row.ekim_alani) > 0
        );

        validRows.forEach(row => {
            const alan = parseFloat(row.ekim_alani || 0);
            const oran = parseFloat(row.ekim_orani || 0) / 100;
            
            toplam_alan += alan;
            toplam_oran += parseFloat(row.ekim_orani || 0);

            // İki farklı hesaplama:
            // 1. TOPLAM (UR×ORAN) - Mevcut mantık
            // 2. NET SU İHTİYACI - Alan × Backend değeri ÷ 100000
            row.ur_values.forEach((urValue, monthIndex) => {
                // TOPLAM (UR×ORAN) hesaplama
                const urOranCarpimi = parseFloat(urValue || 0) * oran;
                aylik_toplamlari[monthIndex] += urOranCarpimi;
                
                // NET SU İHTİYACI hesaplama: Alan × O ayın UR değeri ÷ 100000
                const netSuDegeri = (alan * parseFloat(urValue || 0)) / 100000;
                net_su_aylik[monthIndex] += netSuDegeri;
            });
        });

        const net_su_toplam = net_su_aylik.reduce((sum, val) => sum + val, 0);
        
        // Çiftlik su ihtiyacı - Formül: net_su × 100 ÷ çiftlik_randımanı
        // API'den gelen değerleri öncelikle kullan, yoksa state'den al, son çare default
        const ciftlikRandi = apiCiftlikRandi || parseFloat(hesaplamaData.ciftlikRandi) || 80;
        const iletimRandi = apiIletimRandi || parseFloat(hesaplamaData.iletimRandi) || 85;
        
        console.log('✅ Hesaplama Randımanları - Çiftlik:', ciftlikRandi, 'İletim:', iletimRandi);
        
        const ciftlik_su_aylik = net_su_aylik.map(val => (val * 100) / ciftlikRandi);
        const ciftlik_su_toplam = ciftlik_su_aylik.reduce((sum, val) => sum + val, 0);
        
        // Brüt su ihtiyacı - Formül: çiftlik_su × 100 ÷ iletim_randımanı
        const brut_su_aylik = ciftlik_su_aylik.map(val => (val * 100) / iletimRandi);
        const brut_su_toplam = brut_su_aylik.reduce((sum, val) => sum + val, 0);

        // NET SU İHTİYACI zaten hm³ cinsinden (÷100000 ile hesaplandı)
        const net_su_aylik_hm3 = net_su_aylik.map(val => val);
        const net_su_toplam_hm3 = net_su_toplam;
        
        // ÇİFTLİK SU İHTİYACI da zaten hm³ cinsinden (NET SU'dan hesaplandığı için)
        const ciftlik_su_aylik_hm3 = ciftlik_su_aylik.map(val => val);
        const ciftlik_su_toplam_hm3 = ciftlik_su_toplam;
        
        // BRÜT SU İHTİYACI da zaten hm³ cinsinden (ÇİFTLİK SU'dan hesaplandığı için)
        const brut_su_aylik_hm3 = brut_su_aylik.map(val => val);
        const brut_su_toplam_hm3 = brut_su_toplam;

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

    // exportToExcelWithTemplate fonksiyonunu çağır
    const exportToExcel = () => {
        if (tableData.length === 0) {
            showErrorToast('Aktarılacak veri bulunamadı');
            return;
        }
        
        // Hesaplama sayfasında kullanılan parametrelerle aynı şekilde gönderiyoruz
        exportToExcelWithTemplate({
            formData: {
                sulama: `${hesaplamaData.yil} - ${hesaplamaData.kurumAdi || hesaplamaData.sulama}`,
                kurumAdi: hesaplamaData.kurumAdi,
                yil: hesaplamaData.yil,
                ciftlikRandi: hesaplamaData.ciftlikRandi,
                iletimRandi: hesaplamaData.iletimRandi
            },
            tableData,
            results,
            urunler: tableData.map(x => ({
                id: x.urun,
                isim: x.urun_isim
            }))
        })
        .then(() => showSuccessToast('Excel dosyası indiriliyor...'))
        .catch(err => showErrorToast('Excel aktarımında hata: ' + err.message));
    };

    // Tek seferlik yükleme için ref kullan
    const hasInitiallyLoaded = useRef(false);

    // Sayfa yüklendiğinde güncel yıla otomatik istek at
    useEffect(() => {
        if (token && !hasInitiallyLoaded.current) {
            hasInitiallyLoaded.current = true;
            console.log('🚀 İlk yükleme - Güncel yıla sulama sistemlerini yüklüyor:', currentYear);
            // Güncel yıla ait sulama sistemlerini yükle
            loadAvailableSulamalar(currentYear);
        }
    }, [token]);

    // Token yoksa uyarı göster
    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl border border-red-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-red-900 mb-2">Oturum Gerekli</h3>
                    <p className="text-red-600 mb-4">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p>
                    <button 
                        onClick={() => window.location.href = '/login'}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Giriş Yap
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50  from-green-50 to-teal-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Başlık */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-green-900 mb-4">Genel Sulama Planlaması</h1>
                   
                </div>

                {/* Yıl Seçim Butonları */}
                <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6 mb-8">
                    <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-green-900">Yıl Seçimi</h2>
                        {queryLoading && (
                            <div className="ml-4 flex items-center text-green-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                <span className="text-sm">Yükleniyor...</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 xl:grid-cols-14 gap-2">
                        {yillar.map(yil => (
                            <button
                                key={yil}
                                onClick={() => handleYearChange(yil)}
                                disabled={queryLoading}
                                className={`
                                    px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${selectedYear === yil 
                                        ? 'bg-green-600 text-white shadow-lg transform scale-105' 
                                        : 'bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 hover:shadow-md'
                                    }
                                `}
                            >
                                {yil}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sulama Seçimi */}
                {availableSulamalar.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6 mb-8">
                        <div className="flex items-center mb-6">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-green-900">
                                Sulama Seçimi ({availableSulamalar.length} sistem mevcut)
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {availableSulamalar.map(sulama => (
                                <button
                                    key={sulama.id}
                                    onClick={() => handleSulamaChange(sulama.id)}
                                    className={`
                                        p-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 transform hover:scale-105 hover:shadow-lg
                                        ${selectedSulama === sulama.id.toString()
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-700 shadow-lg scale-105'
                                            : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-center">
                                        <div className={`w-3 h-3 rounded-full mr-3 ${
                                            selectedSulama === sulama.id.toString() ? 'bg-white' : 'bg-blue-500'
                                        }`}></div>
                                        <span className="text-center leading-tight">{sulama.isim}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Kayıtlı Hesaplama Bilgileri Kartı */}
                {hesaplamaData.yil && (
                    <div className="bg-white rounded-xl shadow-lg border border-green-200 p-8 mb-8">
                        <div className="flex items-center mb-6">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-green-900">Kayıtlı Hesaplama Bilgileri</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {/* Sulama */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <label className="block text-sm font-semibold text-green-700 mb-2">
                                    Sulama 
                                </label>
                                <div className="text-lg font-bold text-green-900">
                                    {hesaplamaData.kurumAdi || 'Belirtilmemiş'}
                                </div>
                            </div>

                            {/* Yıl */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <label className="block text-sm font-semibold text-green-700 mb-2">
                                    Hesaplama Yılı
                                </label>
                                <div className="text-lg font-bold text-green-900">
                                    {hesaplamaData.yil}
                                </div>
                            </div>

                            {/* Çiftlik Randımanı */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <label className="block text-sm font-semibold text-green-700 mb-2">
                                    Çiftlik Randımanı (%)
                                </label>
                                <div className="text-lg font-bold text-green-900">
                                    {hesaplamaData.ciftlikRandi || 'Belirtilmemiş'}
                                </div>
                            </div>

                            {/* İletim Randımanı */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <label className="block text-sm font-semibold text-green-700 mb-2">
                                    İletim Randımanı (%)
                                </label>
                                <div className="text-lg font-bold text-green-900">
                                    {hesaplamaData.iletimRandi || 'Belirtilmemiş'}
                                </div>
                            </div>
                        </div>

                        {/* Özet Bilgiler */}
                        {tableData.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-green-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{tableData.length}</div>
                                        <div className="text-sm text-green-700">Ürün Çeşidi</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {results.toplam_alan?.toFixed(1) || '0'} ha
                                        </div>
                                        <div className="text-sm text-green-700">Toplam Alan</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {results.net_su_toplam?.toFixed(2) || '0'} hm³
                                        </div>
                                        <div className="text-sm text-green-700">Net Su İhtiyacı</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {results.brut_su_toplam?.toFixed(2) || '0'} hm³
                                        </div>
                                        <div className="text-sm text-green-700">Brüt Su İhtiyacı</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Hesaplama Tablosu */}
                {tableData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-green-200 p-4 sm:p-8 mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-4">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-green-900">Kayıtlı Hesaplama Detayları ({tableData.length} ürün)</h2>
                            </div>
                            <button
                                onClick={exportToExcel}
                                className="px-6 py-3 border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-all duration-200 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Excel'e Aktar
                            </button>
                        </div>

                        {/* Responsive Tablo Container */}
                        <div className="w-full">
                            {/* Mobile ve Tablet için Uyarı */}
                            <div className="lg:hidden mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-green-700 font-medium">
                                        En iyi deneyim için tabloya yatay kaydırarak erişebilirsiniz
                                    </span>
                                </div>
                            </div>

                            {/* Tablo Container - Horizontal Scroll */}
                            <div className="overflow-x-auto rounded-lg border border-green-200 shadow-inner bg-gradient-to-r from-green-50 to-teal-50">
                                <div className="min-w-[1400px]">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-green-600 to-green-700 sticky top-0 z-30">
                                            <tr>
                                                <th className="sticky left-0 z-40 px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r-2 border-green-400 bg-green-700" style={{width: '356px'}}>
                                                    <div className="flex">
                                                        <div className="w-[180px] text-left">Bitki Türü</div>
                                                        <div className="w-24 text-center border-l border-green-400 pl-2">Alan<br/><span className="text-xs opacity-90">(ha)</span></div>
                                                        <div className="w-20 text-center border-l border-green-400 pl-2">Oran<br/><span className="text-xs opacity-90">(%)</span></div>
                                                    </div>
                                                </th>
                                                {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'].map(month => (
                                                    <th key={month} className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-green-500 w-20">
                                                        {month}
                                                    </th>
                                                ))}
                                                <th className="sticky right-0 z-40 px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-l-2 border-green-400 bg-green-700 w-20">
                                                    Toplam
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-green-100">
                                            {tableData.map((row, index) => (
                                                <React.Fragment key={row.id}>
                                                    {/* Ana Satır */}
                                                    <tr className="hover:bg-green-50 transition-colors duration-150">
                                                        {/* İlk 3 Kolon - Sticky */}
                                                        <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-green-200 bg-white hover:bg-green-50 transition-colors duration-150" style={{width: '356px'}}>
                                                            <div className="flex items-center">
                                                                {/* Bitki Türü */}
                                                                <div className="w-[180px] pr-2">
                                                                    <span className="text-sm font-medium text-green-900 bg-green-100 px-3 py-2 rounded border">
                                                                        {row.urun_isim || 'N/A'}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Alan */}
                                                                <div className="w-24 px-1 border-l border-green-200 text-center">
                                                                    <span className="text-sm font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">
                                                                        {row.ekim_alani}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Oran */}
                                                                <div className="w-20 px-1 border-l border-green-200 text-center">
                                                                    <span className="text-sm font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">
                                                                        {row.ekim_orani}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* UR Değerleri - Sadece Gösterim */}
                                                        {row.ur_values.map((urValue, monthIndex) => (
                                                            <td key={monthIndex} className="px-2 py-3 border-r border-green-100 w-20 text-center">
                                                                <span className="text-sm font-medium text-green-800 bg-green-50 px-2 py-1 rounded border">
                                                                    {parseFloat(urValue || 0).toFixed(2)}
                                                                </span>
                                                            </td>
                                                        ))}

                                                        {/* Toplam - Sticky Right */}
                                                        <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-green-200 bg-white hover:bg-green-50 transition-colors duration-150">
                                                            <span className="text-sm font-bold text-green-800 bg-green-100 px-2 py-1 rounded">
                                                                {row.toplam_ur.toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>

                                                    {/* U-R x Oran Satırı */}
                                                    <tr className="bg-gray-50 text-gray-700 text-xs">
                                                        <td className="sticky left-0 z-30 px-3 py-2 text-right font-medium border-r-2 border-green-200 bg-gray-50" style={{width: '356px'}}>
                                                            u-r × oran
                                                        </td>
                                                        {/* UR x Oran değerleri */}
                                                        {row.ur_values.map((urValue, monthIndex) => {
                                                            const oran = parseFloat(row.ekim_orani || 0) / 100;
                                                            const urOranCarpimi = (parseFloat(urValue || 0) * oran).toFixed(2);
                                                            return (
                                                                <td key={monthIndex} className="px-2 py-2 text-center border-r border-green-100 w-20">
                                                                    <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-800 text-xs">
                                                                        {urOranCarpimi}
                                                                    </span>
                                                                </td>
                                                            );
                                                        })}
                                                        {/* Toplam UR x Oran - Sticky Right */}
                                                        <td className="sticky right-0 z-30 px-2 py-2 text-center border-l-2 border-green-200 bg-gray-50">
                                                            <span className="bg-green-100 px-2 py-0.5 rounded text-green-800 font-medium">
                                                                {((parseFloat(row.toplam_ur) * parseFloat(row.ekim_orani || 0)) / 100).toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}

                                            {/* Sonuç Satırları */}
                                            <tr className="bg-gradient-to-r from-blue-100 to-blue-200 font-bold text-sm">
                                                <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-blue-300 text-blue-900 bg-blue-100" style={{width: '356px'}}>
                                                    <div className="flex items-center">
                                                        <div className="w-[180px]">TOPLAM ALAN</div>
                                                        <div className="w-24 text-center border-l border-blue-300 pl-2">{results.toplam_alan?.toFixed(2) || '0'}</div>
                                                        <div className="w-20 text-center border-l border-blue-300 pl-2">{results.toplam_oran?.toFixed(1) || '0'}%</div>
                                                    </div>
                                                </td>
                                                {results.aylik_toplamlari?.map((total, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-blue-200 text-blue-900 w-20">
                                                        {total.toFixed(2)}
                                                    </td>
                                                )) || Array(12).fill(0).map((_, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-blue-200 text-blue-900 w-20">0.00</td>
                                                ))}
                                                <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-blue-300 text-blue-900 bg-blue-100">
                                                    {results.aylik_toplamlari?.reduce((sum, val) => sum + val, 0).toFixed(2) || '0.00'}
                                                </td>
                                            </tr>

                                            <tr className="bg-gradient-to-r from-green-100 to-green-200 font-bold text-sm">
                                                <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-green-300 text-green-900 bg-green-100" style={{width: '356px'}}>
                                                    NET SU İHTİYACI (hm³)
                                                </td>
                                                {results.net_su_aylik?.map((total, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-green-200 text-green-900 w-20">
                                                        {total.toFixed(3)}
                                                    </td>
                                                )) || Array(12).fill(0).map((_, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-green-200 text-green-900 w-20">0.000</td>
                                                ))}
                                                <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-green-300 text-green-900 bg-green-100">
                                                    {results.net_su_toplam?.toFixed(3) || '0.000'}
                                                </td>
                                            </tr>

                                            <tr className="bg-gradient-to-r from-yellow-100 to-yellow-200 font-bold text-sm">
                                                <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-yellow-300 text-yellow-900 bg-yellow-100" style={{width: '356px'}}>
                                                    ÇİFTLİK SU İHTİYACI (hm³)
                                                </td>
                                                {results.ciftlik_su_aylik?.map((total, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-yellow-200 text-yellow-900 w-20">
                                                        {total.toFixed(3)}
                                                    </td>
                                                )) || Array(12).fill(0).map((_, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-yellow-200 text-yellow-900 w-20">0.000</td>
                                                ))}
                                                <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-yellow-300 text-yellow-900 bg-yellow-100">
                                                    {results.ciftlik_su_toplam?.toFixed(3) || '0.000'}
                                                </td>
                                            </tr>

                                            <tr className="bg-gradient-to-r from-red-100 to-red-200 font-bold text-sm">
                                                <td className="sticky left-0 z-30 px-3 py-3 border-r-2 border-red-300 text-red-900 bg-red-100" style={{width: '356px'}}>
                                                    BRÜT SU İHTİYACI (hm³)
                                                </td>
                                                {results.brut_su_aylik?.map((total, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-red-200 text-red-900 w-20">
                                                        {total.toFixed(3)}
                                                    </td>
                                                )) || Array(12).fill(0).map((_, index) => (
                                                    <td key={index} className="px-2 py-3 text-center text-sm border-r border-red-200 text-red-900 w-20">0.000</td>
                                                ))}
                                                <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-red-300 text-red-900 bg-red-100">
                                                    {results.brut_su_toplam?.toFixed(3) || '0.000'}
                                                </td>
                                            </tr>

                                            {/* Toplam Sulama Suyu İhtiyacı */}
                                            <tr className="bg-gradient-to-r from-purple-100 to-purple-200 font-bold text-sm">
                                                <td className="sticky left-0 z-30 px-3 py-3 text-center border-r-2 border-purple-300 text-purple-900 bg-purple-100" style={{width: '356px'}}>
                                                    TOPLAM SULAMA SUYU İHTİYACI (hm³)
                                                </td>
                                                {/* Boş aylik sütunlar */}
                                                {Array(12).fill(0).map((_, index) => (
                                                    <td key={index} className="px-2 py-3 w-20"></td>
                                                ))}
                                                <td className="sticky right-0 z-30 px-2 py-3 text-center border-l-2 border-purple-300 text-purple-900 bg-purple-100 text-sm">
                                                    {results.brut_su_toplam?.toFixed(3) || '0.000'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Veri Bulunamadı Mesajı */}
                {!queryLoading && selectedYear && selectedSulama && tableData.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-yellow-800 mb-2">Seçime Ait Veri Bulunamadı</h3>
                        <p className="text-yellow-700">
                            {selectedYear} yılı - {availableSulamalar.find(s => s.id === parseInt(selectedSulama))?.isim} için 
                            henüz sulama hesaplama verisi kaydedilmemiş.
                        </p>
                    </div>
                )}

                {/* Henüz Seçim Yapılmamış Mesajı */}
                {selectedYear && availableSulamalar.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-blue-800 mb-2">{selectedYear} Yılına Ait Sulama Bulunamadı</h3>
                        <p className="text-blue-700">
                            Bu yıl için henüz sulama hesaplama verisi kaydedilmemiş. 
                            Lütfen farklı bir yıl seçin veya önce hesaplama sayfasından veri kaydedin.
                        </p>
                    </div>
                )}

                {/* Henüz Yıl Seçilmemişse */}
                {!selectedYear && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Lütfen Yıl Seçin</h3>
                        <p className="text-gray-700">
                            Kayıtlı sulama hesaplamalarını görüntülemek için önce bir yıl seçin.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}