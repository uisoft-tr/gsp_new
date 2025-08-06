# 🚀 Production Deployment Rehberi

Bu rehber, GSP Yönetim Sistemi'ni production ortamına deploy etmek için gerekli adımları içerir.

## ⚡ Hızlı Deployment

1. **Proje dosyalarını sunucuya yükleyin**
2. **Environment variables'ı ayarlayın**
3. **Deploy scriptini çalıştırın**

## 📋 Gereksinimler

- Docker & Docker Compose
- Domain adı ve DNS ayarları (opsiyonel)
- En az 2GB RAM
- En az 10GB disk alanı

## 🔧 Deployment Adımları

### 1. Environment Variables

```bash
# .env.prod.example dosyasını kopyalayın
cp .env.prod.example .env.prod

# Değerleri kendi bilgilerinizle doldurun
nano .env.prod
```

**Önemli:** Aşağıdaki değerleri mutlaka değiştirin:
- `SECRET_KEY`: Django için güçlü bir secret key
- `DB_PASSWORD`: Güçlü veritabanı şifresi
- `ALLOWED_HOSTS`: Sunucu domain'iniz
- `CORS_ALLOWED_ORIGINS`: Frontend domain'iniz

### 2. Deployment

```bash
# Deploy scriptini çalıştırın
./deploy.sh
```

## 🔐 Güvenlik Kontrolleri

Production'a geçmeden önce kontrol edin:

- [ ] `DEBUG=False` ayarlandı
- [ ] Güçlü `SECRET_KEY` kullanılıyor
- [ ] Güçlü veritabanı şifresi ayarlandı
- [ ] `CORS_ALLOW_ALL_ORIGINS=False` yapıldı
- [ ] `ALLOWED_HOSTS` sadece gerekli domain'leri içeriyor
- [ ] Firewall ayarları yapıldı (port 80 açık)

## 📊 Monitoring & Backup

### Logları İzleme

```bash
# Tüm servislerin logları
docker-compose -f docker-compose.prod.yml logs -f

# Sadece web servisinin logları
docker-compose -f docker-compose.prod.yml logs -f web
```

### Backup

```bash
# Manual backup
./backup.sh

# Crontab ile otomatik backup (günlük saat 02:00)
0 2 * * * /path/to/backup.sh
```

### Health Check

```bash
# Servislerin durumu
docker-compose -f docker-compose.prod.yml ps

# Site erişim testi
curl -I http://yourdomain.com:60
```

## 🔄 Güncellemeler

Yeni versiyon deploy etmek için:

```bash
# Git'ten yeni kodu çekin
git pull origin main

# Deploy scriptini çalıştırın
./deploy.sh
```

## 🆘 Sorun Giderme

### Yaygın Sorunlar

**1. Database Bağlantı Hatası**
```bash
# Database konteynerini kontrol edin
docker-compose -f docker-compose.prod.yml logs db
```

**2. Static Files Yüklenmiyor**
```bash
# Static dosyaları yeniden toplayın
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

### Acil Durum Geri Alma

```bash
# Önceki versiyona geri dön
git checkout HEAD~1
./deploy.sh

# Backup'tan database geri yükle
gunzip < /backup/db_backup_YYYYMMDD_HHMMSS.sql.gz | docker-compose -f docker-compose.prod.yml exec -T db psql -U ${DB_USER} ${DB_NAME}
```

## 📞 Destek

Deployment sorunları için:
- Logları kontrol edin
- Environment variables'ı doğrulayın
- Firewall ayarlarını kontrol edin
- Domain DNS ayarlarını kontrol edin

## 🔒 Güvenlik Notları

- Asla production şifrelerini version control'e commit etmeyin
- Düzenli backup alın
- Network güvenliğini sağlayın
- Sistem güncellemelerini takip edin
- Logları düzenli kontrol edin 