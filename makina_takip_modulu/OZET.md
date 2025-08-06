# 🚜 Makina Takip Modülü - Özet

## 📦 Modül İçeriği

Bu klasör, **makina takip modülünün** tamamını içerir. Ana sulama modülüne hiç dokunmadan yeni projelere entegre edilebilir.

### 📁 Klasör Yapısı

```
makina_takip_modulu/
├── README.md              # Modül açıklaması
├── KURULUM.md             # Detaylı kurulum talimatları
├── OZET.md               # Bu dosya
├── backend/              # Django backend dosyaları
│   ├── models.py         # Makina modelleri
│   ├── serializers.py    # API serializer'ları
│   ├── views.py          # API view'ları
│   ├── urls.py           # URL konfigürasyonu
│   ├── admin.py          # Admin paneli
│   └── migrations/       # Veritabanı migration'ları
└── frontend/             # Next.js frontend dosyaları
    ├── makina-takip/     # Ana sayfa ve alt sayfalar
    └── components/       # React bileşenleri
```

## 🎯 Modül Özellikleri

### ✅ Backend Özellikleri
- **3 Ana Model**: Makina, MakinaKonum, MakinaIs
- **REST API**: Tam CRUD işlemleri
- **Yetkilendirme**: Sulama bazlı erişim kontrolü
- **Admin Panel**: Django admin entegrasyonu
- **Harita API**: Konum verileri için özel endpoint

### ✅ Frontend Özellikleri
- **Harita Görünümü**: Leaflet ile interaktif harita
- **Liste Görünümü**: Tablo formatında makina listesi
- **Detay Paneli**: Makina bilgileri ve iş geçmişi
- **CRUD İşlemleri**: Ekleme, düzenleme, silme
- **İş Takibi**: Makina işlerini başlatma/bitirme
- **Konum Güncelleme**: Toplu konum güncelleme

## 🚀 Hızlı Başlangıç

### 1. Backend Entegrasyonu
```bash
# 1. Model dosyalarını kopyalayın
# 2. Serializer'ları ekleyin
# 3. View'ları ekleyin
# 4. URL'leri güncelleyin
# 5. Admin konfigürasyonunu ekleyin
# 6. Migration'ları çalıştırın
```

### 2. Frontend Entegrasyonu
```bash
# 1. Sayfa dosyalarını kopyalayın
# 2. Bileşenleri ekleyin
# 3. Navigation'a menü ekleyin
# 4. API endpoint'lerini güncelleyin
```

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

## 🎯 API Endpoint'leri

### Makina Yönetimi
- `GET /api/sulama/makinalar/` - Makina listesi
- `POST /api/sulama/makinalar/` - Yeni makina
- `GET /api/sulama/makinalar/{id}/` - Makina detayı
- `PUT /api/sulama/makinalar/{id}/` - Makina güncelleme
- `DELETE /api/sulama/makinalar/{id}/` - Makina silme
- `GET /api/sulama/makinalar/harita_verileri/` - Harita verileri

### Konum Yönetimi
- `GET /api/sulama/makina-konumlar/` - Konum listesi
- `POST /api/sulama/makina-konumlar/` - Yeni konum
- `POST /api/sulama/makina-konumlar/toplu_guncelle/` - Toplu güncelleme

### İş Yönetimi
- `GET /api/sulama/makina-isler/` - İş listesi
- `POST /api/sulama/makina-isler/` - Yeni iş
- `POST /api/sulama/makina-isler/{id}/baslat/` - İş başlatma
- `POST /api/sulama/makina-isler/{id}/bitir/` - İş bitirme

## 🔧 Gereksinimler

### Backend
- Django 4.x
- Django REST Framework
- Django Filter
- PostgreSQL/SQLite

### Frontend
- Next.js 13+
- React 18+
- Leaflet (harita)
- Tailwind CSS

## 🎨 Kullanıcı Arayüzü

### Ana Sayfa Özellikleri
- **Harita Görünümü**: Makinaları harita üzerinde görüntüleme
- **Liste Görünümü**: Tablo formatında makina listesi
- **Filtreleme**: Makina tipi, durum, sulama sistemi
- **Arama**: Makina adı, plaka, model
- **Detay Paneli**: Seçili makina bilgileri

### Harita Özellikleri
- **Makina Konumları**: GPS koordinatları ile
- **Popup Bilgileri**: Makina detayları
- **Durum Göstergeleri**: Renkli ikonlar
- **İş Durumu**: Aktif işler için özel gösterim

## 🔒 Güvenlik

- **Token Tabanlı Kimlik Doğrulama**
- **Sulama Bazlı Yetkilendirme**
- **Kullanıcı Bazlı Veri Erişimi**
- **API Güvenliği**

## 📈 Performans

- **Optimized Queries**: Select related ve prefetch
- **Pagination**: Büyük veri setleri için
- **Caching**: Harita verileri için
- **Lazy Loading**: Bileşen yükleme

## 🚀 Gelecek Özellikler

- [ ] Gerçek zamanlı konum takibi
- [ ] Mobil uygulama entegrasyonu
- [ ] Bildirim sistemi
- [ ] Raporlama modülü
- [ ] Bakım planlama
- [ ] Yakıt takibi

## 📞 Destek

Bu modül ile ilgili sorularınız için:
- **Dokümantasyon**: README.md ve KURULUM.md
- **Örnek Kodlar**: Backend ve frontend dosyaları
- **Migration Dosyaları**: Veritabanı şeması

## 🎉 Sonuç

Bu modül, **tamamen bağımsız** ve **yeniden kullanılabilir** bir yapıda tasarlanmıştır. Ana sulama modülüne hiç dokunmadan, yeni projelere kolayca entegre edilebilir.

**Modüler yapı** sayesinde:
- ✅ Kolay entegrasyon
- ✅ Bağımsız geliştirme
- ✅ Yeniden kullanılabilirlik
- ✅ Temiz kod yapısı
- ✅ Kapsamlı dokümantasyon

**Makina takip modülünüz hazır!** 🚜✨ 