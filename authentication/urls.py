from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView, ProfileView, ChangePasswordView, 
    check_auth, UserViewSet, KullaniciProfiliViewSet, login_history_view
)

# Router oluştur
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'profiles', KullaniciProfiliViewSet)

app_name = 'authentication'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('check-auth/', check_auth, name='check-auth'),
    path('login-history/', login_history_view, name='login-history'),
    
    # Admin endpoints
    path('admin/', include(router.urls)),
] 