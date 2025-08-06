from django.db import models
from django.contrib.auth.models import User, Permission
from django.utils.translation import gettext_lazy as _
from sulama.models import Sulama


class KullaniciProfili(models.Model):
    """Kullanıcı profil modeli - Sulama sistemleri ile ilişki kurar"""
    
    YETKI_SEVIYELERI = [
        ('SADECE_OKUMA', 'Sadece Okuma'),
        ('VERI_GIRISI', 'Veri Girişi'),
        ('YONETICI', 'Yönetici'),
        ('SUPER_YONETICI', 'Süper Yönetici'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Kullanıcı", related_name='profil')
    telefon = models.CharField(max_length=15, null=True, blank=True, verbose_name="Telefon")
    adres = models.TextField(null=True, blank=True, verbose_name="Adres")
    unvan = models.CharField(max_length=100, null=True, blank=True, verbose_name="Ünvan")
    departman = models.CharField(max_length=100, null=True, blank=True, verbose_name="Departman")
    aktif = models.BooleanField(default=True, verbose_name="Aktif")
    olusturma_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturma Tarihi")
    guncelleme_tarihi = models.DateTimeField(auto_now=True, verbose_name="Güncelleme Tarihi")
    
    # Kullanıcının erişebileceği sulama sistemleri
    sulama_sistemleri = models.ManyToManyField(
        Sulama, 
        through='KullaniciSulamaYetkisi', 
        verbose_name="Sulama Sistemleri",
        blank=True
    )
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.unvan or 'Kullanıcı'})"
    
    def get_yetkilendirilen_sulamalar(self):
        """Kullanıcının yetki sahibi olduğu sulama sistemlerini döndür"""
        return self.sulama_sistemleri.all()
    
    def has_sulama_yetkisi(self, sulama, yetki_seviyesi=None):
        """Belirli bir sulama sistemine yetkisi var mı kontrol et"""
        try:
            yetki = self.kullanici_sulama_yetkileri.get(sulama=sulama)
            if yetki_seviyesi:
                yetki_hiyerarsisi = ['SADECE_OKUMA', 'VERI_GIRISI', 'YONETICI', 'SUPER_YONETICI']
                kullanici_seviye = yetki_hiyerarsisi.index(yetki.yetki_seviyesi)
                gereken_seviye = yetki_hiyerarsisi.index(yetki_seviyesi)
                return kullanici_seviye >= gereken_seviye
            return True
        except:
            return False
    
    class Meta:
        verbose_name = "Kullanıcı Profili"
        verbose_name_plural = "Kullanıcı Profilleri"
        ordering = ['user__username']


class KullaniciSulamaYetkisi(models.Model):
    """Kullanıcı ve Sulama sistemi arasındaki yetki ilişkisi"""
    
    YETKI_SEVIYELERI = [
        ('SADECE_OKUMA', 'Sadece Okuma'),
        ('VERI_GIRISI', 'Veri Girişi'),
        ('YONETICI', 'Yönetici'),
        ('SUPER_YONETICI', 'Süper Yönetici'),
    ]
    
    kullanici_profili = models.ForeignKey(
        KullaniciProfili, 
        on_delete=models.CASCADE, 
        verbose_name="Kullanıcı Profili",
        related_name='kullanici_sulama_yetkileri'
    )
    sulama = models.ForeignKey(
        Sulama, 
        on_delete=models.CASCADE, 
        verbose_name="Sulama Sistemi",
        related_name='kullanici_yetkileri'
    )
    yetki_seviyesi = models.CharField(
        max_length=20, 
        choices=YETKI_SEVIYELERI, 
        default='SADECE_OKUMA',
        verbose_name="Yetki Seviyesi"
    )
    baslangic_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Başlangıç Tarihi")
    bitis_tarihi = models.DateTimeField(null=True, blank=True, verbose_name="Bitiş Tarihi")
    aktif = models.BooleanField(default=True, verbose_name="Aktif")
    olusturan = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Oluşturan",
        related_name='olusturulan_yetkiler'
    )
    aciklama = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    
    def __str__(self):
        return f"{self.kullanici_profili.user.username} - {self.sulama.isim} ({self.get_yetki_seviyesi_display()})"
    
    def is_aktif(self):
        """Yetki aktif mi kontrol et"""
        from django.utils import timezone
        if not self.aktif:
            return False
        if self.bitis_tarihi and self.bitis_tarihi < timezone.now():
            return False
        return True
    
    class Meta:
        verbose_name = "Kullanıcı Sulama Yetkisi"
        verbose_name_plural = "Kullanıcı Sulama Yetkileri"
        unique_together = ['kullanici_profili', 'sulama']
        ordering = ['kullanici_profili__user__username', 'sulama__isim']


class GirisKaydi(models.Model):
    """Kullanıcı giriş kayıtları"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Kullanıcı")
    giris_tarihi = models.DateTimeField(auto_now_add=True, verbose_name="Giriş Tarihi")
    ip_adresi = models.GenericIPAddressField(verbose_name="IP Adresi")
    user_agent = models.TextField(verbose_name="Tarayıcı Bilgisi")
    basarili = models.BooleanField(default=True, verbose_name="Başarılı")
    hata_mesaji = models.TextField(null=True, blank=True, verbose_name="Hata Mesajı")
    
    def __str__(self):
        durum = "Başarılı" if self.basarili else "Başarısız"
        return f"{self.user.username} - {self.giris_tarihi.strftime('%d.%m.%Y %H:%M')} ({durum})"
    
    class Meta:
        verbose_name = "Giriş Kaydı"
        verbose_name_plural = "Giriş Kayıtları"
        ordering = ['-giris_tarihi']



# Signal'ler - Kullanıcı oluşturulduğunda otomatik profil oluştur
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def kullanici_profili_olustur(sender, instance, created, **kwargs):
    """Kullanıcı oluşturulduğunda otomatik profil oluştur"""
    if created:
        KullaniciProfili.objects.create(user=instance)

@receiver(post_save, sender=User)
def kullanici_profili_kaydet(sender, instance, **kwargs):
    """Kullanıcı güncellendiğinde profili de kaydet"""
    if hasattr(instance, 'profil'):
        instance.profil.save()
