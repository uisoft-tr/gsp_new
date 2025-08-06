'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function Footer() {
  const { isAuthenticated } = useAuth();

  // Eğer kullanıcı giriş yapmamışsa footer gösterme (ana sayfada kendi footer'ı var)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            © 2024 <span className="font-medium text-gray-900">Uisoft</span> - Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
} 