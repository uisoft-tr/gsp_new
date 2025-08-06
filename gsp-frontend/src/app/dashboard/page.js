'use client';

import React, { useState, useEffect } from 'react';
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
    ResponsiveContainer
} from 'recharts';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function DashboardPage() {
    const { token } = useAuth();
    const { success: showSuccessToast, error: showErrorToast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(6); // Haziran (veri olan ay)
    const [depolamaTesisleri, setDepolamaTesisleri] = useState([]);
    const [selectedTesis, setSelectedTesis] = useState(''); // Boş string = Tümü
    const [viewMode, setViewMode] = useState('toplam'); // 'toplam' veya 'tesis'
    
    const currentYear = new Date().getFullYear();
    
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

    // Depolama tesislerini yükle
    const loadDepolamaTesisleri = async () => {
        try {
            console.log('🔍 Loading depolama tesisleri...');
            console.log('🔑 Token:', token ? `${token.substring(0, 10)}...` : 'No token');
            
            const response = await fetch(`${API_BASE_URL}/api/sulama/depolama-tesisleri/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('📡 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Depolama tesisleri loaded:', data);
                setDepolamaTesisleri(data.results || data);
            } else {
                const errorText = await response.text();
                console.error('❌ API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
        } catch (error) {
            console.error('Depolama tesisleri yüklenirken hata:', error);
            showErrorToast('Depolama tesisleri yüklenemedi: ' + error.message);
        }
    };

    // Dashboard verilerini yükle
    const loadDashboardData = async () => {
        setDataLoading(true);
        try {
            const params = { yil: currentYear };
            
            // Eğer tesis seçiliyse parametreye ekle
            if (selectedTesis && viewMode === 'tesis') {
                params.depolama_tesisi = selectedTesis;
            }
            
            const searchParams = new URLSearchParams(params);
            const url = `${API_BASE_URL}/api/sulama/dashboard/aylik_su_kullanimi/?${searchParams.toString()}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setDashboardData(data);
                console.log('Dashboard data:', data);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Dashboard verileri yüklenirken hata:', error);
            showErrorToast('Dashboard verileri yüklenemedi: ' + error.message);
            setDashboardData(null);
        } finally {
            setDataLoading(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('🔄 Dashboard useEffect triggered');
        console.log('🔑 Token in dashboard:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
        console.log('💾 localStorage token:', typeof window !== 'undefined' ? localStorage.getItem('authToken')?.substring(0, 20) + '...' : 'NO WINDOW');
        
        if (token) {
            console.log('✅ Token exists, loading data...');
            loadDepolamaTesisleri();
            loadDashboardData();
        } else {
            console.log('❌ No token, cannot load data');
        }
    }, [token]);

    // Tesis seçimi veya görünüm modu değiştiğinde verileri yeniden yükle
    useEffect(() => {
        if (token) {
            loadDashboardData();
        }
    }, [selectedTesis, viewMode]);

    // Su miktarını formatla (tam sayı)
    const formatSuMiktari = (miktar) => {
        if (!miktar || miktar === 0) return '0 m³';
        return Math.round(miktar).toLocaleString() + ' m³';
    };

    // Recharts için veri formatı
    const getChartData = () => {
        if (!dashboardData?.aylik_veriler) return [];
        
        return dashboardData.aylik_veriler.map(veri => ({
            ay: veri.ay.substring(0, 3),
            ay_no: veri.ay_no,
            'Şebekeye Verilen Su': veri.sebeke_su,
            'Depolama Tesisi Kapasitesi': veri.depolama_su,
            'Planlanan Su İhtiyacı': veri.tuketim_su, // Backend'den zaten m³ cinsinden geliyor
            sebeke_kayit: veri.sebeke_kayit_sayisi,
            depolama_kayit: veri.depolama_kayit_sayisi,
            tuketim_kayit: veri.tuketim_kayit_sayisi
        }));
    };

    // Custom tooltip için
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center text-sm">
                            <div 
                                className="w-3 h-3 rounded mr-2" 
                                style={{ backgroundColor: entry.color }}
                            ></div>
                            <span className="text-gray-700">
                                {entry.name}: {formatSuMiktari(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Bar tıklama eventi
    const handleBarClick = (data) => {
        if (data?.ay_no) {
            setSelectedMonth(data.ay_no);
        }
    };

    // Seçili ayın verilerini getir
    const getSelectedMonthData = () => {
        if (!dashboardData?.aylik_veriler) return null;
        return dashboardData.aylik_veriler.find(veri => veri.ay_no === selectedMonth);
    };

    // Su bitme analizi
    const getSuBitmeAnalizi = () => {
        if (!dashboardData?.aylik_veriler || !dashboardData?.istatistikler) return null;

        const guncelAy = dashboardData.istatistikler.guncel_ay;
        const guncelDepoMiktari = dashboardData.istatistikler.guncel_depo_miktari;
        
        // Güncel aydan sonraki ayları analiz et
        let kalanSu = guncelDepoMiktari;
        let bitecekAy = null;
        let ayDetaylar = [];

        for (let i = guncelAy; i <= 12; i++) {
            const ayVeri = dashboardData.aylik_veriler.find(v => v.ay_no === i);
            if (!ayVeri) continue;

            // Şebeke su = depodan ÇIKAN su (sadece bu çıkarılacak)
            // İhtiyaç = planlanan tüketim (çıkarılmayacak, sadece bilgi amaçlı)
            const sebekeSu = ayVeri.sebeke_su || 0;
            const ihtiyac = ayVeri.tuketim_su || 0;
            const toplamCikan = sebekeSu; // Sadece şebeke suyu çıkarılacak
            const netDegisim = -toplamCikan; // Negatif çünkü su azalıyor
            
            // Ayın son seviyesi = Başlangıç + Net değişim
            kalanSu += netDegisim;
            
            ayDetaylar.push({
                ay_no: i,
                ay: ayVeri.ay,
                sebeke_su: sebekeSu,
                ihtiyac: ihtiyac,
                toplam_cikan: toplamCikan,
                net_degisim: netDegisim,
                kalan_su: kalanSu
            });

            // Su negatife düştüyse bu ayda bitiyor
            if (kalanSu <= 0 && !bitecekAy) {
                bitecekAy = {
                    ay_no: i,
                    ay: ayVeri.ay,
                    eksik_miktar: Math.abs(kalanSu)
                };
                break;
            }
        }

        return {
            guncel_depo: guncelDepoMiktari,
            bitecek_ay: bitecekAy,
            ay_detaylar: ayDetaylar,
            yil_sonu_durumu: kalanSu > 0 ? 'yeterli' : 'yetersiz',
            yil_sonu_miktar: kalanSu
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <h3 className="mt-6 text-xl font-semibold text-blue-900">Dashboard Yükleniyor...</h3>
                    <p className="mt-2 text-blue-600">Su kullanım verileri hazırlanıyor</p>
                </div>
            </div>
        );
    }

    const selectedMonthData = getSelectedMonthData();
    const suBitmeAnalizi = getSuBitmeAnalizi();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Ay Seçim Butonları */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Ay Seçimi - {currentYear}</h2>
                    </div>
                    
                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                        {months.map((month) => (
                            <button
                                key={month.no}
                                onClick={() => setSelectedMonth(month.no)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    selectedMonth === month.no
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                                }`}
                            >
                                {month.short}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Görünüm Modu ve Depolama Tesisi Seçimi */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Görünüm Seçenekleri</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Görünüm Modu */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Görünüm Modu
                            </label>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setViewMode('toplam')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        viewMode === 'toplam'
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    📊 Toplam
                                </button>
                                <button
                                    onClick={() => setViewMode('tesis')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        viewMode === 'tesis'
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    🏭 Depolama Tesisi Bazlı
                                </button>
                            </div>
                        </div>

                        {/* Depolama Tesisi Seçimi */}
                        {viewMode === 'tesis' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Depolama Tesisi
                                </label>
                                <select
                                    value={selectedTesis}
                                    onChange={(e) => setSelectedTesis(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                >
                                    <option value="">Tüm Depolama Tesisleri</option>
                                    {depolamaTesisleri.map(tesis => (
                                        <option key={tesis.id} value={tesis.id}>
                                            {tesis.isim} ({tesis.sulama_display})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Seçili Tesis Bilgisi */}
                    {viewMode === 'tesis' && selectedTesis && (
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium text-purple-700">
                                    Seçili Tesis: {depolamaTesisleri.find(t => t.id == selectedTesis)?.isim}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            
                {/* Seçili Ay İstatistikleri */}
                {selectedMonthData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Şebeke Su */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">
                                        {months.find(m => m.no === selectedMonth)?.name} - Şebekeye Verilen Su
                                    </p>
                                    <p className="text-3xl font-bold mt-2">
                                        {formatSuMiktari(selectedMonthData.sebeke_su)}
                                    </p>
                                    <p className="text-blue-100 text-sm mt-1">
                                        {selectedMonthData.sebeke_kayit_sayisi} kayıt
                                    </p>
                                </div>
                                <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Depolama Tesisi */}
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">
                                        {months.find(m => m.no === selectedMonth)?.name} - Depolama Tesisi Kapasitesi
                                    </p>
                                    <p className="text-3xl font-bold mt-2">
                                        {formatSuMiktari(selectedMonthData.depolama_su)}
                                    </p>
                                    <p className="text-green-100 text-sm mt-1">
                                        {selectedMonthData.depolama_kayit_sayisi} kayıt
                                    </p>
                                </div>
                                <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Tüketim Su */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">
                                        {months.find(m => m.no === selectedMonth)?.name} - Planlanan Su İhtiyacı
                                    </p>
                                    <p className="text-3xl font-bold mt-2">
                                        {formatSuMiktari(selectedMonthData.tuketim_su)}
                                    </p>
                                    <p className="text-purple-100 text-sm mt-1">
                                        {selectedMonthData.tuketim_kayit_sayisi} kayıt
                                    </p>
                                </div>
                                <div className="w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Yıllık Grafik */}
                {dashboardData && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                        <div className="flex items-center mb-6">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {viewMode === 'tesis' && selectedTesis 
                                        ? `${depolamaTesisleri.find(t => t.id == selectedTesis)?.isim} - Su Kullanım Karşılaştırması`
                                        : 'Yıllık Su Kullanım Karşılaştırması'
                                    }
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {viewMode === 'toplam' ? 'Tüm depolama tesisleri toplamı' : 
                                     selectedTesis ? 'Seçili depolama tesisi verileri' : 'Tüm depolama tesisleri'}
                                </p>
                            </div>
                        </div>

                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={getChartData()}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                    onClick={handleBarClick}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="ay" 
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
                                        dataKey="Şebekeye Verilen Su" 
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        cursor="pointer"
                                    />
                                    <Bar 
                                        dataKey="Depolama Tesisi Kapasitesi" 
                                        fill="#10b981"
                                        radius={[4, 4, 0, 0]}
                                        cursor="pointer"
                                    />
                                    <Bar 
                                        dataKey="Planlanan Su İhtiyacı" 
                                        fill="#8b5cf6"
                                        radius={[4, 4, 0, 0]}
                                        cursor="pointer"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Su Yeterlilik Analizi */}
                {dashboardData?.istatistikler && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                        <div className="flex items-center mb-6">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Su Yeterlilik Analizi</h2>
                            <div className="ml-auto">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    dashboardData.istatistikler.yeterlilik_durumu === 'Yeterli' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {dashboardData.istatistikler.yeterlilik_durumu}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Güncel Depo Durumu */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">
                                        Güncel Depo Miktarı ({months.find(m => m.no === dashboardData.istatistikler.guncel_ay)?.name})
                                    </span>
                                </div>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatSuMiktari(dashboardData.istatistikler.guncel_depo_miktari)}
                                </p>
                            </div>

                            {/* Gelecek İhtiyaç */}
                            <div className="bg-orange-50 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Kalan Aylardaki İhtiyaç</span>
                                </div>
                                <p className="text-2xl font-bold text-orange-600">
                                    {formatSuMiktari(dashboardData.istatistikler.gelecek_ihtiyac)}
                                </p>
                            </div>

                            {/* Yeterlilik Oranı */}
                            <div className="bg-purple-50 rounded-lg p-4">
                                <div className="flex items-center mb-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Yeterlilik Oranı</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-600">
                                    %{dashboardData.istatistikler.yeterlilik_orani}
                                </p>
                            </div>

                            {/* Durum Göstergesi */}
                            <div className={`rounded-lg p-4 ${
                                dashboardData.istatistikler.yeterlilik_durumu === 'Yeterli' 
                                    ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                                <div className="flex items-center mb-2">
                                    <div className={`w-3 h-3 rounded-full mr-2 ${
                                        dashboardData.istatistikler.yeterlilik_durumu === 'Yeterli' 
                                            ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                    <span className="text-sm font-medium text-gray-700">Durum</span>
                                </div>
                                <p className={`text-lg font-bold ${
                                    dashboardData.istatistikler.yeterlilik_durumu === 'Yeterli' 
                                        ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {dashboardData.istatistikler.yeterlilik_durumu === 'Yeterli' 
                                        ? '✅ Yeterli' : '⚠️ Yetersiz'}
                                </p>
                            </div>
                        </div>

                        {/* Su Bitme Analizi */}
                        {suBitmeAnalizi && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <h4 className="text-sm font-medium text-yellow-800">
                                            Şebeke Su Hesabı ile Su Bitme Analizi
                                        </h4>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            {suBitmeAnalizi.bitecek_ay ? (
                                                <div className="space-y-1">
                                                    <p>
                                                        <span className="font-semibold text-red-600">⚠️ Kritik:</span> 
                                                        Mevcut şebeke su giriş oranına göre su <strong>{suBitmeAnalizi.bitecek_ay.ay}</strong> ayında bitecek!
                                                    </p>
                                                    <p className="text-xs">
                                                        Eksik miktar: {formatSuMiktari(suBitmeAnalizi.bitecek_ay.eksik_miktar)}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p>
                                                    <span className="font-semibold text-green-600">✅ Güvenli:</span> 
                                                    Mevcut şebeke su giriş oranına göre yıl sonuna kadar su yeterli.
                                                    <span className="text-xs ml-1">
                                                        (Fazla: {formatSuMiktari(suBitmeAnalizi.yil_sonu_miktar)})
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Aylık Su Dengesi Tablosu */}
                        {suBitmeAnalizi?.ay_detaylar && suBitmeAnalizi.ay_detaylar.length > 0 && (
                            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <h5 className="text-sm font-medium text-gray-900">Aylık Su Dengesi</h5>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ay</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Şebeke Su (Çıkan)</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">İhtiyaç (Çıkan)</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Toplam Çıkan</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kalan Depo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {suBitmeAnalizi.ay_detaylar.map((detay, index) => (
                                                <tr key={detay.ay_no} className={detay.kalan_su <= 0 ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{detay.ay}</td>
                                                    <td className="px-3 py-2 text-sm text-orange-600">
                                                        {Math.round(detay.sebeke_su).toLocaleString()} m³
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-purple-600">
                                                        {Math.round(detay.ihtiyac).toLocaleString()} m³
                                                    </td>
                                                    <td className="px-3 py-2 text-sm font-medium text-red-600">
                                                        {Math.round(detay.toplam_cikan).toLocaleString()} m³
                                                    </td>
                                                    <td className={`px-3 py-2 text-sm font-medium ${detay.kalan_su > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {Math.round(detay.kalan_su).toLocaleString()} m³
                                                        {detay.kalan_su <= 0 && ' ⚠️'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Açıklama */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <strong>Analiz:</strong> Güncel ay ({months.find(m => m.no === dashboardData.istatistikler.guncel_ay)?.name}) 
                                depo miktarından başlayarak, her ayın şebeke su çıkışı ve planlanan su ihtiyacı çıkarılarak
                                hangi ayda suyun biteceği hesaplanmıştır.
                                {dashboardData.istatistikler.yeterlilik_durumu === 'Yetersiz' && 
                                    ' Ek su kaynağı planlaması yapılması önerilir.'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                <strong>Hesaplama Mantığı:</strong> 
                                🔵 <span className="text-orange-600 font-medium">Şebeke Su</span> = Depodan şebekeye verilen su (çıkan) • 
                                🟣 <span className="text-purple-600 font-medium">İhtiyaç</span> = Planlanan tarımsal su tüketimi (bilgi amaçlı) • 
                                🔴 <span className="text-red-600 font-medium">Toplam Çıkan</span> = Şebeke su (depodan çıkan) • 
                                🟢 <span className="text-green-600 font-medium">Kalan Depo</span> = Önceki ay - Toplam çıkan
                            </p>
                        </div>
                    </div>
                )}

                {/* Toplam İstatistikler */}
                {dashboardData && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center mb-6">
                            <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {currentYear} Yılı {viewMode === 'tesis' && selectedTesis 
                                    ? `${depolamaTesisleri.find(t => t.id == selectedTesis)?.isim} Tesisi` 
                                    : 'Toplam'} İstatistikler
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Toplam Şebekeye Verilen Su</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-600 mt-2">
                                    {formatSuMiktari(dashboardData.istatistikler?.toplam_sebeke_su || 0)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {dashboardData.istatistikler?.toplam_sebeke_kayit || 0} kayıt
                                </p>
                            </div>

                            <div className="bg-green-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Toplam Depolama Tesisi Kapasitesi</span>
                                </div>
                                <p className="text-2xl font-bold text-green-600 mt-2">
                                    {formatSuMiktari(dashboardData.istatistikler?.toplam_depolama_su || 0)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {dashboardData.istatistikler?.toplam_depolama_kayit || 0} kayıt
                                </p>
                            </div>

                            <div className="bg-purple-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-gray-700">Toplam Planlanan Su İhtiyacı</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-600 mt-2">
                                    {formatSuMiktari(dashboardData.istatistikler?.toplam_tuketim_su || 0)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {dashboardData.istatistikler?.toplam_tuketim_kayit || 0} kayıt
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Veri Bulunamadı */}
                {!dataLoading && !dashboardData && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-yellow-800 mb-2">Veri Bulunamadı</h3>
                        <p className="text-yellow-700">
                            {currentYear} yılına ait su kullanım verisi bulunamadı. 
                            Lütfen veri girişi yapın veya sistem yöneticisi ile iletişime geçin.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
} 