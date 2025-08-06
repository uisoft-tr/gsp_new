# GSP Yönetim Sistemi Frontend

Modern işletme yönetimi için geliştirilmiş Next.js tabanlı frontend uygulaması.

## 🚀 Özellikler

- **Modern UI/UX**: Tailwind CSS ile responsive ve modern tasarım
- **Komponentli Yapı**: Yeniden kullanılabilir React komponentleri
- **Temiz Mimari**: Organized klasör yapısı ve modüler kod
- **API Entegrasyonu**: Merkezi API client ile backend bağlantısı
- **Kimlik Doğrulama**: JWT tabanlı güvenli authentication sistem
- **TypeScript Ready**: JavaScript ile geliştirilmiş, TypeScript'e kolayca geçilebilir

## 🎨 Tema

- **Ana Renk**: #0F6769 (GSP Green)
- **Tipografi**: Inter font family
- **İkonlar**: Heroicons
- **Animasyonlar**: Tailwind CSS transitions

## 📁 Proje Yapısı

```
gsp-frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Dashboard sayfası
│   │   ├── login/             # Login sayfası
│   │   ├── globals.css        # Global stiller
│   │   ├── layout.js          # Root layout
│   │   └── page.js            # Ana sayfa
│   ├── components/            # React komponentleri
│   │   ├── auth/              # Kimlik doğrulama komponentleri
│   │   │   └── LoginForm.js   # Login formu
│   │   └── ui/                # UI komponentleri
│   │       ├── Button.js      # Button komponenti
│   │       ├── Card.js        # Card komponenti
│   │       └── Input.js       # Input komponenti
│   ├── lib/                   # Utility kütüphaneleri
│   │   └── api.js            # API client
│   └── utils/                 # Yardımcı fonksiyonlar
├── public/                    # Statik dosyalar
├── tailwind.config.js         # Tailwind yapılandırması
├── package.json              # Proje bağımlılıkları
└── README.md                 # Bu dosya
```

## 🛠 Teknolojiler

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS
- **Language**: JavaScript
- **Routing**: App Router
- **State Management**: React Hooks
- **HTTP Client**: Fetch API
- **Authentication**: JWT

## 📦 Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Environment variables oluşturun:**
   ```bash
   cp .env.example .env.local
   ```

3. **Environment değişkenlerini düzenleyin:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

## 🚀 Çalıştırma

### Development Mode
```bash
npm run dev
```
Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 🧩 Komponentler

### UI Komponentleri

#### Button
```jsx
import Button from '@/components/ui/Button';

<Button variant="primary" size="lg" loading={false}>
  Kaydet
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `loading`: boolean
- `disabled`: boolean

#### Input
```jsx
import Input from '@/components/ui/Input';

<Input
  label="E-posta"
  type="email"
  placeholder="ornek@email.com"
  error={errors.email}
  required
  showPasswordToggle // sadece type="password" için
/>
```

#### Card
```jsx
import Card from '@/components/ui/Card';

<Card padding="lg" shadow="gsp" hover>
  <Card.Header>Başlık</Card.Header>
  <Card.Body>İçerik</Card.Body>
  <Card.Footer>Alt kısım</Card.Footer>
</Card>
```

### Auth Komponentleri

#### LoginForm
```jsx
import LoginForm from '@/components/auth/LoginForm';

<LoginForm />
```

## 🔌 API Kullanımı

### API Client
```javascript
import { authAPI, gspAPI, apiUtils } from '@/lib/api';

// Login
const response = await authAPI.login({ email, password });

// User profile
const user = await authAPI.getProfile();

// Custom API call
const data = await gspAPI.get('/custom-endpoint');

// Error handling
if (error) {
  const message = apiUtils.handleApiError(error);
}
```

### API Fonksiyonları

#### Authentication
- `authAPI.login(credentials)` - Kullanıcı girişi
- `authAPI.register(userData)` - Kullanıcı kaydı
- `authAPI.logout()` - Çıkış işlemi
- `authAPI.getProfile()` - Kullanıcı profili
- `authAPI.refreshToken(token)` - Token yenileme

#### Generic API
- `gspAPI.getUsers()` - Kullanıcı listesi
- `gspAPI.createUser(data)` - Kullanıcı oluşturma
- `gspAPI.updateUser(id, data)` - Kullanıcı güncelleme
- `gspAPI.deleteUser(id)` - Kullanıcı silme

## 🎨 Tema Özelleştirmesi

### Renkler
Tailwind config dosyasında özel renkler tanımlanmıştır:

```javascript
colors: {
  primary: {
    50: '#e6f3f3',
    500: '#0F6769', // Ana GSP rengi
    900: '#042628',
  }
}
```

### CSS Sınıfları
```css
.gradient-bg      /* GSP gradient arka plan */
.glass-effect     /* Cam efekti */
.btn-primary      /* Ana buton stili */
.shadow-gsp       /* GSP özel gölge */
```

## 📱 Responsive Tasarım

Tüm komponentler mobile-first yaklaşımıyla tasarlanmıştır:

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🔐 Güvenlik

- JWT token güvenli saklanması
- XSS koruması
- CSRF koruması
- Input validation
- Error handling

## 📄 Sayfalar

### Ana Sayfa (/)
- Hero section
- Özellikler bölümü
- CTA section
- Footer

### Login Sayfası (/login)
- Modern login formu
- Validation
- Error handling
- Remember me özelliği

### Dashboard (/dashboard)
- İstatistik kartları
- Hızlı işlemler
- Son aktiviteler
- Responsive tasarım

## 🔧 Geliştirme

### Yeni Komponent Ekleme
```bash
# UI komponenti
touch src/components/ui/NewComponent.js

# Auth komponenti
touch src/components/auth/NewAuthComponent.js
```

### Yeni Sayfa Ekleme
```bash
# Next.js App Router ile
mkdir src/app/new-page
touch src/app/new-page/page.js
```

### API Integration
```javascript
// lib/api.js dosyasına yeni endpoint ekleme
export const customAPI = {
  async getCustomData() {
    return apiClient.get('/custom-endpoint');
  }
};
```

## 🐛 Hata Ayıklama

### Yaygın Hatalar

1. **API Connection Error**
   - `.env.local` dosyasında API URL'ini kontrol edin
   - Backend sunucusunun çalıştığından emin olun

2. **Authentication Issues**
   - Local storage'da token kontrolü yapın
   - Token expiry süresini kontrol edin

3. **Styling Issues**
   - Tailwind CSS build edildiğinden emin olun
   - Custom CSS sınıfları konfig dosyasında tanımlı olmalı

## 📈 Performance

- Next.js Image Optimization
- Lazy loading
- Code splitting
- Static generation
- Client-side caching

## 🚀 Deployment

### Vercel (Önerilen)
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t gsp-frontend .
docker run -p 3000:3000 gsp-frontend
```

### Manual Build
```bash
npm run build
npm start
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Branch'i push edin
5. Pull Request oluşturun

## 📝 Lisans

Bu proje GSP Team tarafından geliştirilmiştir.

## 📞 İletişim

- **Email**: info@gsp.com
- **Website**: https://gsp.com
- **Documentation**: https://docs.gsp.com

---

**GSP Yönetim Sistemi** - Modern işletme ihtiyaçları için geliştirilmiş güvenilir platform.
