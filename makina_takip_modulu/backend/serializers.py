# Makina Takip Modülü - Serializers
# Bu dosyayı ana serializers.py dosyasına ekleyin

from rest_framework import serializers
from sulama.models import Makina, MakinaKonum, MakinaIs

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