'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { sulamaAPI } from '../../utils/api';
import Card from '../../components/ui/Card';

export default function UrunlerPage() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  
  const [urunler, setUrunler] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKategori, setSelectedKategori] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Çoklu yükleme önleme için ref
  const hasInitiallyLoaded = useRef(false);
  const isInitialMount = useRef(true);

  // Sadece authentication durumunda ve tek seferlik yükleme
  useEffect(() => {
    // Sadece ilk mount'ta ve authenticated ise çalışsın
    if (isAuthenticated && !hasInitiallyLoaded.current && isInitialMount.current) {
      hasInitiallyLoaded.current = true;
      isInitialMount.current = false;
      fetchUrunler();
      fetchKategoriler();
    }
  }, [isAuthenticated]);

  // Kategori değişikliklerinde verileri yeniden yükle - sadece gerçek değişiklik varsa
  useEffect(() => {
    // Sadece ilk yükleme sonrası VE gerçek bir kategori seçilmişse
    if (hasInitiallyLoaded.current && selectedKategori && selectedKategori !== '') {
      fetchUrunler();
    }
  }, [selectedKategori]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const fetchUrunler = async () => {
    try {
      setIsLoading(true);
      
      // Parametreleri doğru şekilde object olarak gönder
      const params = {};
      if (searchTerm && searchTerm.trim().length > 0) {
        params.search = searchTerm.trim();
      }
      if (selectedKategori) {
        params.kategori = selectedKategori;
      }
      
      const data = await sulamaAPI.getUrunler(params);
      
      const urunData = data.results || data;
      setUrunler(urunData);
      
    } catch (error) {
      console.error('Ürün fetch error:', error);
      toast.error('Ürünler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Kategorileri ayrı olarak getir
  const fetchKategoriler = async () => {
    try {
      const data = await sulamaAPI.getUrunKategorileri();
      
      const kategoriData = data.results || data;
      setKategoriler(kategoriData);
      
    } catch (error) {
      console.error('Kategori fetch error:', error);
      toast.error('Kategoriler yüklenirken bir hata oluştu');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Yetkilendirme kontrol ediliyor...</h1>
        </div>
      </div>
    );
  }

  // Server-side filtreleme kullanıyoruz, frontend filtreleme gerekmiyor

  // Arama fonksiyonu - 500ms debounce ile
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    
    // İlk yükleme tamamlanmadıysa arama yapma
    if (!hasInitiallyLoaded.current) {
      return;
    }
    
    // Önceki timeout'u temizle
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Yeni timeout ayarla - boş veya 3+ karakter için arama yap
    const timeout = setTimeout(() => {
      fetchUrunler();
    }, 500);
    setSearchTimeout(timeout);
  };

  const formatTarih = (tarihString) => {
    if (!tarihString) return 'Belirtilmemiş';
    
    try {
      const tarih = new Date(tarihString);
      return tarih.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'numeric'
      });
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  return (
    <div className="py-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-4xl font-bold text-gray-900"> 
              Ürünler
            </h1>
            
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ürün Ara
              </label>
                             <input
                 type="text"
                 value={searchTerm}
                 onChange={(e) => handleSearchChange(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                 placeholder="Ürün adı, sulama adı veya kategori..."
               />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={selectedKategori}
                onChange={(e) => setSelectedKategori(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              >
                <option value="">Tüm Kategoriler</option>
                {kategoriler.map(kategori => (
                  <option key={`kategori-${kategori.id}`} value={kategori.id}>
                    {kategori.isim}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Ürünler yükleniyor...</span>
          </div>
                 ) : urunler.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ürün bulunamadı</h3>
            <p className="text-gray-600">
              {searchTerm || selectedKategori 
                ? 'Arama kriterlerinize uygun ürün bulunamadı.' 
                : 'Henüz hiç ürün tanımlanmamış.'}
            </p>
          </div>
        ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {urunler.map((urun) => (
              <Card key={urun.id} padding="lg" shadow="md" className="bg-white hover:shadow-lg transition-shadow">
                <div>
                  {/* Content */}
                  <div className="w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {urun.isim}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {urun.sulama_display || 'Sulama belirtilmemiş'}
                    </p>

                    {/* Categories */}
                    {urun.kategori_isimleri && urun.kategori_isimleri.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {urun.kategori_isimleri.map((kategoriIsim, index) => (
                          <span
                            key={`urun-${urun.id}-kategori-${index}`}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                          >
                            {kategoriIsim}
                          </span>
                        ))}
                      </div>
                    )}

                                         {/* İstatistikler */}
                     <div className="space-y-2 mb-3">
                       {/* Date Range */}
                       {(urun.baslangic_tarihi || urun.bitis_tarihi) && (
                         <div className="space-y-1">
                           {urun.baslangic_tarihi && (
                             <div className="flex items-center text-xs text-gray-600">
                               <svg className="w-4 h-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                               </svg>
                               <span>Ekim: {formatTarih(urun.baslangic_tarihi)}</span>
                             </div>
                           )}
                           {urun.bitis_tarihi && (
                             <div className="flex items-center text-xs text-gray-600">
                               <svg className="w-4 h-4 mr-1 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                               </svg>
                               <span>Hasat: {formatTarih(urun.bitis_tarihi)}</span>
                             </div>
                           )}
                         </div>
                       )}

                       {/* Kar Oranı */}
                       {urun.kar_orani !== null && urun.kar_orani !== undefined && (
                         <div className="flex items-center text-sm text-gray-700">
                           <svg className="w-4 h-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                           </svg>
                           <span>Kar Oranı: %{urun.kar_orani}</span>
                         </div>
                       )}
                     </div>

                                         {/* Aylık Katsayılar */}
                     {urun.aylik_katsayilar && urun.aylik_katsayilar.length > 0 && (
                       <div className="border-t border-gray-200 pt-3">
                         <h4 className="text-sm font-medium text-gray-700 mb-2">Aylık Katsayılar</h4>
                         <div className="flex flex-wrap gap-1">
                           {urun.aylik_katsayilar.map((ay, index) => (
                             <span
                               key={`urun-${urun.id}-ay-${ay.ay || index}-${index}`}
                               className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                               title={`${ay.ay}: ${ay.deger}`}
                             >
                               {ay.kisa}: {ay.deger}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 