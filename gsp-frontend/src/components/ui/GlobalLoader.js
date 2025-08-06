'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function GlobalLoader({ loading = false, message = 'Yükleniyor...' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !loading) return null;

  const loaderContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="text-center">
        {/* Simple Dual Ring Loader */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Outer Ring */}
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          {/* Inner Rotating Ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 rounded-full animate-spin"></div>
          {/* Second Ring - opposite direction */}
          <div className="absolute inset-2 border-4 border-transparent border-b-primary-300 rounded-full animate-spin-reverse"></div>
        </div>

        {/* Loading Text */}
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );

  return createPortal(loaderContent, document.body);
}

// Mini loader for buttons and small components
export function MiniLoader({ className = "w-4 h-4" }) {
  return (
    <div className={`${className} animate-spin`}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Loading skeleton for content
export function LoadingSkeleton({ lines = 3, className = "" }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      ))}
    </div>
  );
} 