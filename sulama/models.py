from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator



class Bolge(models.Model):
    isim = models.CharField(max_length=100, unique=True, verbose_name="Bölge Adı")
    aciklama = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    bolge_iletisim = models.CharField(max_length=100, null=True, blank=True, verbose_name="İletişim")
    yonetici = models.CharField(max_length=100, null=True, blank=True, verbose_name="Yönetici")
    adres = models.CharField(max_length=255, null=True, blank=True, verbose_name="Adres")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def __str__(self):
        return self.isim
    
    class Meta:
        verbose_name_plural = "Birlikler"
        verbose_name = "Birlik"
        ordering = ['isim']
       
class Sulama(models.Model):
    bolge = models.ForeignKey(Bolge, on_delete=models.CASCADE, related_name='sulamalar', verbose_name="Bölge")
    isim = models.CharField(max_length=100, verbose_name="Sulama  Adi")
    aciklama = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def __str__(self):
        return f"{self.bolge.isim} - {self.isim}"
    
    class Meta:
        verbose_name_plural = "Sulama "
        verbose_name = "Sulama Adi"
        unique_together = ['bolge', 'isim']
        ordering = ['bolge__isim', 'isim']

class DepolamaTesisi(models.Model):
    isim = models.CharField(max_length=100, verbose_name="Tesis Adı")
    aciklama = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    geometri = models.TextField(null=True, blank=True, verbose_name="Geometri (JSON)")
    kret_kotu = models.FloatField(null=True, blank=True, verbose_name="Kret Kotu (m)")
    maksimum_su_kot = models.FloatField(null=True, blank=True, verbose_name="Maksimum Su Kotu (m)")
    minimum_su_kot = models.FloatField(null=True, blank=True, verbose_name="Minimum Su Kotu (m)")
    maksimum_hacim = models.FloatField(null=True, blank=True, verbose_name="Maksimum Hacim (m³)")
    minimum_hacim = models.FloatField(null=True, blank=True, verbose_name="Minimum Hacim (m³)")
    sulama = models.ForeignKey(Sulama, on_delete=models.CASCADE, related_name='depolama_tesisleri', verbose_name="Sulama Adi")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def __str__(self):
        return f"{self.sulama.bolge.isim} - {self.isim}"

    class Meta:
        verbose_name_plural = "Depolama Tesisleri"
        verbose_name = "Depolama Tesisi"
        unique_together = ['sulama', 'isim']
        ordering = ['sulama__bolge__isim', 'isim']

class DepolamaTesisiAbak(models.Model):
    depolama_tesisi = models.ForeignKey(DepolamaTesisi, on_delete=models.CASCADE, related_name='abaklar', verbose_name="Depolama Tesisi")
    hacim = models.FloatField(validators=[MinValueValidator(0)], verbose_name="Hacim (m³)")
    kot = models.FloatField(verbose_name="Kot (m)")

    def __str__(self):
        return f"{self.depolama_tesisi.isim} - Hacim: {self.hacim} m³"

    class Meta:
        verbose_name_plural = "Depolama Tesisi Abakları"
        verbose_name = "Depolama Tesisi Abağı"
        unique_together = ['depolama_tesisi', 'kot']
        ordering = ['depolama_tesisi', 'kot']

class Kanal(models.Model):
    depolama_tesisi = models.ForeignKey(DepolamaTesisi, on_delete=models.CASCADE, related_name='kanallar', verbose_name="Depolama Tesisi")
    isim = models.CharField(max_length=100, verbose_name="Kanal Adı")
    aciklama = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    kanal_kodu = models.CharField(max_length=20, null=True, blank=True, verbose_name="Kanal Kodu")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def save(self, *args, **kwargs):
        # İlk kaydetme işlemi
        if not self.pk and not self.kanal_kodu:
            super().save(*args, **kwargs)  # ID'yi alabilmek için kaydet
            self.kanal_kodu = f"S-{self.pk}"
            super().save(*args, **kwargs)  # Kodu güncellemek için tekrar kaydet
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.depolama_tesisi.isim} - {self.isim}"

    class Meta:
        verbose_name_plural = "Kanallar"
        verbose_name = "Kanal"
        unique_together = ['depolama_tesisi', 'isim']
        ordering = ['depolama_tesisi', 'isim']

class KanalAbak(models.Model):
    kanal = models.ForeignKey(Kanal, on_delete=models.CASCADE, related_name='abaklar', verbose_name="Kanal")
    hacim = models.FloatField(validators=[MinValueValidator(0)], verbose_name="Hacim (m³)")
    yukseklik = models.FloatField(verbose_name="Yükseklik (m)")

    def __str__(self):
        return f"{self.kanal.isim} - Yükseklik: {self.yukseklik} m"

    class Meta:
        verbose_name_plural = "Kanal Abakları"
        verbose_name = "Kanal Abağı"
        unique_together = ['kanal', 'yukseklik']
        ordering = ['kanal', 'yukseklik']
    
class GunlukSebekeyeAlinanSuMiktari(models.Model):
    kanal = models.ForeignKey(Kanal, on_delete=models.CASCADE, related_name='gunluk_su_miktarlari', verbose_name="Kanal")
    tarih = models.DateField(verbose_name="Tarih")
    baslangic_saati = models.DateTimeField(verbose_name="Başlangıç Saati")
    bitis_saati = models.DateTimeField(verbose_name="Bitiş Saati")
    yukseklik = models.FloatField(verbose_name="Yükseklik (m)",null=True, blank=True)
    su_miktari = models.FloatField(validators=[MinValueValidator(0)], verbose_name="Su Miktarı (m³)")

    def hesapla_su_miktari(self):
        """Yükseklik değerine göre kanal abağından su miktarını hesapla - Birebir eşleşme gerekli"""
        if not self.yukseklik or not self.kanal_id:
            return 0
        
        # Kanala ait abakları kontrol et - TAM EŞLEŞMELİ
        try:
            abak = self.kanal.abaklar.get(yukseklik=self.yukseklik)
            return abak.hacim
        except KanalAbak.DoesNotExist:
            # Eğer tam eşleşme yoksa 0 döndür
            return 0

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.baslangic_saati and self.bitis_saati:
            if self.baslangic_saati >= self.bitis_saati:
                raise ValidationError("Başlangıç saati bitiş saatinden önce olmalıdır.")

    def save(self, *args, **kwargs):
        # Su miktarını otomatik hesapla (eğer manuel olarak set edilmemişse)
        if self.yukseklik and not kwargs.pop('manuel_su_miktari', False):
            self.su_miktari = self.hesapla_su_miktari()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.kanal.isim} - {self.tarih} - {self.su_miktari} m³"

    class Meta:
        verbose_name_plural = "Günlük Şebekeye Alınan Su Miktarları"
        verbose_name = "Günlük Şebekeye Alınan Su Miktarı"
        unique_together = ['kanal', 'tarih', 'baslangic_saati']
        ordering = ['-tarih', 'kanal']

class GunlukDepolamaTesisiSuMiktari(models.Model):
    depolama_tesisi = models.ForeignKey(DepolamaTesisi, on_delete=models.CASCADE, related_name='gunluk_depolama_tesisi_su_miktarlari', verbose_name="Depolama Tesisi")
    tarih = models.DateField(verbose_name="Tarih")
    kot = models.FloatField(verbose_name="Kot (m)")
    su_miktari = models.FloatField(validators=[MinValueValidator(0)], verbose_name="Su Miktarı (m³)")

    def __str__(self):
        return f"{self.depolama_tesisi.isim} - {self.tarih} - {self.su_miktari} m³"
    
    class Meta:
        verbose_name_plural = "Günlük Depolama Tesisi Su Miktarları"
        verbose_name = "Günlük Depolama Tesisi Su Miktarı"
        unique_together = ['depolama_tesisi', 'tarih']
        ordering = ['-tarih', 'depolama_tesisi']

class UrunKategorisi(models.Model):
    isim = models.CharField(max_length=100, unique=True, verbose_name="Kategori Adı")
    aciklama = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def __str__(self):
        return self.isim

    class Meta:
        verbose_name_plural = "Ürün Kategorileri"
        verbose_name = "Ürün Kategorisi"
        ordering = ['isim']

class Urun(models.Model):
    sulama = models.ForeignKey(Sulama, on_delete=models.CASCADE, related_name='urunler', verbose_name="Sulama Adi")
    isim = models.CharField(max_length=100, verbose_name="Ürün Adı")
    kategori = models.ManyToManyField(UrunKategorisi, related_name='urunler', blank=True, verbose_name="Kategoriler")
    baslangic_tarihi = models.DateField(
        null=True, blank=True,
        verbose_name="Başlangıç Tarihi",
        help_text="Ürünün ekiliş tarihi"
    )
    bitis_tarihi = models.DateField(
        null=True, blank=True,
        verbose_name="Bitiş Tarihi",
        help_text="Ürünün hasat tarihi"
    )
    kar_orani = models.FloatField(null=True, blank=True, verbose_name="Kar Oranı (%)", validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Aylık su tüketim katsayıları (Kc değerleri olabilir)
    ocak = models.FloatField(null=True, blank=True, verbose_name="Ocak Katsayısı", validators=[MinValueValidator(0)])
    subat = models.FloatField(null=True, blank=True, verbose_name="Şubat Katsayısı", validators=[MinValueValidator(0)])
    mart = models.FloatField(null=True, blank=True, verbose_name="Mart Katsayısı", validators=[MinValueValidator(0)])
    nisan = models.FloatField(null=True, blank=True, verbose_name="Nisan Katsayısı", validators=[MinValueValidator(0)])
    mayis = models.FloatField(null=True, blank=True, verbose_name="Mayıs Katsayısı", validators=[MinValueValidator(0)])
    haziran = models.FloatField(null=True, blank=True, verbose_name="Haziran Katsayısı", validators=[MinValueValidator(0)])
    temmuz = models.FloatField(null=True, blank=True, verbose_name="Temmuz Katsayısı", validators=[MinValueValidator(0)])
    agustos = models.FloatField(null=True, blank=True, verbose_name="Ağustos Katsayısı", validators=[MinValueValidator(0)])
    eylul = models.FloatField(null=True, blank=True, verbose_name="Eylül Katsayısı", validators=[MinValueValidator(0)])
    ekim = models.FloatField(null=True, blank=True, verbose_name="Ekim Katsayısı", validators=[MinValueValidator(0)])
    kasim = models.FloatField(null=True, blank=True, verbose_name="Kasım Katsayısı", validators=[MinValueValidator(0)])
    aralik = models.FloatField(null=True, blank=True, verbose_name="Aralık Katsayısı", validators=[MinValueValidator(0)])

    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def get_aylik_katsayilar(self):
        """Aylık katsayıları dict olarak döndür"""
        return {
            'ocak': self.ocak, 'subat': self.subat, 'mart': self.mart,
            'nisan': self.nisan, 'mayis': self.mayis, 'haziran': self.haziran,
            'temmuz': self.temmuz, 'agustos': self.agustos, 'eylul': self.eylul,
            'ekim': self.ekim, 'kasim': self.kasim, 'aralik': self.aralik
        }

    def __str__(self):
        result = self.isim
        if self.baslangic_tarihi and self.bitis_tarihi:
            baslangic = f"{self.baslangic_tarihi:.2f}"
            bitis = f"{self.bitis_tarihi:.2f}"
            result += f" {baslangic}/{bitis}"
        elif self.baslangic_tarihi:
            baslangic = f"{self.baslangic_tarihi:.2f}"
            result += f" {baslangic}"
        if self.kar_orani is not None:
            result += f" K.A.R : {self.kar_orani:.0f}"
        return result

    class Meta:
        verbose_name_plural = "Ürünler"
        verbose_name = "Ürün"
        unique_together = ['sulama', 'isim']
        ordering = ['sulama__bolge__isim', 'sulama__isim', 'isim']

class YillikGenelSuTuketimi(models.Model):
    """Ana tablo - Yıl ve sulama  başına tek kayıt"""
    yil = models.IntegerField(verbose_name="Yıl", validators=[MinValueValidator(2000), MaxValueValidator(2050)])
    sulama = models.ForeignKey(Sulama, on_delete=models.CASCADE, related_name='yillik_genel_su_tuketimi', verbose_name="Sulama Adi")
    ciftlik_randi = models.FloatField(verbose_name="Çiftlik Randı (%)", default=80, validators=[MinValueValidator(0), MaxValueValidator(100)])
    iletim_randi = models.FloatField(verbose_name="İletim Randı (%)", default=85, validators=[MinValueValidator(0), MaxValueValidator(100)])
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def get_toplam_randi(self):
        """Toplam randı hesapla"""
        if self.ciftlik_randi is not None and self.iletim_randi is not None:
            return (self.ciftlik_randi * self.iletim_randi) / 100
        return 0

    def get_net_su_ihtiyaci(self):
        """Net su ihtiyacını hesapla - tüm ürünlerin toplamı"""
        toplam_su_tuketimi = self.get_toplam_su_tuketimi()
        if toplam_su_tuketimi > 0:
            return toplam_su_tuketimi / 1000  # m³'den hm³'e çevir
        return 0

    def get_toplam_alan(self):
        """Toplam alanı hesapla - tüm ürünlerin toplamı"""
        return self.urun_detaylari.aggregate(
            toplam=Sum('alan')
        )['toplam'] or 0

    def get_toplam_su_tuketimi(self):
        """Toplam su tüketimini hesapla - tüm ürünlerin toplamı"""
        return self.urun_detaylari.aggregate(
            toplam=Sum('su_tuketimi')
        )['toplam'] or 0
  
    def __str__(self):
        return f"{self.yil} - {self.sulama.isim} - {self.urun_detaylari.count()} ürün"
    
    class Meta:
        verbose_name_plural = "Yıllık Genel Su Tüketimi"
        verbose_name = "Yıllık Genel Su Tüketimi"
     
        ordering = ['-yil', 'sulama__bolge__isim', 'sulama__isim']


class YillikUrunDetay(models.Model):
    """Detay tablo - Her ürün için ayrı kayıt"""
    yillik_tuketim = models.ForeignKey(YillikGenelSuTuketimi, on_delete=models.CASCADE, related_name='urun_detaylari', verbose_name="Yıllık Tüketim")
    urun = models.ForeignKey(Urun, on_delete=models.CASCADE, related_name='yillik_urun_detaylari', verbose_name="Ürün")
    alan = models.FloatField(verbose_name="Alan (ha)", validators=[MinValueValidator(0)])
    ekim_orani = models.FloatField(verbose_name="Ekim Oranı (%)", default=100, validators=[MinValueValidator(0), MaxValueValidator(100)])
    su_tuketimi = models.FloatField(verbose_name="Su Tüketimi (m³)", validators=[MinValueValidator(0)])
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")

    def get_birim_su_tuketimi(self):
        """Birim su tüketimini hesapla (m³/ha)"""
        if self.alan > 0:
            return self.su_tuketimi / self.alan
        return 0

    def get_net_su_ihtiyaci(self):
        """Bu ürün için net su ihtiyacını hesapla (hm³)"""
        return (self.alan * self.get_ur_toplami()) / 100000

    def get_ur_toplami(self):
        """Bu ürünün yıllık UR toplamını hesapla"""
        if not self.urun:
            return 0
        
        ur_degerleri = [
            self.urun.ocak or 0, self.urun.subat or 0, self.urun.mart or 0,
            self.urun.nisan or 0, self.urun.mayis or 0, self.urun.haziran or 0,
            self.urun.temmuz or 0, self.urun.agustos or 0, self.urun.eylul or 0,
            self.urun.ekim or 0, self.urun.kasim or 0, self.urun.aralik or 0
        ]
        
        return sum(ur_degerleri)

    def __str__(self):
        return f"{self.yillik_tuketim.yil} - {self.urun.isim} - {self.alan} ha"
    
    class Meta:
        verbose_name_plural = "Yıllık Ürün Detayları"
        verbose_name = "Yıllık Ürün Detayı"
        unique_together = ['yillik_tuketim', 'urun']
        ordering = ['yillik_tuketim__yil', '-ekim_orani', 'urun__isim']

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
    
    birlik_no = models.CharField(max_length=50, unique=True, verbose_name="Birlik No", help_text="Makina için benzersiz birlik numarası")
    isim = models.CharField(max_length=100, verbose_name="Makina Adı")
    makina_tipi = models.CharField(max_length=20, choices=MAKINA_TIPLERI, verbose_name="Makina Tipi")
    plaka = models.CharField(max_length=20, blank=True, null=True, verbose_name="Plaka")
    model = models.CharField(max_length=50, blank=True, null=True, verbose_name="Model")
    yil = models.IntegerField(blank=True, null=True, verbose_name="Üretim Yılı")
    durum = models.CharField(max_length=10, choices=DURUM_CHOICES, default='aktif', verbose_name="Durum")
    sulama = models.ForeignKey(Sulama, on_delete=models.SET_NULL, null=True, blank=True, related_name='makinalar', verbose_name="Sulama Sistemi")
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