# GSP Sulama Planlama Sistemi

Django + Next.js tabanlı, Docker ile çalışan modern bir sulama sistemi yönetim uygulaması.

## 🚀 Özellikler

### 📊 Sulama Yönetimi
- **Bölge Yönetimi**: Coğrafi bölgeleri organize etme
- **Sulama Sistemleri**: Her bölge altında sulama sistemleri
- **Depolama Tesisleri**: Su depolama ve yönetimi
- **Kanal Sistemi**: Su iletim kanalları
- **Abak Sistemi**: Hacim-yükseklik ilişki tabloları

### 💧 Su Takibi
- **Günlük Su Miktarları**: Kanal bazlı günlük su takibi
- **Depolama Takibi**: Tesislerde günlük su seviyesi
- **Ürün Bazlı Tüketim**: Ürünlere göre su tüketim hesaplamaları
- **Yıllık İstatistikler**: Genel su tüketim raporları

### 🚜 Makina Takip Sistemi
- **Makina Yönetimi**: Traktör, ekskavatör, buldozer vb.
- **Konum Takibi**: GPS ile gerçek zamanlı konum
- **İş Takibi**: Makinaların yaptığı işlerin kaydı
- **Harita Entegrasyonu**: Leaflet ile interaktif harita
- **Tam Ekran Modu**: Harita için tam ekran görünüm

### 👥 Kullanıcı Yönetimi
- **Profil Sistemi**: Genişletilmiş kullanıcı profilleri
- **Sulama Bazlı Yetkilendirme**: Kullanıcılar sadece yetkili oldukları sulama sistemlerine erişebilir
- **Yetki Seviyeleri**: 
  - Sadece Okuma
  - Veri Girişi
  - Yönetici
  - Süper Yönetici
- **Giriş Kayıtları**: Güvenlik için giriş logları

### 🏭 Ürün Yönetimi
- **Ürün Kategorileri**: Tarım ürünlerini kategorilere ayırma
- **Aylık Katsayılar**: Her ürün için aylık su tüketim katsayıları
- **Randıman Hesaplamaları**: Çiftlik ve iletim randıları

## 🏗️ Teknolojiler

### Backend
- **Framework**: Django 4.2.7
- **Database**: PostgreSQL 15
- **API**: Django REST Framework
- **Authentication**: Django Auth + Custom Profile System

### Frontend
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Maps**: React Leaflet
- **State Management**: React Context API

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **Environment**: Production ready

## 📋 Sistem Gereksinimleri

- Docker
- Docker Compose
- 2GB RAM (minimum)
- 5GB Disk Alanı

## 🚀 Kurulum

### 1. Repository'yi klonlayın
```bash
git clone https://github.com/trgyrlmz/gsp_yeni.git
cd gsp_yeni
```

### 2. Docker ile çalıştırın
```bash
# Servisleri başlat
docker-compose up -d

# Veritabanı migration'larını çalıştır
docker-compose exec web python manage.py migrate

# Superuser oluştur
docker-compose exec web python manage.py createsuperuser
```

### 3. Uygulamaya erişim
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Admin Panel**: http://localhost:8001/admin

## 📊 Veritabanı Şeması

### Ana Modeller

#### Sulama Sistemi Hiyerarşisi
```
Bölge
├── Sulama Sistemi
    ├── Depolama Tesisi
    │   ├── Kanal
    │   │   ├── Kanal Abak
    │   │   └── Günlük Su Miktarı
    │   ├── Depolama Tesisi Abak
    │   └── Günlük Depolama Su Miktarı
    └── Ürün
        ├── Ürün Kategorisi
        └── Yıllık Su Tüketimi
```

#### Makina Takip Sistemi
```
Makina
├── Makina Konum
│   ├── Enlem/Boylam
│   └── Motor Durumu
└── Makina İş
    ├── İş Tipi
    ├── Başlık
    └── Açıklama
```

#### Kullanıcı Yönetimi
```
User (Django)
├── Kullanıcı Profili
    ├── Kullanıcı Sulama Yetkisi
    ├── Giriş Kaydı
    └── Sistem Ayarları
```

## 🔐 Yetkilendirme Sistemi

### Yetki Seviyeleri
1. **SADECE_OKUMA**: Veri görüntüleme
2. **VERI_GIRISI**: Veri ekleme/düzenleme
3. **YONETICI**: Silme işlemleri
4. **SUPER_YONETICI**: Tüm yetkiler

### Kullanım Örnekleri

```python
# Permission kullanımı
from authentication.permissions import SulamaYetkisiPermission

class MyViewSet(viewsets.ModelViewSet):
    permission_classes = [SulamaYetkisiPermission]

# Mixin kullanımı
from authentication.permissions import SulamaBazliMixin

class MyView(SulamaBazliMixin, ListView):
    def get_queryset(self):
        return self.get_kullanici_sulamalari()
```

## 📝 API Kullanımı

### Kimlik Doğrulama
```bash
# Token al
curl -X POST http://localhost:8001/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password"}'
```

### Veri Erişimi
```bash
# Bölgeleri listele
curl -H "Authorization: Bearer <token>" \
     http://localhost:8001/api/bolgeler/

# Makinaları listele
curl -H "Authorization: Bearer <token>" \
     http://localhost:8001/api/sulama/makinalar/
```

## 🛠️ Geliştirme

### Yeni Migration
```bash
docker-compose exec web python manage.py makemigrations
docker-compose exec web python manage.py migrate
```

### Frontend Geliştirme
```bash
# Frontend container'ına bağlan
docker-compose exec frontend bash

# Yeni paket ekle
npm install <package-name>
```

### Test Çalıştırma
```bash
docker-compose exec web python manage.py test
```

### Shell Erişimi
```bash
docker-compose exec web python manage.py shell
```

## 📊 Veri Modeli Örnekleri

### Bölge Oluşturma
```python
from sulama.models import Bolge

bolge = Bolge.objects.create(
    isim="Konya Bölgesi",
    yonetici="Ali Veli",
    adres="Konya, Türkiye"
)
```

### Makina Ekleme
```python
from sulama.models import Makina

makina = Makina.objects.create(
    birlik_no="MAK-001",
    isim="Traktör-001",
    makina_tipi="traktor",
    plaka="34 ABC 123",
    durum="aktif"
)
```

### Kullanıcı Yetkisi Verme
```python
from authentication.models import KullaniciSulamaYetkisi
from django.contrib.auth.models import User
from sulama.models import Sulama

kullanici = User.objects.get(username='operator1')
sulama = Sulama.objects.get(isim='Karapınar Sulama')

KullaniciSulamaYetkisi.objects.create(
    kullanici_profili=kullanici.profil,
    sulama=sulama,
    yetki_seviyesi='VERI_GIRISI'
)
```

## 🔧 Yapılandırma

### Çevre Değişkenleri
- `DATABASE_URL`: PostgreSQL bağlantı string'i
- `DEBUG`: Debug modu (True/False)
- `SECRET_KEY`: Django secret key
- `ALLOWED_HOSTS`: İzin verilen host'lar
- `NEXT_PUBLIC_API_URL`: Frontend için API URL'i

### Docker Compose Portları
- **Frontend**: 3000:3000
- **Backend**: 8001:8000
- **Database**: 5433:5432
- **Nginx**: 80:80

## 📈 Performans

### Optimizasyon İpuçları
- Veritabanı indexleri kullanılmıştır
- Select_related ve prefetch_related kullanımı
- Pagination API'lerde aktif
- Frontend'de lazy loading
- Harita için optimizasyon

## 🚨 Güvenlik

### Uygulanan Güvenlik Önlemleri
- Kullanıcı bazlı erişim kontrolü
- Sulama sistemine özgü veri filtreleme
- Giriş kayıtları
- CORS koruması
- SQL injection koruması (Django ORM)
- Frontend'de authentication kontrolü

## 📞 Destek

### Sorun Bildirme
GitHub Issues bölümünden sorun bildirebilirsiniz.

### Geliştirici Katkıları
Pull request'ler memnuniyetle karşılanır.

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

## 🚀 Hızlı Başlangıç Komutu

```bash
# Tek komutla çalıştır
docker-compose up -d && \
docker-compose exec web python manage.py migrate && \
echo "Sistem hazır! http://localhost:3000 adresinden erişebilirsiniz."
```

**Not**: Superuser oluşturmayı unutmayın! 

## 🎯 Son Güncellemeler

- ✅ Makina takip modülü eklendi
- ✅ Harita entegrasyonu tamamlandı
- ✅ Tam ekran harita modu eklendi
- ✅ Modern UI/UX tasarımı uygulandı
- ✅ Docker containerization tamamlandı
- ✅ Production ready hale getirildi
