#!/bin/bash

# Production deployment scripti
set -e

echo "🚀 Production deployment başlıyor..."

# Gerekli dosyaların varlığını kontrol et
if [ ! -f ".env.prod" ]; then
    echo "❌ .env.prod dosyası bulunamadı!"
    echo "📋 .env.prod.example dosyasını kopyalayıp .env.prod olarak adlandırın ve doldurun."
    exit 1
fi

# Eski konteynerları durdur ve temizle
echo "🔄 Eski konteynerlar temizleniyor..."
docker compose -f docker-compose.prod.yml down --remove-orphans

# Volume'leri temizle (opsiyonel - dikkatli kullanın!)
read -p "⚠️  Volume'leri de temizlemek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume prune -f
fi

# Yeni imajları build et
echo "🔨 Yeni imajlar build ediliyor..."
docker compose -f docker-compose.prod.yml build --no-cache

# Konteynerları başlat
echo "▶️  Konteynerlar başlatılıyor..."
docker compose -f docker-compose.prod.yml up -d

# Database migration'larını çalıştır
echo "📊 Database migration'ları uygulanıyor..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate

# Static dosyaları topla
echo "📁 Static dosyalar toplanıyor..."
docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput

# Superuser oluştur (opsiyonel)
read -p "🔑 Superuser oluşturmak istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
fi

# Konteyner durumlarını kontrol et
echo "📋 Konteyner durumları:"
docker compose -f docker-compose.prod.yml ps

# Health check
echo "🔍 Health check yapılıyor..."
sleep 10
if curl -f http://localhost:60/admin/ > /dev/null 2>&1; then
    echo "✅ Deployment başarılı! Site çalışıyor."
else
    echo "❌ Deployment hatası! Logları kontrol edin:"
    echo "docker-compose -f docker-compose.prod.yml logs"
fi

echo "🎉 Deployment tamamlandı!" 