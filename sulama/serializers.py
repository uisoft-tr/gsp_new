from rest_framework import serializers
from .models import (
    Bolge, Sulama, DepolamaTesisi, Kanal, 
    GunlukSebekeyeAlinanSuMiktari, GunlukDepolamaTesisiSuMiktari,
    UrunKategorisi, Urun, YillikGenelSuTuketimi, YillikUrunDetay,
    Makina, MakinaKonum, MakinaIs
)


class BolgeSerializer(serializers.ModelSerializer):
    """Bölge serializer"""
    sulama_sayisi = serializers.SerializerMethodField()
    
    class Meta:
        model = Bolge
        fields = ['id', 'isim', 'aciklama', 'bolge_iletisim', 'yonetici', 'adres', 'olusturma_tarihi', 'sulama_sayisi']
        read_only_fields = ['olusturma_tarihi']
    
    def get_sulama_sayisi(self, obj):
        return obj.sulamalar.count()


class SulamaSerializer(serializers.ModelSerializer):
    """Sulama sistemi serializer"""
    bolge_isim = serializers.CharField(source='bolge.isim', read_only=True)
    depolama_tesisi_sayisi = serializers.SerializerMethodField()
    urun_sayisi = serializers.SerializerMethodField()
    
    class Meta:
        model = Sulama
        fields = [
            'id', 'isim', 'bolge', 'bolge_isim', 'aciklama', 
            'olusturma_tarihi', 'depolama_tesisi_sayisi', 'urun_sayisi'
        ]
        read_only_fields = ['olusturma_tarihi']
    
    def get_depolama_tesisi_sayisi(self, obj):
        return obj.depolama_tesisleri.count()
    
    def get_urun_sayisi(self, obj):
        return obj.urunler.count()


class DepolamaTesisiSerializer(serializers.ModelSerializer):
    """Depolama tesisi serializer"""
    sulama_isim = serializers.CharField(source='sulama.isim', read_only=True)
    bolge_isim = serializers.CharField(source='sulama.bolge.isim', read_only=True)
    sulama_display = serializers.SerializerMethodField()
    kanal_sayisi = serializers.SerializerMethodField()
    
    class Meta:
        model = DepolamaTesisi
        fields = [
            'id', 'isim', 'sulama', 'sulama_isim', 'bolge_isim', 'sulama_display', 'aciklama',
            'kret_kotu', 'maksimum_su_kot', 'minimum_su_kot', 
            'maksimum_hacim', 'minimum_hacim', 'kanal_sayisi', 'olusturma_tarihi'
        ]
        read_only_fields = ['olusturma_tarihi']
    
    def get_sulama_display(self, obj):
        return f"{obj.sulama.bolge.isim} - {obj.sulama.isim}"
    
    def get_kanal_sayisi(self, obj):
        return obj.kanallar.count()


class KanalSerializer(serializers.ModelSerializer):
    """Kanal serializer"""
    depolama_tesisi_isim = serializers.CharField(source='depolama_tesisi.isim', read_only=True)
    sulama_isim = serializers.CharField(source='depolama_tesisi.sulama.isim', read_only=True)
    gunluk_veri_sayisi = serializers.SerializerMethodField()
    
    class Meta:
        model = Kanal
        fields = [
            'id', 'isim', 'depolama_tesisi', 'depolama_tesisi_isim', 
            'sulama_isim', 'aciklama', 'kanal_kodu', 'olusturma_tarihi', 'gunluk_veri_sayisi'
        ]
        read_only_fields = ['kanal_kodu', 'olusturma_tarihi']
    
    def get_gunluk_veri_sayisi(self, obj):
        return obj.gunluk_su_miktarlari.count()


class GunlukSebekeyeAlinanSuMiktariSerializer(serializers.ModelSerializer):
    """Günlük şebekeye alınan su miktarı serializer"""
    kanal_isim = serializers.CharField(source='kanal.isim', read_only=True)
    depolama_tesisi_isim = serializers.CharField(source='kanal.depolama_tesisi.isim', read_only=True)
    sulama_isim = serializers.CharField(source='kanal.depolama_tesisi.sulama.isim', read_only=True)
    sure_dakika = serializers.SerializerMethodField()
    hesaplanan_su_miktari = serializers.SerializerMethodField()
    manuel_giris = serializers.BooleanField(required=False, write_only=True, default=False)
    
    class Meta:
        model = GunlukSebekeyeAlinanSuMiktari
        fields = [
            'id', 'kanal', 'kanal_isim', 'depolama_tesisi_isim', 'sulama_isim',
            'tarih', 'baslangic_saati', 'bitis_saati', 'yukseklik', 'su_miktari', 
            'sure_dakika', 'hesaplanan_su_miktari', 'manuel_giris'
        ]
    
    def get_sure_dakika(self, obj):
        if obj.baslangic_saati and obj.bitis_saati:
            delta = obj.bitis_saati - obj.baslangic_saati
            return round(delta.total_seconds() / 60, 2)
        return None
    
    def get_hesaplanan_su_miktari(self, obj):
        """Yükseklik değerine göre hesaplanan su miktarını döndür"""
        return obj.hesapla_su_miktari()
    
    def validate(self, attrs):
        if attrs.get('baslangic_saati') and attrs.get('bitis_saati'):
            if attrs['baslangic_saati'] >= attrs['bitis_saati']:
                raise serializers.ValidationError("Başlangıç saati bitiş saatinden önce olmalıdır.")
        
        # Yükseklik kontrolü - sadece otomatik modda (manuel_giris = False) yapılır
        manuel_giris = attrs.get('manuel_giris', False)
        if not manuel_giris and attrs.get('yukseklik') and attrs.get('kanal'):
            from .models import KanalAbak
            try:
                KanalAbak.objects.get(kanal=attrs['kanal'], yukseklik=attrs['yukseklik'])
            except KanalAbak.DoesNotExist:
                raise serializers.ValidationError({
                    'yukseklik': f"Bu kanal için {attrs['yukseklik']} m yükseklik değeri abakta bulunamadı."
                })
        
        return attrs
    
    def create(self, validated_data):
        # manuel_giris parametresini çıkar (model alanı değil)
        manuel_giris = validated_data.pop('manuel_giris', False)
        
        # Django'nun varsayılan create akışını kullan
        instance = super().create(validated_data)
        
        # Manuel giriş modunda su_miktari zaten frontend'den geliyor, 
        # otomatik modda da hesaplama model'de yapılıyor
        return instance
    
    def update(self, instance, validated_data):
        # manuel_giris parametresini çıkar (model alanı değil)
        manuel_giris = validated_data.pop('manuel_giris', False)
        
        # Django'nun varsayılan update akışını kullan
        instance = super().update(instance, validated_data)
        
        # Manuel giriş modunda su_miktari zaten frontend'den geliyor,
        # otomatik modda da hesaplama model'de yapılıyor
        return instance


class GunlukDepolamaTesisiSuMiktariSerializer(serializers.ModelSerializer):
    """Günlük depolama tesisi su miktarı serializer"""
    depolama_tesisi_isim = serializers.CharField(source='depolama_tesisi.isim', read_only=True)
    sulama_isim = serializers.CharField(source='depolama_tesisi.sulama.isim', read_only=True)
    doluluk_orani = serializers.SerializerMethodField()
    
    class Meta:
        model = GunlukDepolamaTesisiSuMiktari
        fields = [
            'id', 'depolama_tesisi', 'depolama_tesisi_isim', 'sulama_isim',
            'tarih', 'kot', 'su_miktari', 'doluluk_orani'
        ]
    
    def get_doluluk_orani(self, obj):
        if obj.depolama_tesisi.maksimum_hacim and obj.su_miktari:
            return round((obj.su_miktari / obj.depolama_tesisi.maksimum_hacim) * 100, 2)
        return None


class UrunKategorisiSerializer(serializers.ModelSerializer):
    """Ürün kategorisi serializer"""
    urun_sayisi = serializers.SerializerMethodField()
    
    class Meta:
        model = UrunKategorisi
        fields = ['id', 'isim', 'aciklama', 'olusturma_tarihi', 'urun_sayisi']
        read_only_fields = ['olusturma_tarihi']
    
    def get_urun_sayisi(self, obj):
        return obj.urunler.count()


class UrunSerializer(serializers.ModelSerializer):
    """Ürün serializer"""
    sulama_isim = serializers.CharField(source='sulama.isim', read_only=True)
    bolge_isim = serializers.CharField(source='sulama.bolge.isim', read_only=True)
    sulama_display = serializers.SerializerMethodField()
    kategori_isimleri = serializers.SerializerMethodField()
    yillik_tuketim_sayisi = serializers.SerializerMethodField()
    aylik_katsayilar = serializers.SerializerMethodField()
    
    class Meta:
        model = Urun
        fields = [
            'id', 'isim', 'sulama', 'sulama_isim', 'bolge_isim', 'sulama_display',
            'kategori', 'kategori_isimleri', 'baslangic_tarihi', 'bitis_tarihi', 'kar_orani',
            'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 
            'eylul', 'ekim', 'kasim', 'aralik', 'aylik_katsayilar',
            'olusturma_tarihi', 'yillik_tuketim_sayisi'
        ]
        read_only_fields = ['olusturma_tarihi']
    
    def get_sulama_display(self, obj):
        return f"{obj.sulama.bolge.isim} - {obj.sulama.isim}"
    
    def get_kategori_isimleri(self, obj):
        return [k.isim for k in obj.kategori.all()]
    
    def get_yillik_tuketim_sayisi(self, obj):
        return obj.yillik_urun_detaylari.count()
    
    def get_aylik_katsayilar(self, obj):
        aylar = [
            {'ay': 'Ocak', 'deger': obj.ocak, 'kisa': 'Oca'},
            {'ay': 'Şubat', 'deger': obj.subat, 'kisa': 'Şub'},
            {'ay': 'Mart', 'deger': obj.mart, 'kisa': 'Mar'},
            {'ay': 'Nisan', 'deger': obj.nisan, 'kisa': 'Nis'},
            {'ay': 'Mayıs', 'deger': obj.mayis, 'kisa': 'May'},
            {'ay': 'Haziran', 'deger': obj.haziran, 'kisa': 'Haz'},
            {'ay': 'Temmuz', 'deger': obj.temmuz, 'kisa': 'Tem'},
            {'ay': 'Ağustos', 'deger': obj.agustos, 'kisa': 'Ağu'},
            {'ay': 'Eylül', 'deger': obj.eylul, 'kisa': 'Eyl'},
            {'ay': 'Ekim', 'deger': obj.ekim, 'kisa': 'Eki'},
            {'ay': 'Kasım', 'deger': obj.kasim, 'kisa': 'Kas'},
            {'ay': 'Aralık', 'deger': obj.aralik, 'kisa': 'Ara'}
        ]
        return [ay for ay in aylar if ay['deger'] is not None]


# UrunDetaySerializer artık gerekli değil - UrunSerializer'da aylik_katsayilar mevcut


class YillikUrunDetaySerializer(serializers.ModelSerializer):
    """Yıllık ürün detay serializer"""
    urun_isim = serializers.CharField(source='urun.isim', read_only=True)
    birim_su_tuketimi = serializers.SerializerMethodField()
    net_su_ihtiyaci = serializers.SerializerMethodField()
    ur_toplami = serializers.SerializerMethodField()
    aylik_ur_degerleri = serializers.SerializerMethodField()
    
    class Meta:
        model = YillikUrunDetay
        fields = [
            'id', 'urun', 'urun_isim', 'alan', 'ekim_orani', 'su_tuketimi',
            'birim_su_tuketimi', 'net_su_ihtiyaci', 'ur_toplami', 'aylik_ur_degerleri',
            'olusturma_tarihi'
        ]
        read_only_fields = ['olusturma_tarihi']
    
    def get_birim_su_tuketimi(self, obj):
        return round(obj.get_birim_su_tuketimi(), 4)
    
    def get_net_su_ihtiyaci(self, obj):
        return round(obj.get_net_su_ihtiyaci(), 6)
    
    def get_ur_toplami(self, obj):
        return obj.get_ur_toplami()
    
    def get_aylik_ur_degerleri(self, obj):
        """Ürünün aylık UR değerlerini döndür"""
        if obj.urun:
            return {
                'ocak': obj.urun.ocak,
                'subat': obj.urun.subat,
                'mart': obj.urun.mart,
                'nisan': obj.urun.nisan,
                'mayis': obj.urun.mayis,
                'haziran': obj.urun.haziran,
                'temmuz': obj.urun.temmuz,
                'agustos': obj.urun.agustos,
                'eylul': obj.urun.eylul,
                'ekim': obj.urun.ekim,
                'kasim': obj.urun.kasim,
                'aralik': obj.urun.aralik
            }
        return None


class YillikGenelSuTuketimiSerializer(serializers.ModelSerializer):
    """Yıllık genel su tüketimi serializer"""
    sulama_isim = serializers.CharField(source='sulama.isim', read_only=True)
    bolge_isim = serializers.CharField(source='sulama.bolge.isim', read_only=True)
    kurumAdi = serializers.CharField(source='sulama.isim', read_only=True)  # Frontend uyumluluğu için
    # Ürün bilgileri artık ayrı tabloda
    urun_detaylari = serializers.SerializerMethodField()
    toplam_randi = serializers.SerializerMethodField()
    net_su_ihtiyaci = serializers.SerializerMethodField()
    birim_su_tuketimi = serializers.SerializerMethodField()
    
    class Meta:
        model = YillikGenelSuTuketimi
        fields = [
            'id', 'yil', 'sulama', 'sulama_isim', 'bolge_isim', 'kurumAdi',
            'ciftlik_randi', 'iletim_randi', 'toplam_randi',
            'net_su_ihtiyaci', 'birim_su_tuketimi', 'urun_detaylari', 
            'olusturma_tarihi'
        ]
        read_only_fields = ['olusturma_tarihi']
    
    def get_toplam_randi(self, obj):
        return round(obj.get_toplam_randi(), 2)
    
    def get_net_su_ihtiyaci(self, obj):
        return round(obj.get_net_su_ihtiyaci(), 2)
    
    def get_birim_su_tuketimi(self, obj):
        toplam_alan = obj.get_toplam_alan()
        if toplam_alan > 0:
            return round(obj.get_toplam_su_tuketimi() / toplam_alan, 4)
        return None
    
    def get_urun_detaylari(self, obj):
        """Bu yıla ait tüm ürün detaylarını döndür"""
        detaylar = obj.urun_detaylari.all().select_related('urun')
        return YillikUrunDetaySerializer(detaylar, many=True).data


# Özet serializer'lar
class SulamaOzetSerializer(serializers.ModelSerializer):
    """Sulama özet serializer - liste görünümü için"""
    bolge_isim = serializers.CharField(source='bolge.isim', read_only=True)
    
    class Meta:
        model = Sulama
        fields = ['id', 'isim', 'bolge_isim', 'olusturma_tarihi']


class KanalOzetSerializer(serializers.ModelSerializer):
    """Kanal özet serializer"""
    depolama_tesisi_isim = serializers.CharField(source='depolama_tesisi.isim', read_only=True)
    
    class Meta:
        model = Kanal
        fields = ['id', 'isim', 'depolama_tesisi_isim', 'kanal_kodu']


class UrunOzetSerializer(serializers.ModelSerializer):
    """Ürün özet serializer"""
    sulama_isim = serializers.CharField(source='sulama.isim', read_only=True)
    
    class Meta:
        model = Urun
        fields = ['id', 'isim', 'sulama_isim'] 


class MakinaSerializer(serializers.ModelSerializer):
    sulama_isim = serializers.CharField(source='sulama.isim', read_only=True)
    makina_tipi_display = serializers.CharField(source='get_makina_tipi_display', read_only=True)
    durum_display = serializers.CharField(source='get_durum_display', read_only=True)
    son_konum = serializers.SerializerMethodField()
    aktif_is = serializers.SerializerMethodField()
    
    class Meta:
        model = Makina
        fields = '__all__'
    
    def get_son_konum(self, obj):
        son_konum = obj.konumlar.first()
        if son_konum:
            return {
                'enlem': float(son_konum.enlem),
                'boylam': float(son_konum.boylam),
                'kayit_zamani': son_konum.kayit_zamani
            }
        return None
    
    def get_aktif_is(self, obj):
        aktif_is = obj.isler.filter(durum='devam_ediyor').first()
        if aktif_is:
            return {
                'id': aktif_is.id,
                'is_tipi': aktif_is.is_tipi,
                'is_tipi_display': aktif_is.get_is_tipi_display(),
                'baslik': aktif_is.baslik,
                'baslangic_zamani': aktif_is.baslangic_zamani,
                'enlem': float(aktif_is.enlem) if aktif_is.enlem else None,
                'boylam': float(aktif_is.boylam) if aktif_is.boylam else None
            }
        return None


class MakinaKonumSerializer(serializers.ModelSerializer):
    makina_isim = serializers.CharField(source='makina.isim', read_only=True)
    makina_tipi = serializers.CharField(source='makina.makina_tipi', read_only=True)
    
    class Meta:
        model = MakinaKonum
        fields = '__all__'


class MakinaIsSerializer(serializers.ModelSerializer):
    makina_isim = serializers.CharField(source='makina.isim', read_only=True)
    makina_tipi = serializers.CharField(source='makina.makina_tipi', read_only=True)
    is_tipi_display = serializers.CharField(source='get_is_tipi_display', read_only=True)
    durum_display = serializers.CharField(source='get_durum_display', read_only=True)
    
    class Meta:
        model = MakinaIs
        fields = '__all__' 