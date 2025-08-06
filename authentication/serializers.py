from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import KullaniciProfili, KullaniciSulamaYetkisi
from sulama.models import Sulama


class LoginSerializer(serializers.Serializer):
    """Login serializer"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Kullanıcı hesabı deaktif.')
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError('Geçersiz kullanıcı adı veya şifre.')
        else:
            raise serializers.ValidationError('Kullanıcı adı ve şifre gerekli.')


class SulamaBasitSerializer(serializers.ModelSerializer):
    """Sulama sistemi basit serializer"""
    bolge_isim = serializers.CharField(source='bolge.isim', read_only=True)
    
    class Meta:
        model = Sulama
        fields = ['id', 'isim', 'bolge_isim']


class KullaniciSulamaYetkisiSerializer(serializers.ModelSerializer):
    """Kullanıcı sulama yetkisi serializer"""
    sulama = SulamaBasitSerializer(read_only=True)
    yetki_seviyesi_display = serializers.CharField(source='get_yetki_seviyesi_display', read_only=True)
    
    class Meta:
        model = KullaniciSulamaYetkisi
        fields = ['id', 'sulama', 'yetki_seviyesi', 'yetki_seviyesi_display', 'aktif', 'is_aktif']


class KullaniciProfiliSerializer(serializers.ModelSerializer):
    """Kullanıcı profili serializer"""
    kullanici_sulama_yetkileri = KullaniciSulamaYetkisiSerializer(many=True, read_only=True)
    
    class Meta:
        model = KullaniciProfili
        fields = ['id', 'telefon', 'adres', 'unvan', 'departman', 'aktif', 'kullanici_sulama_yetkileri']


class UserSerializer(serializers.ModelSerializer):
    """Kullanıcı serializer"""
    profil = KullaniciProfiliSerializer(read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_staff', 'is_superuser', 'profil']
        read_only_fields = ['id', 'username', 'is_staff', 'is_superuser']


class ChangePasswordSerializer(serializers.Serializer):
    """Şifre değiştirme serializer"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError('Yeni şifreler eşleşmiyor.')
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Mevcut şifre yanlış.')
        return value


class UserUpdateSerializer(serializers.ModelSerializer):
    """Kullanıcı güncelleme serializer"""
    profil_telefon = serializers.CharField(source='profil.telefon', required=False, allow_blank=True)
    profil_adres = serializers.CharField(source='profil.adres', required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'profil_telefon', 'profil_adres']
    
    def update(self, instance, validated_data):
        # Profil verilerini al
        profil_data = {}
        if 'profil' in validated_data:
            profil_data = validated_data.pop('profil')
        
        # User verilerini güncelle
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Profil verilerini güncelle
        if profil_data and hasattr(instance, 'profil'):
            profil = instance.profil
            for attr, value in profil_data.items():
                setattr(profil, attr, value)
            profil.save()
        
        return instance 