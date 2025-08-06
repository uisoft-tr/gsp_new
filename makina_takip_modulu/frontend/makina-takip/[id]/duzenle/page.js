'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
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
            center={[40.8311, 35.6472]} // Amasya Suluova merkez
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

export default function MakinaDuzenlePage() {
    const { token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    
    const makinaId = params.id;
    
    const [sulamaSistemleri, setSulamaSistemleri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
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
        boylam: ''
    });

                const [isBilgileri, setIsBilgileri] = useState({
                is_tipi: '',
                baslik: '',
                aciklama: '',
                calistigi_yer: '',
                baslangic_tarihi: '',
                bitis_tarihi: '',
                enlem: '',
                boylam: ''
            });

    useEffect(() => {
        loadSulamaSistemleri();
        loadMakinaData();
        
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
    }, [makinaId]);

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

    const loadMakinaData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sulama/makinalar/${makinaId}/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const makina = await response.json();
                setFormData({
                    birlik_no: makina.birlik_no || '',
                    isim: makina.isim || '',
                    makina_tipi: makina.makina_tipi || 'traktor',
                    plaka: makina.plaka || '',
                    model: makina.model || '',
                    yil: makina.yil || '',
                    durum: makina.durum || 'aktif',
                    sulama: makina.sulama || '',
                    aciklama: makina.aciklama || '',
                    enlem: makina.son_konum?.enlem || '',
                    boylam: makina.son_konum?.boylam || ''
                });

                if (makina.son_konum?.enlem && makina.son_konum?.boylam) {
                    setSelectedPosition([makina.son_konum.enlem, makina.son_konum.boylam]);
                }
            } else {
                toast.error('Makina verileri yüklenemedi');
            }
        } catch (error) {
            console.error('Makina verileri yüklenirken hata:', error);
            toast.error('Makina verileri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
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

    // Mevcut konumu al
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Tarayıcınız konum servisini desteklemiyor');
            return;
        }
        
        toast.info('Konum alınıyor...');
        
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
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleIsInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setIsBilgileri(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleIsKaydet = async () => {
        try {
            // Validasyon
            if (!isBilgileri.is_tipi || !isBilgileri.baslik) {
                toast.error('İş tipi ve başlık zorunludur');
                return;
            }

            const requestBody = {
                makina: makinaId,
                is_tipi: isBilgileri.is_tipi,
                baslik: isBilgileri.baslik,
                aciklama: isBilgileri.aciklama || '',
                calistigi_yer: isBilgileri.calistigi_yer || '',
                durum: 'devam_ediyor'
            };

            // Tarih bilgileri varsa ekle
            if (isBilgileri.baslangic_tarihi) {
                requestBody.baslangic_zamani = isBilgileri.baslangic_tarihi;
            }
            if (isBilgileri.bitis_tarihi) {
                requestBody.bitis_zamani = isBilgileri.bitis_tarihi;
            }

            // Konum bilgileri varsa ekle
            if (isBilgileri.enlem && isBilgileri.boylam) {
                requestBody.enlem = parseFloat(isBilgileri.enlem);
                requestBody.boylam = parseFloat(isBilgileri.boylam);
            }

            const isResponse = await fetch(`${API_BASE_URL}/api/sulama/makina-isler/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (isResponse.ok) {
                toast.success('İş başarıyla kaydedildi!');
                                        // Form'u temizle
                        setIsBilgileri({
                            is_tipi: '',
                            baslik: '',
                            aciklama: '',
                            calistigi_yer: '',
                            baslangic_tarihi: '',
                            bitis_tarihi: '',
                            enlem: '',
                            boylam: ''
                        });
            } else {
                const errorData = await isResponse.json();
                console.error('İş kaydetme hatası:', errorData);
                toast.error('İş kaydedilirken hata oluştu: ' + (errorData.detail || 'Bilinmeyen hata'));
            }
        } catch (error) {
            console.error('İş kaydedilirken hata:', error);
            toast.error('İş kaydedilirken hata oluştu');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Makina bilgilerini güncelle
            const makinaResponse = await fetch(`${API_BASE_URL}/api/sulama/makinalar/${makinaId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    birlik_no: formData.birlik_no,
                    isim: formData.isim,
                    makina_tipi: formData.makina_tipi,
                    plaka: formData.plaka,
                    model: formData.model,
                    yil: formData.yil ? parseInt(formData.yil) : null,
                    durum: formData.durum,
                    sulama: formData.sulama,
                    aciklama: formData.aciklama
                })
            });

            if (!makinaResponse.ok) {
                throw new Error('Makina güncellenemedi');
            }

            // Konum bilgilerini güncelle
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
                        boylam: parseFloat(formData.boylam)
                    })
                });

                if (!konumResponse.ok) {
                    console.warn('Konum güncellenemedi');
                }
            }

            toast.success('Makina başarıyla güncellendi!');
            router.push('/makina-takip');

        } catch (error) {
            console.error('Makina güncellenirken hata:', error);
            toast.error('Makina güncellenirken bir hata oluştu: ' + error.message);
        } finally {
            setSaving(false);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <h3 className="mt-6 text-xl font-semibold text-blue-900">Makina Verileri Yükleniyor...</h3>
                    <p className="mt-2 text-blue-600">Makina bilgileri hazırlanıyor</p>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Makina Düzenle</h1>
                                <p className="text-gray-600 mt-1">Makina bilgilerini ve konumunu güncelleyin</p>
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
                            {/* Birlik No - Düzenlenebilir */}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Örn: MAK-001 veya 34 ABC 123-001"
                                />
                            </div>

                            {/* Makina Adı - Sabit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Makina Adı
                                </label>
                                <input
                                    type="text"
                                    name="isim"
                                    value={formData.isim}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                    placeholder="Örn: Traktör-001"
                                />
                                <p className="text-xs text-gray-500 mt-1">Makina adı değiştirilemez</p>
                            </div>

                            {/* Makina Tipi - Sabit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Makina Tipi
                                </label>
                                <select
                                    name="makina_tipi"
                                    value={formData.makina_tipi}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                >
                                    {makinaTipleri.map(tip => (
                                        <option key={tip.value} value={tip.value}>
                                            {tip.icon} {tip.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Makina tipi değiştirilemez</p>
                            </div>

                            {/* Plaka ve Model - Sabit */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Plaka
                                    </label>
                                    <input
                                        type="text"
                                        name="plaka"
                                        value={formData.plaka}
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
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
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
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
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                        placeholder="2020"
                                    />
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
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm flex items-center"
                                    >
                                        📍 Mevcut Konum
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="40.8311"
                                        />
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="35.6472"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* İş Bilgileri */}
                            <div className="border-t pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">İş Bilgileri</h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // İş bilgilerini makina konumuna kopyala
                                            setIsBilgileri(prev => ({
                                                ...prev,
                                                enlem: formData.enlem,
                                                boylam: formData.boylam
                                            }));
                                        }}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm flex items-center"
                                    >
                                        📍 Konumdan Al
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            İş Tipi
                                        </label>
                                        <select
                                            name="is_tipi"
                                            value={isBilgileri.is_tipi}
                                            onChange={handleIsInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">İş tipi seçin</option>
                                            <option value="sulama">Sulama</option>
                                            <option value="bakim">Bakım</option>
                                            <option value="tamir">Tamir</option>
                                            <option value="tasima">Taşıma</option>
                                            <option value="diger">Diğer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            İş Başlığı
                                        </label>
                                        <input
                                            type="text"
                                            name="baslik"
                                            value={isBilgileri.baslik}
                                            onChange={handleIsInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="İş başlığı girin"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Çalıştığı Yer
                                        </label>
                                        <input
                                            type="text"
                                            name="calistigi_yer"
                                            value={isBilgileri.calistigi_yer}
                                            onChange={handleIsInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Örn: Suluova Köyü, S2 Ana Kanal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Başlangıç Tarihi
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="baslangic_tarihi"
                                            value={isBilgileri.baslangic_tarihi}
                                            onChange={handleIsInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bitiş Tarihi
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="bitis_tarihi"
                                            value={isBilgileri.bitis_tarihi}
                                            onChange={handleIsInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            İş Konumu - Enlem
                                        </label>
                                        <input
                                            type="number"
                                            name="enlem"
                                            value={isBilgileri.enlem}
                                            onChange={handleIsInputChange}
                                            step="any"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="40.8311"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            İş Konumu - Boylam
                                        </label>
                                        <input
                                            type="number"
                                            name="boylam"
                                            value={isBilgileri.boylam}
                                            onChange={handleIsInputChange}
                                            step="any"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="35.6472"
                                        />
                                    </div>
                                    <div></div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        İş Açıklaması
                                    </label>
                                    <textarea
                                        name="aciklama"
                                        value={isBilgileri.aciklama}
                                        onChange={handleIsInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="İş hakkında detaylı açıklama..."
                                    />
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // İş bilgilerini kaydet
                                            handleIsKaydet();
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        İş Kaydet
                                    </button>
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
                                    disabled={saving}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? 'Güncelleniyor...' : 'Güncelle'}
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
                                    Harita üzerine tıklayarak makina konumunu güncelleyin
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
                                    key={`map-${makinaId}-${selectedPosition ? selectedPosition.join(',') : 'default'}-${mapType}`}
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