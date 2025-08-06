from rest_framework import permissions
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from sulama.models import Sulama


class SulamaYetkisiPermission(permissions.BasePermission):
    """Kullanıcının sulama sistem yetkilerini kontrol eden permission"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Superuser her zaman erişebilir
        if request.user.is_superuser:
            return True
        
        # Kullanıcı profili var mı kontrol et
        if not hasattr(request.user, 'profil'):
            return False
        
        # En az bir sulama sistemine erişimi var mı
        return request.user.profil.sulama_sistemleri.exists()
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Superuser her zaman erişebilir
        if request.user.is_superuser:
            return True
        
        # Obje sulama sistemi ile ilişkili mi kontrol et
        return self._check_sulama_permission(request.user, obj, view.action)
    
    def _check_sulama_permission(self, user, obj, action):
        """Obje için sulama yetkisi kontrol et"""
        try:
            profil = user.profil
            
            # Obje tipine göre sulama sistemini bul
            sulama = self._get_sulama_from_object(obj)
            if not sulama:
                return False
                
            # Yetki seviyesini belirle
            required_permission = self._get_required_permission(action)
            
            # Yetki kontrolü
            return profil.has_sulama_yetkisi(sulama, required_permission)
        except:
            return False
    
    def _get_sulama_from_object(self, obj):
        """Objeden sulama sistemini çıkar"""
        if hasattr(obj, 'sulama'):
            return obj.sulama
        elif hasattr(obj, 'depolama_tesisi'):
            return obj.depolama_tesisi.sulama
        elif hasattr(obj, 'kanal'):
            return obj.kanal.depolama_tesisi.sulama
        elif hasattr(obj, 'tarla'):
            return obj.tarla.sulama if hasattr(obj.tarla, 'sulama') else None
        return None
    
    def _get_required_permission(self, action):
        """Eylem için gerekli yetki seviyesini döndür"""
        if action in ['list', 'retrieve']:
            return 'SADECE_OKUMA'
        elif action in ['create', 'update', 'partial_update']:
            return 'VERI_GIRISI'
        elif action in ['destroy']:
            return 'YONETICI'
        return 'SADECE_OKUMA'


class SulamaBazliMixin(LoginRequiredMixin):
    """View'ler için sulama bazlı yetkilendirme mixin'i"""
    
    def dispatch(self, request, *args, **kwargs):
        if not self.has_sulama_permission(request):
            raise PermissionDenied("Bu sulama sistemine erişim yetkiniz yok.")
        return super().dispatch(request, *args, **kwargs)
    
    def has_sulama_permission(self, request):
        """Sulama yetkisi kontrol et"""
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if not hasattr(request.user, 'profil'):
            return False
        
        # URL'den sulama ID'sini al
        sulama_id = self.kwargs.get('sulama_id') or self.request.GET.get('sulama_id')
        if sulama_id:
            try:
                sulama = Sulama.objects.get(id=sulama_id)
                return request.user.profil.has_sulama_yetkisi(sulama)
            except Sulama.DoesNotExist:
                return False
        
        # Genel erişim için en az bir sulama sistemine erişimi olmalı
        return request.user.profil.sulama_sistemleri.exists()
    
    def get_kullanici_sulamalari(self):
        """Kullanıcının erişebileceği sulama sistemlerini döndür"""
        if self.request.user.is_superuser:
            return Sulama.objects.all()
        
        if hasattr(self.request.user, 'profil'):
            return self.request.user.profil.get_yetkilendirilen_sulamalar()
        
        return Sulama.objects.none()


class SulamaYoneticisiPermission(permissions.BasePermission):
    """Sulama yöneticisi yetkisi"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if not hasattr(request.user, 'profil'):
            return False
        
        # En az bir sulama sisteminde yönetici yetkisi var mı
        yetkileri = request.user.profil.kullanici_sulama_yetkileri.filter(
            aktif=True,
            yetki_seviyesi__in=['YONETICI', 'SUPER_YONETICI']
        )
        return yetkileri.exists()


class VeriGirisiPermission(permissions.BasePermission):
    """Veri girişi yetkisi"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if not hasattr(request.user, 'profil'):
            return False
        
        # Sadece okuma yetkisi için tüm metodlar, diğerleri için yazma yetkisi
        if request.method in permissions.SAFE_METHODS:
            return request.user.profil.sulama_sistemleri.exists()
        
        # Veri girişi veya üstü yetki gerekli
        yetkileri = request.user.profil.kullanici_sulama_yetkileri.filter(
            aktif=True,
            yetki_seviyesi__in=['VERI_GIRISI', 'YONETICI', 'SUPER_YONETICI']
        )
        return yetkileri.exists()


def get_filtered_queryset(queryset, user, sulama_field='sulama'):
    """Kullanıcının yetkili olduğu sulama sistemlerine göre queryset filtrele"""
    if user.is_superuser:
        return queryset
    
    if not hasattr(user, 'profil'):
        return queryset.none()
    
    # Kullanıcının yetkilendirilmiş sulama sistemleri
    yetkilendirilmis_sulamalar = user.profil.get_yetkilendirilen_sulamalar()
    
    # Sulama field'ına göre filtrele
    filter_kwargs = {f"{sulama_field}__in": yetkilendirilmis_sulamalar}
    
    return queryset.filter(**filter_kwargs)


def check_sulama_permission(user, sulama, required_permission='SADECE_OKUMA'):
    """Kullanıcının belirli bir sulama sistemine yetkisi var mı kontrol et"""
    if user.is_superuser:
        return True
    
    if not hasattr(user, 'profil'):
        return False
    
    return user.profil.has_sulama_yetkisi(sulama, required_permission)


def get_user_sulama_context(user):
    """Kullanıcının sulama bazlı yetki bilgilerini döndür - JSON serializable"""
    if user.is_superuser:
        sulamalar = Sulama.objects.all()
        return {
            'is_superuser': True,
            'sulamalar': [
                {
                    'id': s.id,
                    'ad': s.ad,
                    'konum': s.konum
                } for s in sulamalar
            ],
            'yetki_seviyesi': 'SUPER_YONETICI'
        }
    
    if not hasattr(user, 'profil'):
        return {
            'is_superuser': False,
            'sulamalar': [],
            'yetki_seviyesi': None
        }
    
    profil = user.profil
    sulamalar = profil.get_yetkilendirilen_sulamalar()
    
    # Yetki seviyesini al
    yetki_seviyesi = None
    aktif_yetki = profil.kullanici_sulama_yetkileri.filter(aktif=True).first()
    if aktif_yetki:
        yetki_seviyesi = aktif_yetki.yetki_seviyesi
    
    return {
        'is_superuser': False,
        'sulamalar': [
            {
                'id': s.id,
                'ad': s.ad,
                'konum': s.konum
            } for s in sulamalar
        ],
        'yetki_seviyesi': yetki_seviyesi
    } 