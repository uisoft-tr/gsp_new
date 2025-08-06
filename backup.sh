#!/bin/bash

# Backup scripti
set -e

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="docker-compose.prod.yml"

echo "💾 Backup işlemi başlıyor..."

# Backup dizinini oluştur
mkdir -p $BACKUP_DIR

# Database backup
echo "📊 Veritabanı backup'ı alınıyor..."
docker compose -f $COMPOSE_FILE exec -T db pg_dump -U ${DB_USER} ${DB_NAME} | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Media files backup
echo "📁 Medya dosyaları backup'ı alınıyor..."
docker run --rm -v gsp_media_volume:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/media_backup_$DATE.tar.gz -C /source .

# Static files backup (opsiyonel)
echo "🎨 Static dosyalar backup'ı alınıyor..."
docker run --rm -v gsp_static_volume:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/static_backup_$DATE.tar.gz -C /source .

# Eski backup'ları temizle (30 günden eski)
echo "🧹 Eski backup'lar temizleniyor..."
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "✅ Backup tamamlandı!"
echo "📍 Backup dosyaları: $BACKUP_DIR"
ls -lah $BACKUP_DIR/*$DATE* 