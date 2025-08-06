'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Leaflet bileşenlerini dinamik olarak yükle
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// Leaflet'i dinamik olarak yükle
let L;
if (typeof window !== 'undefined') {
    try {
        L = require('leaflet');
    } catch (error) {
        console.error('Leaflet yüklenirken hata:', error);
    }
}

export default function MakinaHarita({ makinalar, onMakinaClick, selectedMakina }) {
    const [mapType, setMapType] = useState('street'); // 'satellite' veya 'street'

    // Harita merkezi (Amasya Suluova)
    const mapCenter = [40.8311, 35.6472];
    const mapZoom = 10;

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

    const getMakinaMarkerColor = (makinaTipi) => {
        const colors = {
            'traktor': '#EF4444', // Kırmızı
            'ekskavator': '#3B82F6', // Mavi
            'buldozer': '#10B981', // Yeşil
            'yukleyici': '#F59E0B', // Turuncu
            'diger': '#8B5CF6' // Mor
        };
        return colors[makinaTipi] || '#EF4444';
    };

    return (
        <div className="relative w-full h-[80vh] rounded-lg border border-gray-200 overflow-hidden">
            {/* Leaflet Harita */}
            <MapContainer 
                center={mapCenter} 
                zoom={mapZoom} 
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                {/* Harita Katmanı */}
                <TileLayer
                    url={mapType === 'satellite' 
                        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                    attribution={mapType === 'satellite' 
                        ? '&copy; <a href="https://www.esri.com/">Esri</a>'
                        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }
                    key={mapType} // Katman değiştiğinde yeniden yükle
                />
                
                {/* Makina Marker'ları */}
                {makinalar
                    .filter(makina => makina.enlem && makina.boylam)
                    .map((makina) => {
                        const isSelected = selectedMakina?.id === makina.id;
                        
                        return (
                            <Marker
                                key={makina.id}
                                position={[makina.enlem, makina.boylam]}
                                eventHandlers={{
                                    click: () => onMakinaClick(makina)
                                }}
                                icon={L && L.divIcon ? L.divIcon({
                                    className: 'custom-marker',
                                    html: `
                                        <div style="
                                            background-color: ${getMakinaMarkerColor(makina.makina_tipi)};
                                            width: 50px;
                                            height: 50px;
                                            border-radius: 50%;
                                            border: 3px solid white;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            color: white;
                                            font-weight: bold;
                                            font-size: 10px;
                                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                            cursor: pointer;
                                            text-align: center;
                                            line-height: 1.2;
                                            padding: 2px;
                                        ">
                                            ${makina.isim || makina.birlik_no || makina.plaka}
                                        </div>
                                    `,
                                    iconSize: [50, 50],
                                    iconAnchor: [25, 25]
                                }) : undefined}
                            >
                                <Popup>
                                    <div className="text-center p-2">
                                        <div className="font-bold text-lg text-gray-900">{makina.isim}</div>
                                        <div className="text-sm text-gray-600 mb-1">Birlik No: {makina.birlik_no || 'Belirtilmemiş'}</div>
                                        <div className="text-sm text-gray-600 mb-1">Tür: {getMakinaTypeDisplay(makina.makina_tipi)}</div>
                                        <div className="text-sm text-gray-600 mb-1">Durum: {makina.durum}</div>
                                        {makina.aktif_is && (
                                            <div className="text-sm text-blue-600 font-medium">
                                                Aktif İş: {makina.aktif_is.baslik}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
            </MapContainer>
            

            
            {/* Sağ Üst Kontroller */}
            <div className="absolute top-4 right-4 space-y-2">
                {/* Tam Ekran */}
                <button 
                    onClick={() => {
                        const mapContainer = document.querySelector('.relative.w-full.h-\\[80vh\\]');
                        if (mapContainer) {
                            mapContainer.requestFullscreen();
                        }
                    }}
                    className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>
            </div>
            
            {/* Alt Sağ Kontroller */}
            <div className="absolute bottom-4 right-4 space-y-2">
                {/* Katman Değiştir */}
                <button 
                    onClick={() => setMapType(mapType === 'satellite' ? 'street' : 'satellite')}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{mapType === 'satellite' ? 'Harita' : 'Uydu'}</span>
                </button>
            </div>
        </div>
    );
} 