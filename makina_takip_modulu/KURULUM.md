# Makina Takip Modülü - Kurulum Talimatları

Bu dosya, makina takip modülünü yeni bir sulama projesine nasıl entegre edeceğinizi adım adım açıklar.

## 📋 Ön Gereksinimler

- Django 4.x projesi
- Django REST Framework
- Next.js 13+ frontend
- Leaflet (harita için)
- Tailwind CSS

## 🚀 Backend Entegrasyonu

### 1. Model Dosyalarını Ekleyin

`models.py` dosyasına şu sınıfları ekleyin:

```python
# Makina Takip Modülü - Models
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

class Makina(models.Model):
    """Makina takip sistemi için ana model"""
    MAKINA_TIPLERI = [
        ('traktor', 'Traktör'),
        ('ekskavator', 'Ekskavatör'),
        ('buldozer', 'Buldozer'),
        ('yukleyici', 'Yükleyici'),
        ('diger', 'Diğer'),
    ]
    
    DURUM_CHOICES = [
        ('aktif', 'Aktif'),
        ('pasif', 'Pasif'),
        ('bakim', 'Bakımda'),
        ('ariza', 'Arızalı'),
    ]
    
    birlik_no = models.CharField(max_length=50, unique=True, verbose_name="Birlik No")
    isim = models.CharField(max_length=100, verbose_name="Makina Adı")
    makina_tipi = models.CharField(max_length=20, choices=MAKINA_TIPLERI, verbose_name="Makina Tipi")
    plaka = models.CharField(max_length=20, blank=True, null=True, verbose_name="Plaka")
    model = models.CharField(max_length=50, blank=True, null=True, verbose_name="Model")
    yil = models.IntegerField(blank=True, null=True, verbose_name="Üretim Yılı")
    durum = models.CharField(max_length=10, choices=DURUM_CHOICES, default='aktif', verbose_name="Durum")
    sulama = models.ForeignKey('Sulama', on_delete=models.SET_NULL, null=True, blank=True, related_name='makinalar', verbose_name="Sulama Sistemi")
    aciklama = models.TextField(blank=True, null=True, verbose_name="Açıklama")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")
    guncelleme_tarihi = models.DateTimeField(auto_now=True, verbose_name="Güncelleme Tarihi")
    
    def __str__(self):
        return f"{self.birlik_no} - {self.isim} - {self.get_makina_tipi_display()}"
    
    class Meta:
        verbose_name_plural = "Makinalar"
        verbose_name = "Makina"
        ordering = ['sulama__bolge__isim', 'sulama__isim', 'isim']

class MakinaKonum(models.Model):
    """Makina konum takibi"""
    makina = models.ForeignKey(Makina, on_delete=models.CASCADE, related_name='konumlar', verbose_name="Makina")
    enlem = models.DecimalField(max_digits=9, decimal_places=6, verbose_name="Enlem")
    boylam = models.DecimalField(max_digits=9, decimal_places=6, verbose_name="Boylam")
    kayit_zamani = models.DateTimeField(auto_now_add=True, verbose_name="Kayıt Zamanı")

    def __str__(self):
        return f"{self.makina.isim} - {self.kayit_zamani.strftime('%d.%m.%Y %H:%M')}"
    
    class Meta:
        verbose_name_plural = "Makina Konumları"
        verbose_name = "Makina Konumu"
        ordering = ['-kayit_zamani']

class MakinaIs(models.Model):
    """Makina iş takibi"""
    IS_TIPLERI = [
        ('sulama', 'Sulama'),
        ('bakim', 'Bakım'),
        ('tamir', 'Tamir'),
        ('tasima', 'Taşıma'),
        ('kazma', 'Kazma'),
        ('diger', 'Diğer'),
    ]
    
    makina = models.ForeignKey(Makina, on_delete=models.CASCADE, related_name='isler', verbose_name="Makina")
    is_tipi = models.CharField(max_length=20, choices=IS_TIPLERI, verbose_name="İş Tipi")
    baslik = models.CharField(max_length=200, verbose_name="İş Başlığı")
    aciklama = models.TextField(blank=True, null=True, verbose_name="İş Açıklaması")
    calistigi_yer = models.CharField(max_length=200, blank=True, null=True, verbose_name="Çalıştığı Yer")
    baslangic_zamani = models.DateTimeField(blank=True, null=True, verbose_name="Başlangıç Zamanı")
    bitis_zamani = models.DateTimeField(blank=True, null=True, verbose_name="Bitiş Zamanı")
    durum = models.CharField(max_length=20, choices=[
        ('planlandi', 'Planlandı'),
        ('devam_ediyor', 'Devam Ediyor'),
        ('tamamlandi', 'Tamamlandı'),
        ('iptal', 'İptal'),
    ], default='planlandi', verbose_name="Durum")
    enlem = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, verbose_name="İş Yeri Enlem")
    boylam = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, verbose_name="İş Yeri Boylam")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")
    
    def __str__(self):
        return f"{self.makina.isim} - {self.baslik}"
    
    class Meta:
        verbose_name_plural = "Makina İşleri"
        verbose_name = "Makina İşi"
        ordering = ['-baslangic_zamani']
```

### 2. Serializer Dosyalarını Ekleyin

`serializers.py` dosyasına şu sınıfları ekleyin:

```python
# Makina Takip Modülü - Serializers
from rest_framework import serializers
from .models import Makina, MakinaKonum, MakinaIs

class MakinaSerializer(serializers.ModelSerializer):
    makina_tipi_display = serializers.CharField(source='get_makina_tipi_display', read_only=True)
    durum_display = serializers.CharField(source='get_durum_display', read_only=True)
    sulama_isim = serializers.CharField(source='sulama.isim', read_only=True)
    bolge_isim = serializers.CharField(source='sulama.bolge.isim', read_only=True)
    
    class Meta:
        model = Makina
        fields = [
            'id', 'birlik_no', 'isim', 'makina_tipi', 'makina_tipi_display',
            'plaka', 'model', 'yil', 'durum', 'durum_display', 'sulama',
            'sulama_isim', 'bolge_isim', 'aciklama', 'olusturma_tarihi',
            'guncelleme_tarihi'
        ]
        read_only_fields = ['olusturma_tarihi', 'guncelleme_tarihi']

class MakinaKonumSerializer(serializers.ModelSerializer):
    makina_isim = serializers.CharField(source='makina.isim', read_only=True)
    makina_tipi = serializers.CharField(source='makina.makina_tipi', read_only=True)
    
    class Meta:
        model = MakinaKonum
        fields = ['id', 'makina', 'makina_isim', 'makina_tipi', 'enlem', 'boylam', 'kayit_zamani']
        read_only_fields = ['kayit_zamani']

class MakinaIsSerializer(serializers.ModelSerializer):
    makina_isim = serializers.CharField(source='makina.isim', read_only=True)
    makina_tipi = serializers.CharField(source='makina.makina_tipi', read_only=True)
    is_tipi_display = serializers.CharField(source='get_is_tipi_display', read_only=True)
    durum_display = serializers.CharField(source='get_durum_display', read_only=True)
    
    class Meta:
        model = MakinaIs
        fields = [
            'id', 'makina', 'makina_isim', 'makina_tipi', 'is_tipi', 'is_tipi_display',
            'baslik', 'aciklama', 'calistigi_yer', 'baslangic_zamani', 'bitis_zamani',
            'durum', 'durum_display', 'enlem', 'boylam', 'olusturma_tarihi'
        ]
        read_only_fields = ['olusturma_tarihi']
```

### 3. View Dosyalarını Ekleyin

`views.py` dosyasına şu sınıfları ekleyin:

```python
# Makina Takip Modülü - Views
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.utils import timezone
from .models import Makina, MakinaKonum, MakinaIs
from .serializers import MakinaSerializer, MakinaKonumSerializer, MakinaIsSerializer

class MakinaViewSet(SulamaBazliMixin, viewsets.ModelViewSet):
    """
    Makina yönetimi ViewSet
    """
    queryset = Makina.objects.select_related('sulama__bolge').all()
    serializer_class = MakinaSerializer
    permission_classes = [SulamaYetkisiPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sulama', 'makina_tipi', 'durum']
    search_fields = ['isim', 'plaka', 'model', 'sulama__isim']
    ordering_fields = ['isim', 'makina_tipi', 'durum', 'olusturma_tarihi']
    ordering = ['sulama__bolge__isim', 'sulama__isim', 'isim']
    pagination_class = None

    def get_queryset(self):
        """Kullanıcının yetkili olduğu sulama sistemlerine ait makineleri getir"""
        base_queryset = super().get_queryset()
        return self.filter_by_sulama_permission(base_queryset, 'sulama')

    @action(detail=False, methods=['get'])
    def harita_verileri(self, request):
        """Harita için makina konum verilerini getir"""
        makinalar = self.get_queryset().prefetch_related('konumlar', 'isler')
        
        harita_verileri = []
        for makina in makinalar:
            son_konum = makina.konumlar.first()
            aktif_is = makina.isler.filter(durum='devam_ediyor').first()
            
            makina_data = {
                'id': makina.id,
                'birlik_no': makina.birlik_no,
                'isim': makina.isim,
                'makina_tipi': makina.makina_tipi,
                'makina_tipi_display': makina.get_makina_tipi_display(),
                'plaka': makina.plaka,
                'model': makina.model,
                'yil': makina.yil,
                'durum': makina.durum,
                'durum_display': makina.get_durum_display(),
                'sulama': makina.sulama.isim if makina.sulama else None,
                'bolge': makina.sulama.bolge.isim if makina.sulama and makina.sulama.bolge else None,
                'aciklama': makina.aciklama,
                'son_konum': {
                    'enlem': float(son_konum.enlem) if son_konum else None,
                    'boylam': float(son_konum.boylam) if son_konum else None,
                    'kayit_zamani': son_konum.kayit_zamani.isoformat() if son_konum else None,
                } if son_konum else None,
                'aktif_is': {
                    'id': aktif_is.id,
                    'baslik': aktif_is.baslik,
                    'is_tipi': aktif_is.is_tipi,
                    'is_tipi_display': aktif_is.get_is_tipi_display(),
                    'durum': aktif_is.durum,
                    'baslangic_zamani': aktif_is.baslangic_zamani.isoformat() if aktif_is.baslangic_zamani else None,
                } if aktif_is else None,
            }
            harita_verileri.append(makina_data)
        
        return Response({
            'makinalar': harita_verileri,
        })

class MakinaKonumViewSet(SulamaBazliMixin, viewsets.ModelViewSet):
    """
    Makina konum takibi ViewSet
    """
    queryset = MakinaKonum.objects.select_related('makina__sulama__bolge').all()
    serializer_class = MakinaKonumSerializer
    permission_classes = [SulamaYetkisiPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['makina', 'makina__sulama']
    search_fields = ['makina__isim', 'makina__plaka']
    ordering_fields = ['kayit_zamani', 'makina__isim']
    ordering = ['-kayit_zamani']

    def get_queryset(self):
        """Kullanıcının yetkili olduğu sulama sistemlerine ait makina konumlarını getir"""
        base_queryset = super().get_queryset()
        return self.filter_by_sulama_permission(base_queryset, 'makina__sulama')

    @action(detail=False, methods=['post'])
    def toplu_guncelle(self, request):
        """Toplu makina konum güncelleme"""
        veriler = request.data.get('veriler', [])
        guncellenen_sayisi = 0
        
        for veri in veriler:
            makina_id = veri.get('makina_id')
            enlem = veri.get('enlem')
            boylam = veri.get('boylam')
            
            if makina_id and enlem and boylam:
                MakinaKonum.objects.create(
                    makina_id=makina_id,
                    enlem=enlem,
                    boylam=boylam
                )
                guncellenen_sayisi += 1
        
        return Response({
            'message': f'{guncellenen_sayisi} makina konumu güncellendi',
            'guncellenen_sayisi': guncellenen_sayisi
        })

class MakinaIsViewSet(SulamaBazliMixin, viewsets.ModelViewSet):
    """
    Makina iş takibi ViewSet
    """
    queryset = MakinaIs.objects.select_related('makina__sulama__bolge').all()
    serializer_class = MakinaIsSerializer
    permission_classes = [SulamaYetkisiPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['makina', 'makina__sulama', 'is_tipi', 'durum']
    search_fields = ['baslik', 'aciklama', 'makina__isim']
    ordering_fields = ['baslangic_zamani', 'bitis_zamani', 'durum']
    ordering = ['-baslangic_zamani']
    pagination_class = None

    def get_queryset(self):
        """Kullanıcının yetkili olduğu sulama sistemlerine ait makina işlerini getir"""
        base_queryset = super().get_queryset()
        return self.filter_by_sulama_permission(base_queryset, 'makina__sulama')

    @action(detail=True, methods=['post'])
    def baslat(self, request, pk=None):
        """İşi başlat"""
        makina_is = self.get_object()
        makina_is.durum = 'devam_ediyor'
        makina_is.baslangic_zamani = timezone.now()
        makina_is.save()
        
        return Response({
            'message': 'İş başlatıldı',
            'durum': makina_is.durum,
            'baslangic_zamani': makina_is.baslangic_zamani
        })

    @action(detail=True, methods=['post'])
    def bitir(self, request, pk=None):
        """İşi bitir"""
        makina_is = self.get_object()
        makina_is.durum = 'tamamlandi'
        makina_is.bitis_zamani = timezone.now()
        makina_is.save()
        
        return Response({
            'message': 'İş tamamlandı',
            'durum': makina_is.durum,
            'bitis_zamani': makina_is.bitis_zamani
        })
```

### 4. URL Dosyalarını Güncelleyin

`urls.py` dosyasına şu satırları ekleyin:

```python
# Makina takip sistemi
router.register(r'makinalar', MakinaViewSet, basename='makina')
router.register(r'makina-konumlar', MakinaKonumViewSet, basename='makina-konum')
router.register(r'makina-isler', MakinaIsViewSet, basename='makina-is')
```

### 5. Admin Dosyalarını Ekleyin

`admin.py` dosyasına şu sınıfları ekleyin:

```python
# Makina Takip Modülü - Admin
from django.contrib import admin
from .models import Makina, MakinaKonum, MakinaIs

@admin.register(Makina)
class MakinaAdmin(admin.ModelAdmin):
    list_display = ['birlik_no', 'isim', 'makina_tipi', 'plaka', 'durum', 'sulama', 'olusturma_tarihi']
    list_filter = ['makina_tipi', 'durum', 'sulama', 'olusturma_tarihi']
    search_fields = ['birlik_no', 'isim', 'plaka', 'model']
    readonly_fields = ['olusturma_tarihi', 'guncelleme_tarihi']
    ordering = ['sulama__bolge__isim', 'sulama__isim', 'isim']

@admin.register(MakinaKonum)
class MakinaKonumAdmin(admin.ModelAdmin):
    list_display = ['makina', 'enlem', 'boylam', 'kayit_zamani']
    list_filter = ['makina__sulama', 'kayit_zamani']
    search_fields = ['makina__isim', 'makina__plaka']
    readonly_fields = ['kayit_zamani']
    ordering = ['-kayit_zamani']

@admin.register(MakinaIs)
class MakinaIsAdmin(admin.ModelAdmin):
    list_display = ['makina', 'is_tipi', 'baslik', 'durum', 'baslangic_zamani', 'bitis_zamani']
    list_filter = ['is_tipi', 'durum', 'makina__sulama', 'baslangic_zamani']
    search_fields = ['makina__isim', 'baslik', 'aciklama']
    readonly_fields = ['olusturma_tarihi']
    ordering = ['-baslangic_zamani']
```

### 6. Migration Dosyalarını Kopyalayın

Migration dosyalarını `migrations/` klasörüne kopyalayın:
- `0004_makina_makinakonum_makinais.py`
- `0005_alter_makina_sulama.py`
- `0007_add_birlik_no_to_makina.py`

### 7. Migration'ları Çalıştırın

```bash
python manage.py makemigrations
python manage.py migrate
```

## 🎨 Frontend Entegrasyonu

### 1. Sayfa Dosyalarını Kopyalayın

`src/app/makina-takip/` klasörünü frontend projenize kopyalayın.

### 2. Bileşenleri Kopyalayın

`src/components/` klasörüne şu dosyaları kopyalayın:
- `MakinaHarita.js`
- `MakinaDetayPaneli.js`

### 3. Navigation'a Menü Ekleyin

`Navigation.js` dosyasına makina takip menüsünü ekleyin:

```javascript
{
  name: 'Makina Takip',
  href: '/makina-takip',
  icon: '🚜', // veya uygun icon
  current: pathname === '/makina-takip'
}
```

### 4. API Endpoint'lerini Güncelleyin

`api.js` dosyasına makina API endpoint'lerini ekleyin:

```javascript
// Makina API
getMakinalar: () => apiRequest(API_ENDPOINTS.SULAMA.MAKINALAR),
getMakinaHaritaVerileri: () => apiRequest(`${API_ENDPOINTS.SULAMA.MAKINALAR}harita_verileri/`),
createMakina: (data) => apiRequest(API_ENDPOINTS.SULAMA.MAKINALAR, {
    method: 'POST',
    body: JSON.stringify(data),
}),
updateMakina: (id, data) => apiRequest(`${API_ENDPOINTS.SULAMA.MAKINALAR}${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
}),
deleteMakina: (id) => apiRequest(`${API_ENDPOINTS.SULAMA.MAKINALAR}${id}/`, {
    method: 'DELETE',
}),
```

### 5. API Endpoint'lerini Tanımlayın

`API_ENDPOINTS` objesine şu satırları ekleyin:

```javascript
MAKINALAR: `${API_BASE_URL}/api/sulama/makinalar/`,
MAKINA_KONUMLAR: `${API_BASE_URL}/api/sulama/makina-konumlar/`,
MAKINA_ISLER: `${API_BASE_URL}/api/sulama/makina-isler/`,
```

## 🔧 Gerekli Paketler

### Backend
```bash
pip install django-filter
```

### Frontend
```bash
npm install leaflet react-leaflet
```

## ✅ Test Etme

### Backend Test
```bash
python manage.py runserver
# Admin panelinde makina modüllerini kontrol edin
```

### Frontend Test
```bash
npm run dev
# http://localhost:3000/makina-takip adresine gidin
```

## 🎯 Özellikler

✅ Makina listesi görüntüleme
✅ Makina ekleme/düzenleme/silme
✅ Harita üzerinde makina konumları
✅ Makina iş takibi
✅ Konum güncelleme
✅ Detay paneli
✅ API entegrasyonu
✅ Yetkilendirme sistemi

## 📞 Destek

Sorun yaşarsanız:
1. Migration dosyalarını kontrol edin
2. API endpoint'lerini test edin
3. Console hatalarını kontrol edin
4. Veritabanı bağlantısını kontrol edin

Bu modül, ana sulama modülüne hiç dokunmadan entegre edilebilir! 🎉 