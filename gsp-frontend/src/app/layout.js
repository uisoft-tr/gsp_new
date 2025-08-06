import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import AuthLoader from '../components/AuthLoader';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'GSP Yönetim Sistemi',
  description: 'Modern, güvenli ve kullanıcı dostu platform ile işlerinizi kolayca yönetin',
  keywords: 'GSP, yönetim sistemi, modern platform, güvenli',
  authors: [{ name: 'GSP Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'GSP Yönetim Sistemi',
    description: 'Modern, güvenli ve kullanıcı dostu platform ile işlerinizi kolayca yönetin',
    type: 'website',
    locale: 'tr_TR',
  },
};

function RootLayoutContent({ children }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-white`}>
        <ToastProvider>
          <AuthProvider>
            <AuthLoader>
              <div className="min-h-screen bg-white flex flex-col">
                <Navigation />
                <main className="flex-1 bg-white">
                  {children}
                </main>
                <Footer />
              </div>
            </AuthLoader>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

// Global Loader Wrapper to use Auth context
function GlobalLoaderWrapper() {
  // This will be used to show loader during auth initialization
  // You can connect this to any global loading state
  return null; // Will be implemented when needed
}

export default function RootLayout({ children }) {
  return <RootLayoutContent>{children}</RootLayoutContent>;
}
