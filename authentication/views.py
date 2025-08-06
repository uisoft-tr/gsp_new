from django.shortcuts import render
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from .models import KullaniciProfili, GirisKaydi
from .serializers import (
    LoginSerializer, UserSerializer, ChangePasswordSerializer, 
    UserUpdateSerializer, KullaniciProfiliSerializer
)
from .permissions import get_user_sulama_context
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """Kullanıcı giriş view'i"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Login için authentication gerekmez, CSRF'den kaçınır
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'success': False,
                'message': 'Kullanıcı adı ve şifre gereklidir',
                'errors': {
                    'username': 'Bu alan gereklidir' if not username else None,
                    'password': 'Bu alan gereklidir' if not password else None
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Kullanıcı doğrulama
        user = authenticate(username=username, password=password)
        
        if user and user.is_active:
            # Token oluştur veya al
            token, created = Token.objects.get_or_create(user=user)
            
            # Session login (opsiyonel)
            login(request, user)
            
            # Giriş kaydı oluştur
            self._create_login_record(user, request, True)
            
            # Kullanıcı bilgilerini hazırla
            user_data = {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
            }
            
            # Sulama yetki kontekstini ekle
            try:
                sulama_context = get_user_sulama_context(user)
                user_data.update(sulama_context)
            except Exception as e:
                # Sulama context hatası varsa log'la ama devam et
                print(f"Sulama context error: {e}")
                user_data.update({
                    'is_superuser': user.is_superuser,
                    'sulamalar': [],
                    'yetki_seviyesi': None
                })
            
            return Response({
                'success': True,
                'message': 'Giriş başarılı',
                'token': token.key,
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        # Başarısız giriş
        if username:
            try:
                failed_user = User.objects.get(username=username)
                self._create_login_record(failed_user, request, False, 'Hatalı şifre')
            except User.DoesNotExist:
                pass
        
        return Response({
            'success': False,
            'message': 'Kullanıcı adı veya şifre hatalı',
            'errors': {
                'username': 'Kullanıcı adı veya şifre hatalı',
                'password': 'Kullanıcı adı veya şifre hatalı'
            }
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    def _create_login_record(self, user, request, success, error_message=None):
        """Giriş kaydı oluştur"""
        try:
            GirisKaydi.objects.create(
                user=user,
                ip_adresi=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                basarili=success,
                hata_mesaji=str(error_message) if error_message else None
            )
        except Exception as e:
            print(f"Login record creation error: {e}")
            pass  # Giriş kaydı oluşturulamasa da devam et
    
    def _get_client_ip(self, request):
        """Client IP adresini al"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    """Kullanıcı çıkış view'i"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            # Token'ı sil
            if hasattr(request.user, 'auth_token'):
                request.user.auth_token.delete()
        except:
            pass
        
        logout(request)
        return Response({
            'success': True,
            'message': 'Çıkış başarılı'
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """Kullanıcı profil view'i"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Profil bilgilerini getir"""
        user_data = UserSerializer(request.user).data
        
        try:
            sulama_context = get_user_sulama_context(request.user)
            user_data.update(sulama_context)
        except Exception as e:
            print(f"Sulama context error: {e}")
            user_data.update({
                'is_superuser': request.user.is_superuser,
                'sulamalar': [],
                'yetki_seviyesi': None
            })
        
        return Response({
            'success': True,
            'user': user_data
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Profil bilgilerini güncelle"""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Güncellenmiş kullanıcı bilgilerini döndür
            user_data = UserSerializer(request.user).data
            try:
                sulama_context = get_user_sulama_context(request.user)
                user_data.update(sulama_context)
            except Exception as e:
                print(f"Sulama context error: {e}")
                user_data.update({
                    'is_superuser': request.user.is_superuser,
                    'sulamalar': [],
                    'yetki_seviyesi': None
                })
            
            return Response({
                'success': True,
                'message': 'Profil güncellendi',
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'message': 'Profil güncellenemedi',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Şifre değiştirme view'i"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Şifreyi değiştir
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'success': True,
                'message': 'Şifre başarıyla değiştirildi'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'message': 'Şifre değiştirilemedi',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@csrf_exempt
def check_auth(request):
    """Kimlik doğrulama kontrolü"""
    if request.user.is_authenticated:
        user_data = UserSerializer(request.user).data
        try:
            sulama_context = get_user_sulama_context(request.user)
            user_data.update(sulama_context)
        except Exception as e:
            print(f"Sulama context error: {e}")
            user_data.update({
                'is_superuser': request.user.is_superuser,
                'sulamalar': [],
                'yetki_seviyesi': None
            })
        
        return Response({
            'authenticated': True,
            'user': user_data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'authenticated': False
    }, status=status.HTTP_401_UNAUTHORIZED)


class UserViewSet(ModelViewSet):
    """Kullanıcı yönetimi ViewSet (Admin için)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        """Kullanıcıları filtrele"""
        queryset = User.objects.select_related('profil').prefetch_related(
            'profil__kullanici_sulama_yetkileri__sulama'
        )
        
        # Sadece aktif kullanıcılar
        aktif = self.request.query_params.get('aktif')
        if aktif:
            queryset = queryset.filter(is_active=True)
        
        # Sulama sistemi filtresi
        sulama_id = self.request.query_params.get('sulama_id')
        if sulama_id:
            queryset = queryset.filter(profil__sulama_sistemleri__id=sulama_id)
        
        return queryset.order_by('username')
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Kullanıcıyı deaktif et"""
        user = self.get_object()
        user.is_active = False
        user.save()
        
        return Response({
            'success': True,
            'message': f'{user.username} kullanıcısı deaktif edildi'
        })


class KullaniciProfiliViewSet(ModelViewSet):
    """Kullanıcı profili ViewSet"""
    queryset = KullaniciProfili.objects.all()
    serializer_class = KullaniciProfiliSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        """Profilleri filtrele"""
        queryset = KullaniciProfili.objects.select_related('user').prefetch_related(
            'kullanici_sulama_yetkileri__sulama'
        )
        
        # Aktif kullanıcılar
        aktif = self.request.query_params.get('aktif')
        if aktif:
            queryset = queryset.filter(user__is_active=True)
        
        return queryset.order_by('user__username')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def login_history_view(request):
    """Kullanıcı giriş geçmişini getir"""
    try:
        user = request.user
        
        # Son 5 giriş kaydını al (başarılı ve başarısız)
        login_records = GirisKaydi.objects.filter(user=user).order_by('-giris_tarihi')[:5]
        
        history = []
        for record in login_records:
            history.append({
                'tarih': record.giris_tarihi.isoformat(),
                'ip_adresi': record.ip_adresi,
                'basarili': record.basarili,
                'hata_mesaji': record.hata_mesaji,
                'user_agent': record.user_agent
            })
        
        return Response({
            'success': True,
            'history': history
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Giriş geçmişi alınamadı: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
