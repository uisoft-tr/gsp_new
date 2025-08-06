# Makina Takip Modülü

Bu modül, sulama sistemlerinde makina takibi için geliştirilmiş bağımsız bir modüldür. Ana sulama modülüne hiç dokunmadan entegre edilebilir.

## 📁 Modül İçeriği

### Backend (Django) Dosyaları

#### 1. Model Dosyaları
- `models.py` - Makina, MakinaKonum, MakinaIs modelleri
- `migrations/` - Veritabanı migration dosyaları

#### 2. API Dosyaları
- `views.py` - MakinaViewSet, MakinaKonumViewSet, MakinaIsViewSet
- `serializers.py` - MakinaSerializer, MakinaKonumSerializer, MakinaIsSerializer
- `urls.py` - API endpoint'leri

#### 3. Admin Dosyaları
- `admin.py` - Django admin paneli konfigürasyonu

### Frontend (Next.js) Dosyaları

#### 1. Ana Sayfa
- `makina-takip/page.js` - Ana makina takip sayfası

#### 2. Alt Sayfalar
- `makina-takip/ekle/page.js` - Yeni makina ekleme
- `makina-takip/[id]/duzenle/page.js` - Makina düzenleme
- `makina-takip/is-takip/page.js` - İş takibi
- `makina-takip/konum-guncelle/` - Konum güncelleme

#### 3. Bileşenler
- `components/MakinaHarita.js` - Harita bileşeni
- `components/MakinaDetayPaneli.js` - Detay paneli

## 🚀 Kurulum Talimatları

### 1. Backend Entegrasyonu

#### A. Model Dosyalarını Kopyalayın
```bash
# models.py dosyasından makina modellerini kopyalayın
# Makina, MakinaKonum, MakinaIs sınıflarını ekleyin
```

#### B. Migration Dosyalarını Kopyalayın
```bash
# migrations/ klasöründeki makina ile ilgili dosyaları kopyalayın
# 0004_makina_makinakonum_makinais.py
# 0005_alter_makina_sulama.py
# 0006_remove_makinakonum_hiz_and_more.py
# 0007_add_birlik_no_to_makina.py
# 0008_makinais_calistigi_yer_and_more.py
```

#### C. API Dosyalarını Güncelleyin
```python
# views.py - MakinaViewSet'leri ekleyin
# serializers.py - MakinaSerializer'ları ekleyin
# urls.py - Makina URL'lerini ekleyin
```

#### D. Admin Paneli
```python
# admin.py - Makina admin konfigürasyonunu ekleyin
```

### 2. Frontend Entegrasyonu

#### A. Sayfa Dosyalarını Kopyalayın
```bash
# gsp-frontend/src/app/makina-takip/ klasörünü kopyalayın
```

#### B. Bileşenleri Kopyalayın
```bash
# gsp-frontend/src/components/MakinaHarita.js
# gsp-frontend/src/components/MakinaDetayPaneli.js
```

#### C. Navigation'a Menü Ekleyin
```javascript
// Navigation.js dosyasına makina takip menüsünü ekleyin
```

## 🔧 Gereksinimler

### Backend
- Django 4.x
- Django REST Framework
- Django Filter
- Leaflet (harita için)

### Frontend
- Next.js 13+
- React 18+
- Leaflet (harita için)
- Tailwind CSS

## 📋 Özellikler

### ✅ Tamamlanan Özellikler
- ✅ Makina listesi görüntüleme
- ✅ Makina ekleme/düzenleme
- ✅ Harita üzerinde makina konumları
- ✅ Makina iş takibi
- ✅ Konum güncelleme
- ✅ Detay paneli
- ✅ API entegrasyonu
- ✅ Yetkilendirme sistemi

### 🎯 API Endpoint'leri
- `GET /api/sulama/makinalar/` - Makina listesi
- `POST /api/sulama/makinalar/` - Yeni makina
- `GET /api/sulama/makinalar/{id}/` - Makina detayı
- `PUT /api/sulama/makinalar/{id}/` - Makina güncelleme
- `DELETE /api/sulama/makinalar/{id}/` - Makina silme
- `GET /api/sulama/makinalar/harita_verileri/` - Harita verileri
- `POST /api/sulama/makina-konumlar/toplu_guncelle/` - Toplu konum güncelleme
- `POST /api/sulama/makina-isler/{id}/baslat/` - İş başlatma
- `POST /api/sulama/makina-isler/{id}/bitir/` - İş bitirme

## 🔒 Güvenlik

- Sulama bazlı yetkilendirme sistemi
- Token tabanlı kimlik doğrulama
- Kullanıcı bazlı veri erişimi

## 📊 Veritabanı Şeması

### Makina Tablosu
- `id` - Primary Key
- `birlik_no` - Benzersiz birlik numarası
- `isim` - Makina adı
- `makina_tipi` - Makina tipi (traktör, ekskavatör, vb.)
- `plaka` - Plaka numarası
- `model` - Model bilgisi
- `yil` - Üretim yılı
- `durum` - Durum (aktif, pasif, bakımda, arızalı)
- `sulama` - Foreign Key (Sulama sistemi)
- `aciklama` - Açıklama
- `olusturma_tarihi` - Oluşturma tarihi
- `guncelleme_tarihi` - Güncelleme tarihi

### MakinaKonum Tablosu
- `id` - Primary Key
- `makina` - Foreign Key (Makina)
- `enlem` - Enlem koordinatı
- `boylam` - Boylam koordinatı
- `kayit_zamani` - Kayıt zamanı

### MakinaIs Tablosu
- `id` - Primary Key
- `makina` - Foreign Key (Makina)
- `is_tipi` - İş tipi (sulama, bakım, tamir, vb.)
- `baslik` - İş başlığı
- `aciklama` - İş açıklaması
- `calistigi_yer` - Çalıştığı yer
- `baslangic_zamani` - Başlangıç zamanı
- `bitis_zamani` - Bitiş zamanı
- `durum` - Durum (planlandı, devam ediyor, tamamlandı, iptal)
- `enlem` - İş yeri enlem
- `boylam` - İş yeri boylam
- `olusturma_tarihi` - Oluşturma tarihi

## 🎨 Kullanıcı Arayüzü

### Ana Sayfa Özellikleri
- Harita görünümü (Leaflet)
- Liste görünümü
- Makina filtreleme
- Arama fonksiyonu
- Detay paneli

### Harita Özellikleri
- Makina konumları
- Popup bilgileri
- Konum güncelleme
- İş durumu gösterimi

## 🔄 Güncelleme ve Bakım

### Migration Çalıştırma
```bash
python manage.py makemigrations
python manage.py migrate
```

### Test Etme
```bash
python manage.py test sulama.tests
```

## 📞 Destek

Bu modül ile ilgili sorularınız için:
- GitHub Issues
- E-posta desteği

## 📄 Lisans

Bu modül, ana proje ile aynı lisans altında dağıtılmaktadır. 