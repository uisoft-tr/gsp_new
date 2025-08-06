from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import KullaniciProfili, KullaniciSulamaYetkisi, GirisKaydi


class KullaniciSulamaYetkisiInline(admin.TabularInline):
    model = KullaniciSulamaYetkisi
    extra = 1
    fields = ['sulama', 'yetki_seviyesi', 'aktif', 'bitis_tarihi', 'aciklama']


@admin.register(KullaniciProfili)
class KullaniciProfiliAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_full_name', 'unvan', 'departman', 'telefon', 'aktif', 'get_sulama_count', 'olusturma_tarihi']
    list_filter = ['aktif', 'departman', 'unvan', 'olusturma_tarihi']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'user__email', 'telefon', 'unvan']
    readonly_fields = ['olusturma_tarihi', 'guncelleme_tarihi']
    inlines = [KullaniciSulamaYetkisiInline]
    
    fieldsets = (
        ('Kullanıcı Bilgileri', {
            'fields': ('user', 'aktif')
        }),
        ('Kişisel Bilgiler', {
            'fields': ('telefon', 'adres', 'unvan', 'departman')
        }),
        ('Sistem Bilgileri', {
            'fields': ('olusturma_tarihi', 'guncelleme_tarihi'),
            'classes': ('collapse',)
        })
    )
    
    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_full_name.short_description = 'Ad Soyad'
    
    def get_sulama_count(self, obj):
        return obj.sulama_sistemleri.count()
    get_sulama_count.short_description = 'Sulama Sayısı'


class KullaniciProfiliInline(admin.StackedInline):
    model = KullaniciProfili
    can_delete = False
    verbose_name_plural = 'Kullanıcı Profili'
    fields = ['telefon', 'adres', 'unvan', 'departman', 'aktif']


class CustomUserAdmin(BaseUserAdmin):
    """Genişletilmiş User Admin"""
    inlines = (KullaniciProfiliInline,)
    list_display = BaseUserAdmin.list_display + ('get_profil_unvan', 'get_sulama_count', 'date_joined')
    list_filter = BaseUserAdmin.list_filter + ('profil__aktif', 'profil__departman')
    
    def get_profil_unvan(self, obj):
        try:
            return obj.profil.unvan or '-'
        except:
            return '-'
    get_profil_unvan.short_description = 'Ünvan'
    
    def get_sulama_count(self, obj):
        try:
            return obj.profil.sulama_sistemleri.count()
        except:
            return 0
    get_sulama_count.short_description = 'Sulama Sayısı'


# User admin'i yeniden kaydet
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(KullaniciSulamaYetkisi)
class KullaniciSulamaYetkisiAdmin(admin.ModelAdmin):
    list_display = ['kullanici_profili', 'sulama', 'yetki_seviyesi', 'aktif', 'is_aktif', 'baslangic_tarihi', 'bitis_tarihi']
    list_filter = ['yetki_seviyesi', 'aktif', 'baslangic_tarihi']
    search_fields = ['kullanici_profili__user__username', 'kullanici_profili__user__first_name', 
                    'kullanici_profili__user__last_name', 'sulama__isim']
    readonly_fields = ['baslangic_tarihi', 'is_aktif']
    date_hierarchy = 'baslangic_tarihi'
    
    fieldsets = (
        ('Temel Bilgiler', {
            'fields': ('kullanici_profili', 'sulama', 'yetki_seviyesi')
        }),
        ('Durum', {
            'fields': ('aktif', 'baslangic_tarihi', 'bitis_tarihi')
        }),
        ('Ek Bilgiler', {
            'fields': ('olusturan', 'aciklama'),
            'classes': ('collapse',)
        })
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Yeni kayıt
            obj.olusturan = request.user
        super().save_model(request, obj, form, change)


@admin.register(GirisKaydi)
class GirisKaydiAdmin(admin.ModelAdmin):
    list_display = ['user', 'giris_tarihi', 'ip_adresi', 'basarili', 'get_short_user_agent']
    list_filter = ['basarili', 'giris_tarihi']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'ip_adresi']
    readonly_fields = ['user', 'giris_tarihi', 'ip_adresi', 'user_agent', 'basarili', 'hata_mesaji']
    date_hierarchy = 'giris_tarihi'
    
    def get_short_user_agent(self, obj):
        if len(obj.user_agent) > 50:
            return obj.user_agent[:50] + '...'
        return obj.user_agent
    get_short_user_agent.short_description = 'Tarayıcı'
    
    def has_add_permission(self, request):
        # Giriş kayıtları sadece sistem tarafından oluşturulur
        return False
    
    def has_change_permission(self, request, obj=None):
        # Giriş kayıtları değiştirilemez
        return False




# Admin site başlık ve açıklamaları özelleştir
admin.site.site_header = "Sulama Yönetim Sistemi"
admin.site.site_title = "Sulama Yönetimi"
admin.site.index_title = "Yönetim Paneline Hoş Geldiniz"
