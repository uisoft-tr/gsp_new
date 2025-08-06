from django.core.exceptions import PermissionDenied
from .models import KullaniciSulamaYetkisi


class SulamaBazliMixin:
    """
    Sulama bazlı yetkilendirme mixin'i
    ViewSet'lerde kullanıcının yetkili olduğu sulama sistemlerine göre filtreleme yapar
    """
    
    def get_queryset(self):
        """
        Kullanıcının yetkili olduğu sulama sistemlerine göre queryset'i filtreler
        """
        queryset = super().get_queryset()
        
        # Eğer kullanıcı superuser ise tüm verileri görebilir
        if self.request.user.is_superuser:
            return queryset
            
        # Kullanıcının yetkili olduğu sulama sistemlerini al
        try:
            user_profile = self.request.user.profil
            user_sulama_ids = KullaniciSulamaYetkisi.objects.filter(
                kullanici_profili=user_profile,
                aktif=True
            ).values_list('sulama_id', flat=True)
        except AttributeError:
            # Kullanıcının profili yoksa boş queryset döndür
            user_sulama_ids = []
        
        if not user_sulama_ids:
            # Eğer hiç yetkisi yoksa boş queryset döndür
            return queryset.none()
            
        return queryset
    
    def filter_by_sulama_permission(self, queryset, sulama_field='sulama'):
        """
        Verilen queryset'i kullanıcının sulama yetkilerine göre filtreler
        
        Args:
            queryset: Filtrelenecek queryset
            sulama_field: Sulama modelini işaret eden field adı (ör: 'sulama', 'kanal__depolama_tesisi__sulama', 'id')
        
        Returns:
            Filtrelenmiş queryset
        """
        # Eğer kullanıcı superuser ise tüm verileri görebilir
        if self.request.user.is_superuser:
            return queryset
            
        # Kullanıcının yetkili olduğu sulama sistemlerini al
        try:
            user_profile = self.request.user.profil
            user_sulama_ids = KullaniciSulamaYetkisi.objects.filter(
                kullanici_profili=user_profile,
                aktif=True
            ).values_list('sulama_id', flat=True)
            
            print(f"Kullanıcı: {self.request.user.username}")
            print(f"Kullanıcı profili: {user_profile}")
            print(f"Yetkili sulama IDs: {list(user_sulama_ids)}")
            
        except AttributeError:
            # Kullanıcının profili yoksa boş queryset döndür
            print(f"Kullanıcının profili yok: {self.request.user.username}")
            user_sulama_ids = []
        
        if not user_sulama_ids:
            # Eğer hiç yetkisi yoksa boş queryset döndür
            print("Kullanıcının hiç sulama yetkisi yok")
            return queryset.none()
        
        # Sulama field'ına göre filtrele
        if sulama_field == 'id':
            # Sulama modeli kendisi için
            filter_kwargs = {'id__in': user_sulama_ids}
        else:
            filter_kwargs = {f'{sulama_field}__in': user_sulama_ids}
            
        print(f"Filter kwargs: {filter_kwargs}")
        filtered_queryset = queryset.filter(**filter_kwargs)
        print(f"Filtrelenmiş queryset count: {filtered_queryset.count()}")
        
        return filtered_queryset
    
    def check_sulama_permission(self, sulama_id, required_level='SADECE_OKUMA'):
        """
        Kullanıcının belirli bir sulama sisteminde yetki kontrolü yapar
        
        Args:
            sulama_id: Kontrol edilecek sulama sistem ID'si
            required_level: Gerekli yetki seviyesi
            
        Returns:
            bool: Yetki var mı?
        """
        if self.request.user.is_superuser:
            return True
            
        try:
            user_profile = self.request.user.profil
            user_permission = KullaniciSulamaYetkisi.objects.get(
                kullanici_profili=user_profile,
                sulama_id=sulama_id,
                aktif=True
            )
            
            # Yetki seviyeleri hiyerarşik kontrolü
            levels = ['SADECE_OKUMA', 'VERI_GIRISI', 'YONETICI', 'SUPER_YONETICI']
            user_level_index = levels.index(user_permission.yetki_seviyesi)
            required_level_index = levels.index(required_level)
            
            return user_level_index >= required_level_index
            
        except (KullaniciSulamaYetkisi.DoesNotExist, AttributeError):
            return False
    
    def perform_create(self, serializer):
        """
        Yeni kayıt oluştururken yetki kontrolü yapar
        """
        # Eğer model sulama field'ı içeriyorsa yetki kontrolü yap
        if hasattr(serializer.Meta.model, 'sulama'):
            sulama = serializer.validated_data.get('sulama')
            if sulama:  # Sulama seçilmişse yetki kontrolü yap
                sulama_id = sulama.id
                if not self.check_sulama_permission(sulama_id, 'VERI_GIRISI'):
                    raise PermissionDenied("Bu sulama sisteminde veri girişi yetkiniz yok.")
        
        super().perform_create(serializer)
    
    def perform_update(self, serializer):
        """
        Kayıt güncellerken yetki kontrolü yapar
        """
        # Eğer model sulama field'ı içeriyorsa yetki kontrolü yap
        instance = serializer.instance
        if hasattr(instance, 'sulama'):
            if instance.sulama:  # Sulama seçilmişse yetki kontrolü yap
                sulama_id = instance.sulama.id
                if not self.check_sulama_permission(sulama_id, 'VERI_GIRISI'):
                    raise PermissionDenied("Bu sulama sisteminde güncelleme yetkiniz yok.")
        
        super().perform_update(serializer)
    
    def perform_destroy(self, instance):
        """
        Kayıt silerken yetki kontrolü yapar
        """
        # Eğer model sulama field'ı içeriyorsa yetki kontrolü yap
        if hasattr(instance, 'sulama'):
            if instance.sulama:  # Sulama seçilmişse yetki kontrolü yap
                sulama_id = instance.sulama.id
                if not self.check_sulama_permission(sulama_id, 'YONETICI'):
                    raise PermissionDenied("Bu sulama sisteminde silme yetkiniz yok.")
        
        super().perform_destroy(instance) 