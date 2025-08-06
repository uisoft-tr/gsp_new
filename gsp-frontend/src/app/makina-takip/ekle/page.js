'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Leaflet haritasını dinamik olarak yükle
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(mod => mod.useMapEvents), { ssr: false });

// Harita tıklama handler component'i
function MapClickHandler({ onMapClick }) {
    const map = useMapEvents({
        click: (e) => {
            console.log('MapClickHandler: Harita tıklandı', e.latlng);
            onMapClick(e);
        },
    });
    return null;
}

// Harita tıklama için özel component
function ClickableMap({ onMapClick, selectedPosition, mapType }) {
    const mapRef = useRef(null);
    
    useEffect(() => {
        if (mapRef.current) {
            const map = mapRef.current;
            
            const handleClick = (e) => {
                console.log('🎯 Map clicked via direct event listener:', e.latlng);
                console.log('🎯 Event object:', e);
                onMapClick(e);
            };
            
            // Event listener ekle
            map.on('click', handleClick);
            
            return () => {
                map.off('click', handleClick);
            };
        }
    }, [onMapClick]);
    
    return (
        <MapContainer 
            center={[40.8311, 35.6472]} 
            zoom={12} 
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            onClick={onMapClick} // Direkt onClick prop'u ekle
            key={`map-${mapType}`}
        >
            {mapType === 'satellite' ? (
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri'
                />
            ) : (
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
            )}
            
            {selectedPosition && (
                <Marker position={selectedPosition}>
                    <Popup>
                        <div className="text-center">
                            <p className="font-bold">Seçilen Konum</p>
                            <p className="text-sm">Enlem: {selectedPosition[0].toFixed(6)}</p>
                            <p className="text-sm">Boylam: {selectedPosition[1].toFixed(6)}</p>
                        </div>
                    </Popup>
                </Marker>
            )}
        </MapContainer>
    );
}

export default function MakinaEklePage() {
    const { token } = useAuth();
    const router = useRouter();
    const toast = useToast();
    
    const [sulamaSistemleri, setSulamaSistemleri] = useState([]);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [errors, setErrors] = useState({});
    const [mapType, setMapType] = useState('street'); // 'street', 'satellite' veya 'hybrid'
    const [mapReady, setMapReady] = useState(false);
    
    const [formData, setFormData] = useState({
        birlik_no: '',
        isim: '',
        makina_tipi: 'traktor',
        plaka: '',
        model: '',
        yil: '',
        durum: 'aktif',
        sulama: '',
        aciklama: '',
        enlem: '',
        boylam: '',
        motor_calisma: true
    });

    useEffect(() => {
        loadSulamaSistemleri();
        
        // Leaflet icon sorununu çöz
        if (typeof window !== 'undefined') {
            const L = require('leaflet');
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
            setMapReady(true);
        }
    }, []);

    const loadSulamaSistemleri = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sulama/sulamalar/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSulamaSistemleri(data.results || data || []);
            } else {
                console.error('Sulama sistemleri yüklenemedi:', response.status);
                toast.error('Sulama sistemleri yüklenemedi');
            }
        } catch (error) {
            console.error('Sulama sistemleri yüklenirken hata:', error);
            toast.error('Sulama sistemleri yüklenirken hata oluştu');
        }
    };

    // Form validasyonu
    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.birlik_no.trim()) {
            newErrors.birlik_no = 'Birlik numarası gereklidir';
        }
        
        if (!formData.isim.trim()) {
            newErrors.isim = 'Makina adı gereklidir';
        }
        
        if (formData.yil && (formData.yil < 1900 || formData.yil > new Date().getFullYear() + 1)) {
            newErrors.yil = 'Geçerli bir yıl giriniz';
        }
        
        if (formData.enlem && (formData.enlem < -90 || formData.enlem > 90)) {
            newErrors.enlem = 'Geçerli bir enlem değeri giriniz (-90 ile 90 arası)';
        }
        
        if (formData.boylam && (formData.boylam < -180 || formData.boylam > 180)) {
            newErrors.boylam = 'Geçerli bir boylam değeri giriniz (-180 ile 180 arası)';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Mevcut konumu al
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Tarayıcınız konum servisini desteklemiyor');
            return;
        }
        
        setLocationLoading(true);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setSelectedPosition([latitude, longitude]);
                setFormData(prev => ({
                    ...prev,
                    enlem: latitude.toFixed(6),
                    boylam: longitude.toFixed(6)
                }));
                toast.success('Mevcut konumunuz alındı!');
                setLocationLoading(false);
            },
            (error) => {
                console.error('Konum alınamadı:', error);
                let errorMessage = 'Konum alınamadı';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Konum izni reddedildi';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Konum bilgisi mevcut değil';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Konum alma zaman aşımına uğradı';
                        break;
                }
                
                toast.error(errorMessage);
                setLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    const handleMapClick = (e) => {
        console.log('🎯 Map click event received:', e);
        console.log('🎯 Event type:', typeof e);
        console.log('🎯 Event keys:', Object.keys(e || {}));
        
        if (e && e.latlng) {
            const { lat, lng } = e.latlng;
            console.log('📍 Harita tıklandı:', { lat, lng });
            console.log('📍 Lat type:', typeof lat, 'Lng type:', typeof lng);
            
            // Konum seçildiğinde toast mesajı göster
            toast.success(`Konum seçildi: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            
            setSelectedPosition([lat, lng]);
            setFormData(prev => ({
                ...prev,
                enlem: lat.toFixed(6),
                boylam: lng.toFixed(6)
            }));
            
            // Hata mesajını temizle
            if (errors.enlem || errors.boylam) {
                setErrors(prev => ({
                    ...prev,
                    enlem: null,
                    boylam: null
                }));
            }
        } else if (e && e.target && e.target._latlng) {
            // Alternatif event format
            const { lat, lng } = e.target._latlng;
            console.log('📍 Alternative event format - Harita tıklandı:', { lat, lng });
            
            toast.success(`Konum seçildi: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            
            setSelectedPosition([lat, lng]);
            setFormData(prev => ({
                ...prev,
                enlem: lat.toFixed(6),
                boylam: lng.toFixed(6)
            }));
        } else {
            console.error('❌ Invalid map click event:', e);
            console.error('❌ Event structure:', JSON.stringify(e, null, 2));
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Hata mesajını temizle
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error('Lütfen form hatalarını düzeltin');
            return;
        }
        
        setLoading(true);

        try {
            // Makina verilerini hazırla
            const makinaRequestData = {
                birlik_no: formData.birlik_no.trim(),
                isim: formData.isim.trim(),
                makina_tipi: formData.makina_tipi,
                plaka: formData.plaka.trim() || '',
                model: formData.model.trim() || '',
                yil: formData.yil ? parseInt(formData.yil) : null,
                durum: formData.durum,
                sulama: formData.sulama || null,
                aciklama: formData.aciklama.trim() || ''
            };

            console.log('Gönderilecek makina verisi:', makinaRequestData);

            // Önce makina kaydını oluştur
            const makinaResponse = await fetch(`${API_BASE_URL}/api/sulama/makinalar/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(makinaRequestData)
            });

            if (!makinaResponse.ok) {
                const errorData = await makinaResponse.json();
                console.error('Makina API hatası:', errorData);
                throw new Error(`Makina kaydı oluşturulamadı: ${errorData.error || errorData.detail || makinaResponse.statusText}`);
            }

            const makinaData = await makinaResponse.json();
            const makinaId = makinaData.id;

            // Sonra konum kaydını oluştur
            if (formData.enlem && formData.boylam) {
                const konumResponse = await fetch(`${API_BASE_URL}/api/sulama/makina-konumlar/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        makina: makinaId,
                        enlem: parseFloat(formData.enlem),
                        boylam: parseFloat(formData.boylam),
                        motor_calisma: formData.motor_calisma
                    })
                });

                if (!konumResponse.ok) {
                    console.warn('Konum kaydı oluşturulamadı');
                }
            }

            toast.success('Makina başarıyla eklendi!');
            router.push('/makina-takip');

        } catch (error) {
            console.error('Makina eklenirken hata:', error);
            toast.error('Makina eklenirken bir hata oluştu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const makinaTipleri = [
        { value: 'traktor', label: 'Traktör', icon: '🚜' },
        { value: 'ekskavator', label: 'Ekskavatör', icon: '🏗️' },
        { value: 'buldozer', label: 'Buldozer', icon: '🚧' },
        { value: 'yukleyici', label: 'Yükleyici', icon: '📦' },
        { value: 'diger', label: 'Diğer', icon: '⚙️' }
    ];

    const durumlar = [
        { value: 'aktif', label: 'Aktif' },
        { value: 'pasif', label: 'Pasif' },
        { value: 'bakim', label: 'Bakımda' },
        { value: 'ariza', label: 'Arızalı' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Başlık */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2">Yeni Makina Ekle</h1>
                                <p className="text-lg text-gray-600">Harita üzerinden konum seçerek makina kaydı oluşturun</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/makina-takip')}
                            className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-semibold shadow-lg flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>Geri Dön</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sticky top-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                Makina Bilgileri
                            </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Birlik No */}
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Birlik No *
                                </label>
                                <input
                                    type="text"
                                    name="birlik_no"
                                    value={formData.birlik_no}
                                    onChange={handleInputChange}
                                    required
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                        errors.birlik_no ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Örn: MAK-001 veya 34 ABC 123-001"
                                />
                                {errors.birlik_no && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {errors.birlik_no}
                                    </p>
                                )}
                            </div>

                            {/* Makina Adı */}
                            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Makina Adı *
                                </label>
                                <input
                                    type="text"
                                    name="isim"
                                    value={formData.isim}
                                    onChange={handleInputChange}
                                    required
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
                                        errors.isim ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Örn: Traktör-001"
                                />
                                {errors.isim && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {errors.isim}
                                    </p>
                                )}
                            </div>

                            {/* Makina Tipi */}
                            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Makina Tipi *
                                </label>
                                <select
                                    name="makina_tipi"
                                    value={formData.makina_tipi}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                >
                                    {makinaTipleri.map(tip => (
                                        <option key={tip.value} value={tip.value}>
                                            {tip.icon} {tip.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Plaka ve Model */}
                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Plaka
                                        </label>
                                        <input
                                            type="text"
                                            name="plaka"
                                            value={formData.plaka}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                            placeholder="34 ABC 123"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Model
                                        </label>
                                        <input
                                            type="text"
                                            name="model"
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                            placeholder="Örn: John Deere 5075E"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Yıl ve Durum */}
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Üretim Yılı
                                        </label>
                                        <input
                                            type="number"
                                            name="yil"
                                            value={formData.yil}
                                            onChange={handleInputChange}
                                            min="1900"
                                            max="2030"
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                                                errors.yil ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="2020"
                                        />
                                        {errors.yil && (
                                            <p className="text-red-500 text-sm mt-2 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {errors.yil}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Durum *
                                        </label>
                                        <select
                                            name="durum"
                                            value={formData.durum}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        >
                                            {durumlar.map(durum => (
                                                <option key={durum.value} value={durum.value}>
                                                    {durum.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Sulama Sistemi */}
                            <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Sulama Sistemi
                                </label>
                                <select
                                    name="sulama"
                                    value={formData.sulama}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                                >
                                    <option value="">Sulama sistemi seçin (opsiyonel)</option>
                                    {sulamaSistemleri.map(sulama => (
                                        <option key={sulama.id} value={sulama.id}>
                                            {sulama.isim}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Makina hangi sulama sisteminde çalışıyorsa seçin
                                </p>
                            </div>

                            {/* Açıklama */}
                            <div className="bg-pink-50 p-6 rounded-xl border border-pink-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Açıklama
                                </label>
                                <textarea
                                    name="aciklama"
                                    value={formData.aciklama}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                                    placeholder="Makina hakkında ek bilgiler..."
                                />
                            </div>

                            {/* Konum Bilgileri */}
                            <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                        <div className="w-6 h-6 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        Konum Bilgileri
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={getCurrentLocation}
                                        disabled={locationLoading}
                                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-sm font-medium shadow-lg flex items-center space-x-2 transition-all duration-200"
                                    >
                                        {locationLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Alınıyor...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>Mevcut Konum</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Enlem
                                        </label>
                                        <input
                                            type="number"
                                            name="enlem"
                                            value={formData.enlem}
                                            onChange={handleInputChange}
                                            step="any"
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 ${
                                                errors.enlem ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="40.8311"
                                        />
                                        {errors.enlem && (
                                            <p className="text-red-500 text-sm mt-2 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {errors.enlem}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Boylam
                                        </label>
                                        <input
                                            type="number"
                                            name="boylam"
                                            value={formData.boylam}
                                            onChange={handleInputChange}
                                            step="any"
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 ${
                                                errors.boylam ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="35.6472"
                                        />
                                        {errors.boylam && (
                                            <p className="text-red-500 text-sm mt-2 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {errors.boylam}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="motor_calisma"
                                            checked={formData.motor_calisma}
                                            onChange={handleInputChange}
                                            className="mr-3 h-5 w-5 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Motor Çalışıyor</span>
                                    </label>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => router.push('/makina-takip')}
                                    className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>İptal</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg flex items-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Ekleniyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span>Makina Ekle</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>

                    {/* Harita */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    Konum Seçimi
                                </h2>
                                <p className="text-gray-600">
                                    Harita üzerine tıklayarak makina konumunu seçin veya mevcut konumunuzu kullanın
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMapType('street')}
                                    className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-lg ${
                                        mapType === 'street' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                    </svg>
                                    <span>Sokak</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMapType('satellite')}
                                    className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-lg ${
                                        mapType === 'satellite' 
                                            ? 'bg-orange-600 text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Uydu</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="w-full h-[700px] rounded-xl border border-gray-200 overflow-hidden shadow-lg">
                            {mapReady && (
                                <ClickableMap 
                                    onMapClick={handleMapClick}
                                    selectedPosition={selectedPosition}
                                    mapType={mapType}
                                />
                            )}
                        </div>

                        {selectedPosition && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-lg">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">
                                            Konum seçildi!
                                        </p>
                                        <p className="text-xs text-green-600">
                                            Enlem: {selectedPosition[0].toFixed(6)}, Boylam: {selectedPosition[1].toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 