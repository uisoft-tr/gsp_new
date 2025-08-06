from django.contrib import admin
from .models import (
    Bolge, Sulama, DepolamaTesisi, DepolamaTesisiAbak, 
    Kanal, KanalAbak, GunlukSebekeyeAlinanSuMiktari,
    GunlukDepolamaTesisiSuMiktari, UrunKategorisi, Urun, 
    YillikGenelSuTuketimi, YillikUrunDetay, Makina, MakinaKonum, MakinaIs
)


@admin.register(Bolge)
class BolgeAdmin(admin.ModelAdmin):
    list_display = ['isim', 'yonetici', 'bolge_iletisim', 'olusturma_tarihi']
    list_filter = ['olusturma_tarihi']
    search_fields = ['isim', 'yonetici', 'adres']
    readonly_fields = ['olusturma_tarihi']


@admin.register(Sulama)
class SulamaAdmin(admin.ModelAdmin):
    list_display = ['isim', 'bolge', 'olusturma_tarihi']
    list_filter = ['bolge', 'olusturma_tarihi']
    search_fields = ['isim', 'bolge__isim']
    readonly_fields = ['olusturma_tarihi']


class DepolamaTesisiAbakInline(admin.TabularInline):
    model = DepolamaTesisiAbak
    extra = 1


class KanalInline(admin.TabularInline):
    model = Kanal
    extra = 1


@admin.register(DepolamaTesisi)
class DepolamaTesisiAdmin(admin.ModelAdmin):
    list_display = ['isim', 'sulama', 'maksimum_hacim', 'minimum_hacim', 'olusturma_tarihi']
    list_filter = ['sulama__bolge', 'olusturma_tarihi']
    search_fields = ['isim', 'sulama__isim', 'sulama__bolge__isim']
    readonly_fields = ['olusturma_tarihi']
    
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('isim', 'sulama', 'aciklama')
        }),
        ('Teknik Özellikler', {
            'fields': ('kret_kotu', 'maksimum_su_kot', 'minimum_su_kot', 
                      'maksimum_hacim', 'minimum_hacim')
        }),
        ('Geometri', {
            'fields': ('geometri',),
            'classes': ('collapse',)
        }),
        ('Sistem Bilgileri', {
            'fields': ('olusturma_tarihi',),
            'classes': ('collapse',)
        })
    )


@admin.register(DepolamaTesisiAbak)
class DepolamaTesisiAbakAdmin(admin.ModelAdmin):
    list_display = ['depolama_tesisi', 'kot', 'hacim']
    list_filter = ['depolama_tesisi__sulama__bolge']
    search_fields = ['depolama_tesisi__isim']


class KanalAbakInline(admin.TabularInline):
    model = KanalAbak
    extra = 1


@admin.register(Kanal)
class KanalAdmin(admin.ModelAdmin):
    list_display = ['isim', 'kanal_kodu', 'depolama_tesisi', 'olusturma_tarihi']
    list_filter = ['depolama_tesisi__sulama__bolge', 'olusturma_tarihi']
    search_fields = ['isim', 'kanal_kodu', 'depolama_tesisi__isim']
    readonly_fields = ['kanal_kodu', 'olusturma_tarihi']
    inlines = [KanalAbakInline]


@admin.register(KanalAbak)
class KanalAbakAdmin(admin.ModelAdmin):
    list_display = ['kanal', 'yukseklik', 'hacim']
    list_filter = ['kanal__depolama_tesisi__sulama__bolge']
    search_fields = ['kanal__isim']


@admin.register(GunlukSebekeyeAlinanSuMiktari)
class GunlukSebekeyeAlinanSuMiktariAdmin(admin.ModelAdmin):
    list_display = ['kanal', 'tarih', 'baslangic_saati', 'bitis_saati', 'su_miktari']
    list_filter = ['tarih', 'kanal__depolama_tesisi__sulama__bolge']
    search_fields = ['kanal__isim', 'kanal__depolama_tesisi__isim']
    date_hierarchy = 'tarih'
    
    fieldsets = (
        ('Kanal Bilgisi', {
            'fields': ('kanal',)
        }),
        ('Zaman Bilgileri', {
            'fields': ('tarih', 'baslangic_saati', 'bitis_saati')
        }),
        ('Su Bilgileri', {
            'fields': ('yukseklik', 'su_miktari')
        })
    )


@admin.register(GunlukDepolamaTesisiSuMiktari)
class GunlukDepolamaTesisiSuMiktariAdmin(admin.ModelAdmin):
    list_display = ['depolama_tesisi', 'tarih', 'kot', 'su_miktari']
    list_filter = ['tarih', 'depolama_tesisi__sulama__bolge']
    search_fields = ['depolama_tesisi__isim']
    date_hierarchy = 'tarih'


@admin.register(UrunKategorisi)
class UrunKategorisiAdmin(admin.ModelAdmin):
    list_display = ['isim', 'olusturma_tarihi']
    search_fields = ['isim']
    readonly_fields = ['olusturma_tarihi']


@admin.register(Urun)
class UrunAdmin(admin.ModelAdmin):
    list_display = ['isim', 'sulama', 'get_kategoriler', 'baslangic_tarihi', 'bitis_tarihi', 'olusturma_tarihi']
    list_filter = ['sulama__bolge', 'kategori', 'baslangic_tarihi', 'bitis_tarihi', 'olusturma_tarihi']
    search_fields = ['isim', 'sulama__isim', 'sulama__bolge__isim']
    filter_horizontal = ['kategori']
    readonly_fields = ['olusturma_tarihi']
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('isim', 'sulama', 'kategori')
        }),
        ('Tarih Bilgileri', {
            'fields': ('baslangic_tarihi', 'bitis_tarihi', 'kar_orani'),
            'description': 'Ürünün ekiliş/hasat tarihleri ve kar oranı'
        }),
        ('Aylık Katsayılar', {
            'fields': (
                ('ocak', 'subat', 'mart'),
                ('nisan', 'mayis', 'haziran'),
                ('temmuz', 'agustos', 'eylul'),
                ('ekim', 'kasim', 'aralik')
            ),
            'description': 'Ürünün aylık su tüketim katsayıları'
        }),
        ('Sistem Bilgileri', {
            'fields': ('olusturma_tarihi',),
            'classes': ('collapse',)
        })
    )
    
    def get_kategoriler(self, obj):
        return ", ".join([k.isim for k in obj.kategori.all()])
    get_kategoriler.short_description = 'Kategoriler'


class YillikUrunDetayInline(admin.TabularInline):
    model = YillikUrunDetay
    extra = 1
    fields = ['urun', 'alan', 'ekim_orani', 'su_tuketimi']


@admin.register(YillikGenelSuTuketimi)
class YillikGenelSuTuketimiAdmin(admin.ModelAdmin):
    list_display = ['yil', 'sulama', 'get_urun_sayisi', 'get_toplam_alan', 'get_toplam_su_tuketimi', 'get_toplam_randi', 'olusturma_tarihi']
    list_filter = ['yil', 'sulama__bolge']
    search_fields = ['sulama__isim', 'sulama__bolge__isim']
    readonly_fields = ['olusturma_tarihi', 'get_toplam_randi', 'get_net_su_ihtiyaci']
    inlines = [YillikUrunDetayInline]
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('yil', 'sulama')
        }),
        ('Randıman Değerleri', {
            'fields': ('ciftlik_randi', 'iletim_randi')
        }),
        ('Hesaplanan Değerler', {
            'fields': ('get_toplam_randi', 'get_net_su_ihtiyaci'),
            'classes': ('collapse',)
        }),
        ('Sistem Bilgileri', {
            'fields': ('olusturma_tarihi',),
            'classes': ('collapse',)
        })
    )
    
    def get_urun_sayisi(self, obj):
        return obj.urun_detaylari.count()
    get_urun_sayisi.short_description = 'Ürün Sayısı'
    
    def get_toplam_alan(self, obj):
        return f"{obj.get_toplam_alan():.2f} ha"
    get_toplam_alan.short_description = 'Toplam Alan'
    
    def get_toplam_su_tuketimi(self, obj):
        return f"{obj.get_toplam_su_tuketimi():.2f} m³"
    get_toplam_su_tuketimi.short_description = 'Toplam Su Tüketimi'
    
    def get_toplam_randi(self, obj):
        return f"%{obj.get_toplam_randi():.2f}"
    get_toplam_randi.short_description = 'Toplam Randı'
    
    def get_net_su_ihtiyaci(self, obj):
        net_ihtiyac = obj.get_net_su_ihtiyaci()
        if net_ihtiyac is not None and net_ihtiyac > 0:
            return f"{net_ihtiyac:.2f} hm³"
        return "- hm³"
    get_net_su_ihtiyaci.short_description = 'Net Su İhtiyacı'


@admin.register(YillikUrunDetay)
class YillikUrunDetayAdmin(admin.ModelAdmin):
    list_display = ['yillik_tuketim', 'urun', 'alan', 'ekim_orani', 'su_tuketimi', 'get_birim_su_tuketimi', 'olusturma_tarihi']
    list_filter = ['yillik_tuketim__yil', 'yillik_tuketim__sulama__bolge', 'urun__kategori']
    search_fields = ['yillik_tuketim__sulama__isim', 'urun__isim']
    readonly_fields = ['olusturma_tarihi', 'get_birim_su_tuketimi', 'get_net_su_ihtiyaci', 'get_ur_toplami']
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('yillik_tuketim', 'urun')
        }),
        ('Alan ve Tüketim', {
            'fields': ('alan', 'ekim_orani', 'su_tuketimi')
        }),
        ('Hesaplanan Değerler', {
            'fields': ('get_birim_su_tuketimi', 'get_net_su_ihtiyaci', 'get_ur_toplami'),
            'classes': ('collapse',)
        }),
        ('Sistem Bilgileri', {
            'fields': ('olusturma_tarihi',),
            'classes': ('collapse',)
        })
    )
    
    def get_birim_su_tuketimi(self, obj):
        return f"{obj.get_birim_su_tuketimi():.4f} m³/ha"
    get_birim_su_tuketimi.short_description = 'Birim Su Tüketimi'
    
    def get_net_su_ihtiyaci(self, obj):
        return f"{obj.get_net_su_ihtiyaci():.6f} hm³"
    get_net_su_ihtiyaci.short_description = 'Net Su İhtiyacı'
    
    def get_ur_toplami(self, obj):
        return f"{obj.get_ur_toplami():.2f}"
    get_ur_toplami.short_description = 'UR Toplamı'


@admin.register(Makina)
class MakinaAdmin(admin.ModelAdmin):
    list_display = ['birlik_no', 'isim', 'makina_tipi', 'plaka', 'durum', 'sulama', 'olusturma_tarihi']
    list_filter = ['makina_tipi', 'durum', 'sulama__bolge', 'sulama']
    search_fields = ['birlik_no', 'isim', 'plaka', 'model', 'sulama__isim']
    readonly_fields = ['olusturma_tarihi', 'guncelleme_tarihi']
    ordering = ['birlik_no', 'sulama__bolge__isim', 'sulama__isim', 'isim']


@admin.register(MakinaKonum)
class MakinaKonumAdmin(admin.ModelAdmin):
    list_display = ['makina', 'enlem', 'boylam', 'kayit_zamani']
    list_filter = ['makina__makina_tipi', 'makina__sulama']
    search_fields = ['makina__isim', 'makina__plaka']
    readonly_fields = ['kayit_zamani']
    ordering = ['-kayit_zamani']


@admin.register(MakinaIs)
class MakinaIsAdmin(admin.ModelAdmin):
    list_display = ['makina', 'is_tipi', 'baslik', 'durum', 'baslangic_zamani', 'bitis_zamani']
    list_filter = ['is_tipi', 'durum', 'makina__makina_tipi', 'makina__sulama']
    search_fields = ['baslik', 'aciklama', 'makina__isim']
    readonly_fields = ['olusturma_tarihi']
    ordering = ['-baslangic_zamani']
