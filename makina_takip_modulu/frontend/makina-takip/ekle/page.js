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
        hiz: '',
        yakit_seviyesi: '',
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
        
        if (formData.hiz && (formData.hiz < 0 || formData.hiz > 200)) {
            newErrors.hiz = 'Geçerli bir hız değeri giriniz (0-200 km/h)';
        }
        
        if (formData.yakit_seviyesi && (formData.yakit_seviyesi < 0 || formData.yakit_seviyesi > 100)) {
            newErrors.yakit_seviyesi = 'Yakıt seviyesi 0-100 arasında olmalıdır';
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
                        hiz: formData.hiz ? parseFloat(formData.hiz) : null,
                        yakit_seviyesi: formData.yakit_seviyesi ? parseFloat(formData.yakit_seviyesi) : null,
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Başlık */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Yeni Makina Ekle</h1>
                                <p className="text-gray-600 mt-1">Harita üzerinden konum seçerek makina kaydı oluşturun</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/makina-takip')}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            ← Geri Dön
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 lg:max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Makina Bilgileri</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Birlik No */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Birlik No *
                                </label>
                                <input
                                    type="text"
                                    name="birlik_no"
                                    value={formData.birlik_no}
                                    onChange={handleInputChange}
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.birlik_no ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Örn: MAK-001 veya 34 ABC 123-001"
                                />
                                {errors.birlik_no && (
                                    <p className="text-red-500 text-sm mt-1">{errors.birlik_no}</p>
                                )}
                            </div>

                            {/* Makina Adı */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Makina Adı *
                                </label>
                                <input
                                    type="text"
                                    name="isim"
                                    value={formData.isim}
                                    onChange={handleInputChange}
                                    required
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.isim ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Örn: Traktör-001"
                                />
                                {errors.isim && (
                                    <p className="text-red-500 text-sm mt-1">{errors.isim}</p>
                                )}
                            </div>

                            {/* Makina Tipi */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Makina Tipi *
                                </label>
                                <select
                                    name="makina_tipi"
                                    value={formData.makina_tipi}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {makinaTipleri.map(tip => (
                                        <option key={tip.value} value={tip.value}>
                                            {tip.icon} {tip.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Plaka ve Model */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Plaka
                                    </label>
                                    <input
                                        type="text"
                                        name="plaka"
                                        value={formData.plaka}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="34 ABC 123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Model
                                    </label>
                                    <input
                                        type="text"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Örn: John Deere 5075E"
                                    />
                                </div>
                            </div>

                            {/* Yıl ve Durum */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Üretim Yılı
                                    </label>
                                    <input
                                        type="number"
                                        name="yil"
                                        value={formData.yil}
                                        onChange={handleInputChange}
                                        min="1900"
                                        max="2030"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.yil ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="2020"
                                    />
                                    {errors.yil && (
                                        <p className="text-red-500 text-sm mt-1">{errors.yil}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Durum *
                                    </label>
                                    <select
                                        name="durum"
                                        value={formData.durum}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {durumlar.map(durum => (
                                            <option key={durum.value} value={durum.value}>
                                                {durum.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Sulama Sistemi */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sulama Sistemi
                                </label>
                                <select
                                    name="sulama"
                                    value={formData.sulama}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Sulama sistemi seçin (opsiyonel)</option>
                                    {sulamaSistemleri.map(sulama => (
                                        <option key={sulama.id} value={sulama.id}>
                                            {sulama.isim}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Makina hangi sulama sisteminde çalışıyorsa seçin
                                </p>
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Açıklama
                                </label>
                                <textarea
                                    name="aciklama"
                                    value={formData.aciklama}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Makina hakkında ek bilgiler..."
                                />
                            </div>

                            {/* Konum Bilgileri */}
                            <div className="border-t pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Konum Bilgileri</h3>
                                    <button
                                        type="button"
                                        onClick={getCurrentLocation}
                                        disabled={locationLoading}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-sm flex items-center"
                                    >
                                        {locationLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Alınıyor...
                                            </>
                                        ) : (
                                            <>
                                                📍 Mevcut Konum
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Enlem
                                        </label>
                                        <input
                                            type="number"
                                            name="enlem"
                                            value={formData.enlem}
                                            onChange={handleInputChange}
                                            step="any"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                errors.enlem ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="40.8311"
                                        />
                                        {errors.enlem && (
                                            <p className="text-red-500 text-sm mt-1">{errors.enlem}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Boylam
                                        </label>
                                        <input
                                            type="number"
                                            name="boylam"
                                            value={formData.boylam}
                                            onChange={handleInputChange}
                                            step="any"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                errors.boylam ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="35.6472"
                                        />
                                        {errors.boylam && (
                                            <p className="text-red-500 text-sm mt-1">{errors.boylam}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hız (km/h)
                                        </label>
                                        <input
                                            type="number"
                                            name="hiz"
                                            value={formData.hiz}
                                            onChange={handleInputChange}
                                            step="0.1"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                errors.hiz ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="0"
                                        />
                                        {errors.hiz && (
                                            <p className="text-red-500 text-sm mt-1">{errors.hiz}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Yakıt Seviyesi (%)
                                        </label>
                                        <input
                                            type="number"
                                            name="yakit_seviyesi"
                                            value={formData.yakit_seviyesi}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="100"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                errors.yakit_seviyesi ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="100"
                                        />
                                        {errors.yakit_seviyesi && (
                                            <p className="text-red-500 text-sm mt-1">{errors.yakit_seviyesi}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="motor_calisma"
                                            checked={formData.motor_calisma}
                                            onChange={handleInputChange}
                                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Motor Çalışıyor</span>
                                    </label>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-4 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => router.push('/makina-takip')}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Ekleniyor...
                                        </>
                                    ) : (
                                        'Makina Ekle'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Harita */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Konum Seçimi</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Harita üzerine tıklayarak makina konumunu seçin veya mevcut konumunuzu kullanın
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMapType('street')}
                                    className={`px-3 py-2 rounded-lg transition-colors flex items-center text-sm ${
                                        mapType === 'street' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                    </svg>
                                    Sokak
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMapType('satellite')}
                                    className={`px-3 py-2 rounded-lg transition-colors flex items-center text-sm ${
                                        mapType === 'satellite' 
                                            ? 'bg-orange-600 text-white' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Uydu
                                </button>
                            </div>
                        </div>
                        
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 overflow-hidden">
                            {mapReady && (
                                <ClickableMap 
                                    onMapClick={handleMapClick}
                                    selectedPosition={selectedPosition}
                                    mapType={mapType}
                                />
                            )}
                        </div>

                        {selectedPosition && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800">
                                    ✅ Konum seçildi: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 