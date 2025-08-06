'use client';

import { useAuth } from '../contexts/AuthContext';
import GlobalLoader from './ui/GlobalLoader';

export default function AuthLoader({ children }) {
  const { loading, initialized } = useAuth();

  // Show loader during auth initialization
  if (loading || !initialized) {
    return (
      <GlobalLoader 
        loading={true} 
        message="Giriş bilgileriniz kontrol ediliyor..." 
      />
    );
  }

  return children;
} 