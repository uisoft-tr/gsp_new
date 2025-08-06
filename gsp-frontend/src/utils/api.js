// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: `${API_BASE_URL}/api/auth/login/`,
        LOGOUT: `${API_BASE_URL}/api/auth/logout/`,
        PROFILE: `${API_BASE_URL}/api/auth/profile/`,
        CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password/`,
        LOGIN_HISTORY: `${API_BASE_URL}/api/auth/login-history/`,
    },
    
    // Sulama API
    SULAMA: {
        BASE: `${API_BASE_URL}/api/sulama/sulamalar/`,
        DEPOLAMA_TESISLERI: `${API_BASE_URL}/api/sulama/depolama-tesisleri/`,
        KANALLAR: `${API_BASE_URL}/api/sulama/kanallar/`,
        GUNLUK_SEBEKE_SU: `${API_BASE_URL}/api/sulama/gunluk-sebeke-su/`,
        GUNLUK_DEPOLAMA_SU: `${API_BASE_URL}/api/sulama/gunluk-depolama-su/`,
        URUN_KATEGORILERI: `${API_BASE_URL}/api/sulama/urun-kategorileri/`,
        URUNLER: `${API_BASE_URL}/api/sulama/urunler/`,
        YILLIK_TUKETIM: `${API_BASE_URL}/api/sulama/yillik-tuketim/`,
        DASHBOARD: `${API_BASE_URL}/api/sulama/dashboard/`,
    }
};

// API helper functions
export const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    
    console.log('API Request:', {
        url,
        token: token ? `${token.substring(0, 10)}...` : 'No token',
        options
    });
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Token ${token}` }),
        },
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);
        
        console.log('API Response:', {
            url,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('API Response Data:', data);
            return data;
        }
        
        return response;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

// Specific API functions
export const sulamaAPI = {
    // Sulama Sistemleri
    getSulamalar: () => apiRequest(API_ENDPOINTS.SULAMA.BASE),
    
    // Depolama Tesisleri
    getDepolamaTesisleri: () => apiRequest(API_ENDPOINTS.SULAMA.DEPOLAMA_TESISLERI),
    
    // Kanallar
    getKanallar: (depolamaId = null) => {
        const url = depolamaId 
            ? `${API_ENDPOINTS.SULAMA.KANALLAR}?depolama_tesisi=${depolamaId}`
            : API_ENDPOINTS.SULAMA.KANALLAR;
        return apiRequest(url);
    },
    
    // Kanal su hacmi hesaplama
    hesaplaKanalSuHacmi: (kanalId, yukseklik) => apiRequest(`${API_ENDPOINTS.SULAMA.KANALLAR}${kanalId}/su_hacmi_hesapla/`, {
        method: 'POST',
        body: JSON.stringify({ yukseklik }),
    }),
    
    // Günlük Şebeke Su
    getGunlukSebekeSu: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const url = searchParams.toString() 
            ? `${API_ENDPOINTS.SULAMA.GUNLUK_SEBEKE_SU}?${searchParams.toString()}`
            : API_ENDPOINTS.SULAMA.GUNLUK_SEBEKE_SU;
        return apiRequest(url);
    },
    
    createGunlukSebekeSu: (data) => apiRequest(API_ENDPOINTS.SULAMA.GUNLUK_SEBEKE_SU, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    
    updateGunlukSebekeSu: (id, data) => apiRequest(`${API_ENDPOINTS.SULAMA.GUNLUK_SEBEKE_SU}${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    
    deleteGunlukSebekeSu: (id) => apiRequest(`${API_ENDPOINTS.SULAMA.GUNLUK_SEBEKE_SU}${id}/`, {
        method: 'DELETE',
    }),
    
    hesaplaSuMiktari: (data) => apiRequest(`${API_ENDPOINTS.SULAMA.GUNLUK_SEBEKE_SU}hesapla_su_miktari/`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    
    // Günlük Depolama Su
    getGunlukDepolamaSu: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const url = searchParams.toString() 
            ? `${API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU}?${searchParams.toString()}`
            : API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU;
        return apiRequest(url);
    },
    
    createGunlukDepolamaSu: (data) => apiRequest(API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    
    updateGunlukDepolamaSu: (id, data) => apiRequest(`${API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU}${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    
    deleteGunlukDepolamaSu: (id) => apiRequest(`${API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU}${id}/`, {
        method: 'DELETE',
    }),
    
    hesaplaDepolamaSuMiktari: (depolamaId, kot) => apiRequest(`${API_ENDPOINTS.SULAMA.DEPOLAMA_TESISLERI}${depolamaId}/su_hacmi_hesapla/`, {
        method: 'POST',
        body: JSON.stringify({ kot }),
    }),
    
    getGunlukDepolamaSuIstatistikleri: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const url = searchParams.toString() 
            ? `${API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU}istatistikler/?${searchParams.toString()}`
            : `${API_ENDPOINTS.SULAMA.GUNLUK_DEPOLAMA_SU}istatistikler/`;
        return apiRequest(url);
    },
    
    // Ürünler
    getUrunler: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const url = searchParams.toString() 
            ? `${API_ENDPOINTS.SULAMA.URUNLER}?${searchParams.toString()}`
            : API_ENDPOINTS.SULAMA.URUNLER;
            
        return apiRequest(url);
    },
    
    getUrunKategorileri: () => apiRequest(API_ENDPOINTS.SULAMA.URUN_KATEGORILERI),
    
    // Yıllık Tüketim Verileri
    getYillikTuketim: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const url = searchParams.toString() 
            ? `${API_ENDPOINTS.SULAMA.YILLIK_TUKETIM}?${searchParams.toString()}`
            : API_ENDPOINTS.SULAMA.YILLIK_TUKETIM;
        return apiRequest(url);
    },
    
    // Sulama Hesaplama Kaydetme
    saveSulamaHesaplama: (data) => apiRequest(`${API_ENDPOINTS.SULAMA.YILLIK_TUKETIM}bulk_create/`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    
    // Dashboard Verileri
    getDashboardData: (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const url = searchParams.toString() 
            ? `${API_ENDPOINTS.SULAMA.DASHBOARD}aylik_su_kullanimi/?${searchParams.toString()}`
            : `${API_ENDPOINTS.SULAMA.DASHBOARD}aylik_su_kullanimi/`;
        return apiRequest(url);
    },
};

export default API_ENDPOINTS; 