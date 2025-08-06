# Makina Takip Modülü - Views
# Bu dosyayı ana views.py dosyasına ekleyin

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.utils import timezone
from authentication.mixins import SulamaBazliMixin
from authentication.permissions import SulamaYetkisiPermission
from sulama.models import Makina, MakinaKonum, MakinaIs
from .serializers import MakinaSerializer, MakinaKonumSerializer, MakinaIsSerializer

class MakinaViewSet(SulamaBazliMixin, viewsets.ModelViewSet):
    """
    Makina yönetimi ViewSet
    """
    queryset = Makina.objects.select_related('sulama__bolge').all()
    serializer_class = MakinaSerializer
    permission_classes = [SulamaYetkisiPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sulama', 'makina_tipi', 'durum']
    search_fields = ['isim', 'plaka', 'model', 'sulama__isim']
    ordering_fields = ['isim', 'makina_tipi', 'durum', 'olusturma_tarihi']
    ordering = ['sulama__bolge__isim', 'sulama__isim', 'isim']
    pagination_class = None

    def get_queryset(self):
        """Kullanıcının yetkili olduğu sulama sistemlerine ait makineleri getir"""
        base_queryset = super().get_queryset()
        return self.filter_by_sulama_permission(base_queryset, 'sulama')

    @action(detail=False, methods=['get'])
    def harita_verileri(self, request):
        """Harita için makina konum verilerini getir"""
        makinalar = self.get_queryset().prefetch_related('konumlar', 'isler')
        
        harita_verileri = []
        for makina in makinalar:
            son_konum = makina.konumlar.first()
            aktif_is = makina.isler.filter(durum='devam_ediyor').first()
            
            makina_data = {
                'id': makina.id,
                'birlik_no': makina.birlik_no,
                'isim': makina.isim,
                'makina_tipi': makina.makina_tipi,
                'makina_tipi_display': makina.get_makina_tipi_display(),
                'plaka': makina.plaka,
                'model': makina.model,
                'yil': makina.yil,
                'durum': makina.durum,
                'durum_display': makina.get_durum_display(),
                'sulama': makina.sulama.isim if makina.sulama else None,
                'bolge': makina.sulama.bolge.isim if makina.sulama and makina.sulama.bolge else None,
                'aciklama': makina.aciklama,
                'son_konum': {
                    'enlem': float(son_konum.enlem) if son_konum else None,
                    'boylam': float(son_konum.boylam) if son_konum else None,
                    'kayit_zamani': son_konum.kayit_zamani.isoformat() if son_konum else None,
                } if son_konum else None,
                'aktif_is': {
                    'id': aktif_is.id,
                    'baslik': aktif_is.baslik,
                    'is_tipi': aktif_is.is_tipi,
                    'is_tipi_display': aktif_is.get_is_tipi_display(),
                    'durum': aktif_is.durum,
                    'baslangic_zamani': aktif_is.baslangic_zamani.isoformat() if aktif_is.baslangic_zamani else None,
                } if aktif_is else None,
            }
            harita_verileri.append(makina_data)
        
        return Response({
            'makinalar': harita_verileri,
        })

class MakinaKonumViewSet(SulamaBazliMixin, viewsets.ModelViewSet):
    """
    Makina konum takibi ViewSet
    """
    queryset = MakinaKonum.objects.select_related('makina__sulama__bolge').all()
    serializer_class = MakinaKonumSerializer
    permission_classes = [SulamaYetkisiPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['makina', 'makina__sulama', 'motor_calisma']
    search_fields = ['makina__isim', 'makina__plaka']
    ordering_fields = ['kayit_zamani', 'makina__isim']
    ordering = ['-kayit_zamani']

    def get_queryset(self):
        """Kullanıcının yetkili olduğu sulama sistemlerine ait makina konumlarını getir"""
        base_queryset = super().get_queryset()
        return self.filter_by_sulama_permission(base_queryset, 'makina__sulama')

    @action(detail=False, methods=['post'])
    def toplu_guncelle(self, request):
        """Toplu makina konum güncelleme"""
        veriler = request.data.get('veriler', [])
        guncellenen_sayisi = 0
        
        for veri in veriler:
            makina_id = veri.get('makina_id')
            enlem = veri.get('enlem')
            boylam = veri.get('boylam')
            
            if makina_id and enlem and boylam:
                MakinaKonum.objects.create(
                    makina_id=makina_id,
                    enlem=enlem,
                    boylam=boylam
                )
                guncellenen_sayisi += 1
        
        return Response({
            'message': f'{guncellenen_sayisi} makina konumu güncellendi',
            'guncellenen_sayisi': guncellenen_sayisi
        })

class MakinaIsViewSet(SulamaBazliMixin, viewsets.ModelViewSet):
    """
    Makina iş takibi ViewSet
    """
    queryset = MakinaIs.objects.select_related('makina__sulama__bolge').all()
    serializer_class = MakinaIsSerializer
    permission_classes = [SulamaYetkisiPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['makina', 'makina__sulama', 'is_tipi', 'durum']
    search_fields = ['baslik', 'aciklama', 'makina__isim']
    ordering_fields = ['baslangic_zamani', 'bitis_zamani', 'durum']
    ordering = ['-baslangic_zamani']
    pagination_class = None

    def get_queryset(self):
        """Kullanıcının yetkili olduğu sulama sistemlerine ait makina işlerini getir"""
        base_queryset = super().get_queryset()
        return self.filter_by_sulama_permission(base_queryset, 'makina__sulama')

    @action(detail=True, methods=['post'])
    def baslat(self, request, pk=None):
        """İşi başlat"""
        makina_is = self.get_object()
        makina_is.durum = 'devam_ediyor'
        makina_is.baslangic_zamani = timezone.now()
        makina_is.save()
        
        return Response({
            'message': 'İş başlatıldı',
            'durum': makina_is.durum,
            'baslangic_zamani': makina_is.baslangic_zamani
        })

    @action(detail=True, methods=['post'])
    def bitir(self, request, pk=None):
        """İşi bitir"""
        makina_is = self.get_object()
        makina_is.durum = 'tamamlandi'
        makina_is.bitis_zamani = timezone.now()
        makina_is.save()
        
        return Response({
            'message': 'İş tamamlandı',
            'durum': makina_is.durum,
            'bitis_zamani': makina_is.bitis_zamani
        }) 