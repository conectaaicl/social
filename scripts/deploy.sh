#!/bin/bash

# ─────────────────────────────────────────────
# ConectaAI Social — Deploy Script
# VPS: 62.169.17.214 | Puerto: 3011
# ─────────────────────────────────────────────

set -e

APP_NAME="social-conectaai"
APP_DIR="/var/www/social-conectaai"
REPO_URL="REEMPLAZAR_CON_TU_REPO_GIT"
PORT=3011
DB_NAME="social_db"

echo "🚀 Iniciando deploy de ConectaAI Social..."

# ── 1. Crear base de datos si no existe ──────
echo "📦 Verificando base de datos..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
echo "✅ Base de datos lista: $DB_NAME"

# ── 2. Clonar o actualizar repo ──────────────
if [ -d "$APP_DIR" ]; then
  echo "📥 Actualizando código..."
  cd $APP_DIR
  git pull origin main
else
  echo "📥 Clonando repositorio..."
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR
fi

# ── 3. Crear .env si no existe ───────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚙️  Creando .env desde template..."
  cp $APP_DIR/.env.example $APP_DIR/.env
  echo ""
  echo "⚠️  IMPORTANTE: Edita el archivo .env antes de continuar:"
  echo "   nano $APP_DIR/.env"
  echo ""
  read -p "¿Ya editaste el .env? (s/n): " confirm
  if [ "$confirm" != "s" ]; then
    echo "❌ Deploy cancelado. Edita el .env y vuelve a correr este script."
    exit 1
  fi
fi

# ── 4. Instalar dependencias ─────────────────
echo "📦 Instalando dependencias..."
cd $APP_DIR
npm install

# ── 5. Generar Prisma client ─────────────────
echo "🔧 Generando Prisma client..."
npx prisma generate

# ── 6. Correr migraciones ────────────────────
echo "🗄️  Corriendo migraciones..."
npx prisma migrate deploy

# ── 7. Build de Next.js ──────────────────────
echo "🏗️  Building Next.js..."
npm run build

# ── 8. PM2 ──────────────────────────────────
echo "⚡ Configurando PM2..."
if pm2 list | grep -q "$APP_NAME"; then
  pm2 restart $APP_NAME
  echo "✅ PM2 reiniciado"
else
  pm2 start npm --name "$APP_NAME" -- start
  pm2 save
  echo "✅ PM2 iniciado"
fi

# ── 9. Nginx ─────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/social-conectaai"

if [ ! -f "$NGINX_CONF" ]; then
  echo "🌐 Configurando Nginx..."
  cat > $NGINX_CONF << 'NGINX'
server {
    listen 80;
    server_name social.conectaai.cl;

    location / {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

  ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  echo "✅ Nginx configurado"

  # SSL con Certbot
  echo "🔒 Configurando SSL..."
  certbot --nginx -d social.conectaai.cl --non-interactive --agree-tos \
    -m admin@conectaai.cl || echo "⚠️  SSL no configurado, hazlo manualmente con: certbot --nginx -d social.conectaai.cl"
else
  echo "✅ Nginx ya configurado"
fi

echo ""
echo "🎉 Deploy completado!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 URL:    https://social.conectaai.cl"
echo "⚡ Puerto: $PORT"
echo "🗄️  DB:     $DB_NAME"
echo "📋 PM2:    pm2 logs $APP_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
