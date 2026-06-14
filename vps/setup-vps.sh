#!/bin/bash
# setup-vps.sh - Setup script for Contabo VPS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_DIR="$SCRIPT_DIR"
PROJECT_ROOT="$(dirname "$VPS_DIR")"

echo "🚀 Sentry Data Platform - VPS Setup"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# 1. Update system
echo "📦 Updating system..."
apt-get update && apt-get upgrade -y

# 2. Install dependencies
echo "📦 Installing dependencies..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    docker.io \
    docker-compose \
    certbot \
    python3-certbot-nginx \
    nginx

# 3. Setup Docker
echo "🐳 Setting up Docker..."
systemctl enable docker
systemctl start docker
usermod -aG docker $SUDO_USER || true

# 4. Setup firewall
echo "🔥 Setting up firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Backend (internal)
ufw allow 8080/tcp  # Chat (internal)
ufw allow 8081/tcp  # Harness (internal)
ufw --force enable

# 5. Setup fail2ban
echo "🛡️  Setting up fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl start fail2ban

# 6. Create directories
echo "📁 Creating directories..."
mkdir -p /opt/sentry-data
mkdir -p /opt/sentry-data/secrets
mkdir -p /opt/sentry-data/nginx/ssl
mkdir -p /opt/sentry-data/logs
mkdir -p /opt/sentry-data/backups

# 7. Copy configuration
echo "📋 Copying configuration..."
cp "$VPS_DIR/docker-compose.yml" /opt/sentry-data/
cp -r "$VPS_DIR/nginx" /opt/sentry-data/

# 8. Setup environment
echo "🔧 Setting up environment..."
if [ ! -f /opt/sentry-data/.env ]; then
    cat > /opt/sentry-data/.env <<EOF
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_REGION=europe-west1
GCS_BUCKET_NAME=sentry-platform-data-your-project-id
BIGQUERY_DATASET_PREFIX=sentry_dataset
BIGQUERY_LOCATION=EU

# Secrets (generate these!)
JWT_SECRET=$(openssl rand -base64 32)
INTERNAL_TOKEN=$(openssl rand -base64 16)

# LLM
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash

# Features
ENABLE_BIGQUERY_ANALYTICS=true
CORS_ORIGIN=https://app.sentrydata.io
EOF
    echo "⚠️  Created .env file. Please edit /opt/sentry-data/.env with your values!"
fi

# 9. Setup GCP credentials
echo "🔑 Setting up GCP credentials..."
if [ ! -f /opt/sentry-data/secrets/gcp-key.json ]; then
    echo "⚠️  Please place your GCP service account key at:"
    echo "   /opt/sentry-data/secrets/gcp-key.json"
    echo ""
    echo "   You can generate one with:"
    echo "   gcloud iam service-accounts keys create gcp-key.json \\"
    echo "     --iam-account=sentry-backend@YOUR-PROJECT.iam.gserviceaccount.com"
fi

# 10. Setup SSL with Let's Encrypt
echo "🔒 Setting up SSL..."
read -p "Do you want to setup SSL now? (y/n) " setup_ssl
if [ "$setup_ssl" = "y" ]; then
    read -p "Enter your domain (e.g., api.sentrydata.io): " domain
    
    # Get certificate
    certbot certonly --standalone -d "$domain" --agree-tos --non-interactive --email admin@$domain
    
    # Copy certificates
    cp /etc/letsencrypt/live/$domain/fullchain.pem /opt/sentry-data/nginx/ssl/
    cp /etc/letsencrypt/live/$domain/privkey.pem /opt/sentry-data/nginx/ssl/
    
    # Update nginx config with domain
    sed -i "s/api.sentrydata.io/$domain/g" /opt/sentry-data/nginx/sites/api.conf
    
    echo "✅ SSL configured for $domain"
fi

# 11. Setup log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/sentry-data <<EOF
/opt/sentry-data/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

# 12. Create systemd service
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/sentry-data.service <<EOF
[Unit]
Description=Sentry Data Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/sentry-data
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
ExecReload=/usr/bin/docker-compose up -d

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sentry-data.service

# 13. Setup backup script
echo "💾 Setting up backup..."
cat > /opt/sentry-data/scripts/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/sentry-data/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup environment
cp /opt/sentry-data/.env "$BACKUP_DIR/env_$DATE.backup"

# Backup nginx configs
tar -czf "$BACKUP_DIR/nginx_$DATE.tar.gz" /opt/sentry-data/nginx

# Backup Docker volumes
docker run --rm -v sentry-data_certbot-data:/data -v "$BACKUP_DIR:/backup" alpine tar -czf /backup/certbot_$DATE.tar.gz /data

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -name "*.backup" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/sentry-data/scripts/backup.sh

# Setup cron for backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/sentry-data/scripts/backup.sh") | crontab -

# 14. Setup monitoring script
echo "📊 Setting up monitoring..."
cat > /opt/sentry-data/scripts/monitor.sh <<'EOF'
#!/bin/bash
# Simple monitoring script

LOG_FILE="/opt/sentry-data/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check services
SERVICES="sentry-backend sentry-chat sentry-harness sentry-nginx"
for service in $SERVICES; do
    if ! docker ps | grep -q "$service"; then
        echo "$DATE: WARNING - $service is not running!" >> "$LOG_FILE"
        # Restart service
        cd /opt/sentry-data && docker-compose up -d "$service"
    fi
done

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$DATE: WARNING - Disk usage is ${DISK_USAGE}%!" >> "$LOG_FILE"
fi

# Check memory
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "$DATE: WARNING - Memory usage is ${MEMORY_USAGE}%!" >> "$LOG_FILE"
fi
EOF

chmod +x /opt/sentry-data/scripts/monitor.sh

# Setup cron for monitoring (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/sentry-data/scripts/monitor.sh") | crontab -

# 15. Final instructions
echo ""
echo "✅ VPS Setup Complete!"
echo "======================"
echo ""
echo "Next steps:"
echo "1. Edit /opt/sentry-data/.env with your configuration"
echo "2. Place GCP service account key at /opt/sentry-data/secrets/gcp-key.json"
echo "3. Run: cd /opt/sentry-data && docker-compose up -d"
echo "4. Configure Cloudflare DNS to point to this VPS IP"
echo ""
echo "Useful commands:"
echo "  Start:    docker-compose up -d"
echo "  Stop:     docker-compose down"
echo "  Logs:     docker-compose logs -f"
echo "  Update:   docker-compose pull && docker-compose up -d"
echo "  Backup:   /opt/sentry-data/scripts/backup.sh"
echo "  Monitor:  tail -f /opt/sentry-data/logs/monitor.log"
echo ""
echo "VPS IP: $(curl -s ifconfig.me)"
echo ""
