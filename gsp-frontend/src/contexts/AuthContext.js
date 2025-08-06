'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage immediately on client side
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    // Only handle redirects after initialization is complete
    if (initialized && !loading) {
      if (!token && !isPublicRoute) {
        // No token and not on a public route - redirect to login
        console.log('🔄 No token, redirecting to login...');
        router.replace('/login');
      } else if (token && pathname === '/login') {
        // Has token but on login page - redirect to dashboard
        console.log('🔄 Has token but on login page, redirecting to dashboard...');
        router.replace('/dashboard');
      }
    }
  }, [initialized, loading, token, pathname, isPublicRoute]);

  const initializeAuth = async () => {
    try {
      console.log('🔄 Auth initialization started...');
      
      // Add a small delay to prevent flash
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get token and user from localStorage
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      console.log('💾 Stored token:', storedToken ? 'exists' : 'none');
      console.log('💾 Stored user:', storedUser ? 'exists' : 'none');

      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          // Set token and user immediately
          setToken(storedToken);
          setUser(userData);
          
          console.log('✅ Auth restored from localStorage');
          
          // Validate token with API in background (don't await)
          validateTokenInBackground(storedToken);
        } catch (error) {
          console.error('❌ Invalid stored user data:', error);
          // Clear invalid data
          clearAuthData();
        }
      } else if (storedToken && !storedUser) {
        // Has token but no user data - validate token
        console.log('🔍 Has token but no user data, validating...');
        try {
          setToken(storedToken);
          const userData = await validateToken(storedToken);
          setUser(userData);
        } catch (error) {
          console.error('❌ Token validation failed:', error);
          clearAuthData();
        }
      } else {
        console.log('🚫 No stored auth data');
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      clearAuthData();
    } finally {
      setLoading(false);
      setInitialized(true);
      console.log('✅ Auth initialization completed');
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  const validateTokenInBackground = async (token) => {
    try {
      console.log('🔍 Background token validation...');
      const userData = await validateToken(token);
      // Update user data if validation successful
      setUser(userData);
      localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (error) {
      console.error('❌ Background token validation failed:', error);
      // Token is invalid, clear auth data
      clearAuthData();
    }
  };

  const validateToken = async (token) => {
    try {
      console.log('🔍 Validating token...');
      console.log('🌐 API URL:', `${API_BASE_URL}/api/auth/check-auth/`);
      
      // API call to validate token
      const response = await fetch(`${API_BASE_URL}/api/auth/check-auth/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Token validation response status:', response.status);

      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Token validation response:', data);
      
      if (data.authenticated) {
        console.log('✅ Token validation successful');
        return data.user;
      } else {
        throw new Error('Token not valid');
      }
    } catch (error) {
      console.error('❌ Token validation error:', error);
      throw error;
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      
      console.log('🔐 Login attempt:', credentials.username);
      console.log('🌐 API URL:', `${API_BASE_URL}/api/auth/login/`);
      
      // API call for login
      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 Login response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Login response data:', data);

      if (response.ok && data.success) {
        // Store token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));

        // Update state
        setToken(data.token);
        setUser(data.user);

        console.log('✅ Login successful');
        return data;
      } else {
        // API returned error
        console.error('❌ Login failed:', data);
        throw new Error(data.message || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Backend sunucusuna bağlanılamıyor. Sunucu çalışıyor mu?');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logout attempt...');
      
      // Try to logout from server
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
      
      console.log('✅ Server logout completed');
    } catch (error) {
      console.error('❌ Logout API error:', error);
    } finally {
      // Clear localStorage and state regardless of API response
      clearAuthData();
      
      console.log('✅ Local logout completed');
      
      // Redirect to login
      router.replace('/login');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('authUser', JSON.stringify(userData));
  };

  const value = {
    user,
    token,
    loading,
    initialized,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 