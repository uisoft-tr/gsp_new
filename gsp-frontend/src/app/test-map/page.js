'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Leaflet haritasını dinamik olarak yükle
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });

export default function TestMapPage() {
    const [mapType, setMapType] = useState('street');

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Harita Türü Test Sayfası</h1>
                
                {/* Harita Türü Seçimi */}
                <div className="mb-8 p-4 bg-red-200 rounded-lg border-2 border-red-400">
                    <div className="text-center mb-4">
                        <span className="text-xl font-bold text-red-800">🗺️ HARİTA TÜRÜ SEÇİMİ</span>
                    </div>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => {
                                console.log('🚗 SOKAK BUTONUNA TIKLANDI!');
                                setMapType('street');
                            }}
                            className={`px-6 py-3 rounded-lg text-lg font-bold border-2 ${
                                mapType === 'street' 
                                    ? 'bg-blue-600 text-white border-blue-700' 
                                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
                            }`}
                        >
                            🗺️ SOKAK
                        </button>
                        <button
                            onClick={() => {
                                console.log('🛰️ UYDU BUTONUNA TIKLANDI!');
                                setMapType('satellite');
                            }}
                            className={`px-6 py-3 rounded-lg text-lg font-bold border-2 ${
                                mapType === 'satellite' 
                                    ? 'bg-orange-600 text-white border-orange-700' 
                                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
                            }`}
                        >
                            🛰️ UYDU
                        </button>
                        <button
                            onClick={() => {
                                console.log('🌍 HYBRID BUTONUNA TIKLANDI!');
                                setMapType('hybrid');
                            }}
                            className={`px-6 py-3 rounded-lg text-lg font-bold border-2 ${
                                mapType === 'hybrid' 
                                    ? 'bg-green-600 text-white border-green-700' 
                                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
                            }`}
                        >
                            🌍 HYBRID
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-lg font-bold text-red-700">Aktif: {mapType}</span>
                    </div>
                </div>

                {/* Harita */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Harita Görünümü</h2>
                    
                    <div className="w-full h-[500px] rounded-lg border border-gray-300 overflow-hidden">
                        {mapType === 'street' && (
                            <MapContainer 
                                center={[40.8311, 35.6472]} 
                                zoom={12} 
                                style={{ height: '100%', width: '100%' }}
                                key={`street-map-${Date.now()}`}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                            </MapContainer>
                        )}
                        
                        {mapType === 'satellite' && (
                            <MapContainer 
                                center={[40.8311, 35.6472]} 
                                zoom={12} 
                                style={{ height: '100%', width: '100%' }}
                                key={`satellite-map-${Date.now()}`}
                            >
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Tiles &copy; Esri'
                                />
                            </MapContainer>
                        )}
                        
                        {mapType === 'hybrid' && (
                            <MapContainer 
                                center={[40.8311, 35.6472]} 
                                zoom={12} 
                                style={{ height: '100%', width: '100%' }}
                                key={`hybrid-map-${Date.now()}`}
                            >
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Tiles &copy; Esri'
                                />
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Labels &copy; Esri'
                                />
                            </MapContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 