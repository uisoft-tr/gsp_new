# Makina Takip Modülü - URLs
# Bu dosyayı ana urls.py dosyasına ekleyin

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MakinaViewSet, MakinaKonumViewSet, MakinaIsViewSet

# Makina takip sistemi router
router = DefaultRouter()
router.register(r'makinalar', MakinaViewSet, basename='makina')
router.register(r'makina-konumlar', MakinaKonumViewSet, basename='makina-konum')
router.register(r'makina-isler', MakinaIsViewSet, basename='makina-is')

urlpatterns = [
    path('', include(router.urls)),
] 