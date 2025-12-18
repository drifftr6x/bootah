# Bootah - Complete Self-Hosting Installation Guide

## 📚 Documentation Index

This comprehensive guide covers multiple deployment methods for self-hosting Bootah. Choose the method that best fits your infrastructure:

- **[Automated Installation Scripts](#automated-installation)** ⭐ Fastest way to get started
- **[Quick Start with Docker](#quick-start-docker)** - Manual Docker setup
- **[Docker Deployment](#docker-deployment)** - Complete containerized setup
- **[Linux Bare Metal](#linux-bare-metal-installation)** - Direct Ubuntu/Debian installation
- **[Proxmox LXC](#proxmox-lxc-container)** - See PROXMOX_INSTALLATION_GUIDE.md
- **[Kubernetes](#kubernetes-deployment-advanced)** - Enterprise deployments

---

## 🚀 Automated Installation

### One-Line Docker Install

```bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-docker.sh | bash
```

This interactive script will:
- Check Docker prerequisites
- Prompt for configuration (IP, ports, email settings)
- Generate secure passwords and secrets
- Create docker-compose.yml and .env files
- Start all services
- Provide access instructions

### One-Line Linux Install (Ubuntu/Debian)

```bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-linux.sh | sudo bash
```

This script will:
- Install Node.js 20 and PostgreSQL
- Create a dedicated `bootah` system user
- Clone and build the application
- Configure the database
- Create a systemd service
- Configure the firewall
- Start Bootah automatically

### One-Line Proxmox LXC Install

```bash
# Inside your Proxmox LXC container:
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-proxmox.sh | bash
```

This script will:
- Detect if running inside LXC container
- Install Node.js 20 and PostgreSQL (or use external DB)
- Configure for standard or alternative ports
- Create systemd service or init script (works with/without systemd)
- Provide network configuration guidance for PXE
- Start Bootah automatically

### Configuration Wizard

After installation, use the configuration wizard to modify settings:

```bash
cd ~/bootah  # or /opt/bootah for Linux install
./scripts/configure.sh
```

The wizard provides an interactive menu to configure:
- Server settings (port, IP)
- Authentication (local/OAuth, registration)
- Email (SMTP, SendGrid)
- Session secrets

---

## ⚡ Quick Start with Docker (5 Minutes)

```bash
# 1. Clone repository
git clone https://github.com/drifftr6x/bootah.git
cd bootah

# 2. Create environment file (generates secure secrets automatically)
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
DATABASE_URL=postgresql://bootah:\${POSTGRES_PASSWORD}@postgres:5432/bootah
SESSION_SECRET=$(openssl rand -base64 32)
AUTH_MODE=local
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "192.168.1.50")
TFTP_PORT=6969
DHCP_PORT=4067
EOF

# 3. Start with Docker Compose
docker-compose up -d

# 4. Access at http://localhost:5000
# First user to register becomes admin
```

**That's it!** The application is now running with PostgreSQL database included.

---

## 🐳 Docker Deployment (Complete)

### Requirements
- Docker Engine 20.10+
- Docker Compose 1.29+
- 4GB RAM minimum
- 2 CPU cores
- 30GB free disk space

### Step 1: Create Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN addgroup -g 1000 bootah && \
    adduser -D -u 1000 -G bootah bootah && \
    mkdir -p /app/images /app/logs && \
    chown -R bootah:bootah /app

USER bootah
EXPOSE 5000 6969/udp 4067/udp

ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Step 2: Create docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bootah-postgres
    environment:
      POSTGRES_USER: bootah
      POSTGRES_PASSWORD: bootah_secure_pass
      POSTGRES_DB: bootah
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bootah"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bootah-network
    restart: unless-stopped

  bootah:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bootah-app
    environment:
      NODE_ENV: production
      PORT: 5000
      HOST: 0.0.0.0
      DATABASE_URL: postgresql://bootah:bootah_secure_pass@postgres:5432/bootah
      SESSION_SECRET: ${SESSION_SECRET}
      AUTH_MODE: local              # Use 'local' for username/password, 'replit' for OAuth
      ALLOW_REGISTRATION: "true"    # Allow new user registrations
      DEFAULT_USER_ROLE: admin
      PXE_SERVER_IP: 192.168.1.50
      TFTP_PORT: 6969
      DHCP_PORT: 4067
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:5000"      # HTTP
      - "6969:6969/udp"  # TFTP
      - "4067:4067/udp"  # DHCP Proxy
    volumes:
      - bootah_images:/app/images
      - bootah_logs:/app/logs
    networks:
      - bootah-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  bootah_images:
    driver: local
  bootah_logs:
    driver: local

networks:
  bootah-network:
    driver: bridge
```

### Step 3: Generate SESSION_SECRET

```bash
# Generate secure secret
export SESSION_SECRET=$(openssl rand -base64 32)
echo $SESSION_SECRET

# Update .env file with the generated secret
```

### Step 4: Deploy

```bash
# Build and start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f bootah

# Stop (if needed)
docker-compose down

# View database
docker-compose exec postgres psql -U bootah -d bootah -c "SELECT * FROM devices LIMIT 5;"
```

### Docker Operations

```bash
# Restart application
docker-compose restart bootah

# View real-time logs
docker-compose logs -f

# Enter container shell
docker-compose exec bootah sh

# Backup database
docker-compose exec postgres pg_dump -U bootah bootah > backup.sql

# Restore database
docker-compose exec postgres psql -U bootah bootah < backup.sql

# Update and rebuild
git pull origin main
docker-compose down
docker-compose up -d --build
```

---

## 🐧 Linux Bare Metal Installation

### System Requirements
- Ubuntu 22.04 LTS or Debian 12
- Root or sudo access
- 2GB+ RAM, 2+ CPU cores
- 20GB+ disk space
- Static IP address

### Step 1: System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install build tools and dependencies
sudo apt install -y \
  curl git wget nano htop net-tools \
  build-essential python3-dev \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  fail2ban ufw
```

### Step 2: Install Node.js

```bash
# Add NodeSource repository for Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Configure PostgreSQL

```bash
# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE bootah;
CREATE USER bootah WITH ENCRYPTED PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE bootah TO bootah;
\c bootah
GRANT ALL ON SCHEMA public TO bootah;
ALTER DATABASE bootah OWNER TO bootah;
EOF

# Test connection
psql -U bootah -d bootah -h localhost -c "SELECT version();"
```

### Step 4: Create Bootah User & Directory

```bash
# Create non-root user
sudo useradd -m -s /bin/bash bootah
sudo usermod -aG sudo bootah

# Create application directory
sudo -u bootah mkdir -p /home/bootah/app
cd /home/bootah/app

# Clone repository
sudo -u bootah git clone https://github.com/drifftr6x/bootah.git .
```

### Step 5: Configure Environment

```bash
# Create .env file
sudo -u bootah cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:secure_password_123@localhost:5432/bootah
SESSION_SECRET=$(openssl rand -base64 32)
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=$(hostname -I | awk '{print $1}')
TFTP_PORT=6969
DHCP_PORT=4067
IMAGE_STORAGE_PATH=/home/bootah/images
EOF

# Create image storage
sudo -u bootah mkdir -p /home/bootah/images
```

### Step 6: Install Dependencies & Build

```bash
# Install Node dependencies
sudo -u bootah npm install --production

# Build application
sudo -u bootah npm run build

# Run database migrations
sudo -u bootah npm run db:push
```

### Step 7: Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/bootah.service > /dev/null << 'EOF'
[Unit]
Description=Bootah PXE Boot Management Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=bootah
WorkingDirectory=/home/bootah/app
EnvironmentFile=/home/bootah/app/.env
ExecStart=/usr/bin/node /home/bootah/app/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bootah

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable bootah
sudo systemctl start bootah

# Check status
sudo systemctl status bootah
```

### Step 8: Configure NGINX Reverse Proxy

```bash
# Create NGINX configuration
sudo tee /etc/nginx/sites-available/bootah > /dev/null << 'EOF'
server {
    listen 80;
    server_name bootah.yourdomain.com;
    
    client_max_body_size 10G;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    
    location / {
        proxy_pass http://localhost:5000;
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
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/bootah /etc/nginx/sites-enabled/

# Test and restart NGINX
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Setup SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d bootah.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 10: Configure Firewall

```bash
# Enable UFW and allow required ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 69/udp      # TFTP
sudo ufw allow 6969/udp    # TFTP (alt)
sudo ufw allow 4067/udp    # DHCP
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

### Step 11: Setup Security

```bash
# Configure fail2ban for SSH protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Step 12: Setup Automated Backups

```bash
# Create backup script
sudo tee /usr/local/bin/bootah-backup.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/bootah"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U bootah bootah | gzip > $BACKUP_DIR/bootah_db_$DATE.sql.gz

# Backup images
tar -czf $BACKUP_DIR/bootah_images_$DATE.tar.gz /home/bootah/images

# Keep only last 30 days of backups
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/bootah-backup.sh

# Schedule daily backups at 2 AM
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/bootah-backup.sh") | sudo crontab -
```

### Verify Installation

```bash
# Check service status
sudo systemctl status bootah

# View logs
sudo journalctl -u bootah -f

# Test API
curl http://localhost:5000

# Check with NGINX proxy
curl http://bootah.yourdomain.com

# Monitor resources
htop
```

---

## ☸️ Kubernetes Deployment (Advanced)

### Prerequisites
- Kubernetes 1.20+
- kubectl configured
- Helm 3.0+ (optional)
- Storage provisioner (e.g., local-path, rook-ceph)

### Step 1: Create Namespace

```bash
kubectl create namespace bootah
```

### Step 2: Create Secrets

```bash
# Database password
kubectl create secret generic bootah-db-secret \
  --from-literal=password=bootah_secure_pass_123 \
  -n bootah

# Session secret
kubectl create secret generic bootah-session-secret \
  --from-literal=secret=$(openssl rand -base64 32) \
  -n bootah
```

### Step 3: Deploy PostgreSQL (using Helm)

```bash
# Add Bitnami Helm repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Deploy PostgreSQL
helm install bootah-postgres bitnami/postgresql \
  --namespace bootah \
  --set auth.username=bootah \
  --set auth.password=bootah_secure_pass_123 \
  --set auth.database=bootah \
  --set persistence.size=20Gi
```

### Step 4: Create Deployment Manifest

```yaml
# bootah-k8s-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bootah-config
  namespace: bootah
data:
  NODE_ENV: "production"
  PORT: "5000"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bootah
  namespace: bootah
  labels:
    app: bootah
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bootah
  template:
    metadata:
      labels:
        app: bootah
    spec:
      containers:
      - name: bootah
        image: your-registry/bootah:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
          name: http
        - containerPort: 6969
          protocol: UDP
          name: tftp
        - containerPort: 4067
          protocol: UDP
          name: dhcp
        envFrom:
        - configMapRef:
            name: bootah-config
        env:
        - name: DATABASE_URL
          value: "postgresql://bootah:bootah_secure_pass_123@bootah-postgres:5432/bootah"
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: bootah-session-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: images
          mountPath: /app/images
      volumes:
      - name: images
        persistentVolumeClaim:
          claimName: bootah-images

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: bootah-images
  namespace: bootah
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi

---
apiVersion: v1
kind: Service
metadata:
  name: bootah-service
  namespace: bootah
spec:
  selector:
    app: bootah
  ports:
  - port: 5000
    targetPort: 5000
    protocol: TCP
    name: http
  - port: 6969
    targetPort: 6969
    protocol: UDP
    name: tftp
  - port: 4067
    targetPort: 4067
    protocol: UDP
    name: dhcp
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bootah-ingress
  namespace: bootah
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "10G"
spec:
  tls:
  - hosts:
    - bootah.yourdomain.com
    secretName: bootah-tls
  rules:
  - host: bootah.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bootah-service
            port:
              number: 5000
```

### Step 5: Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f bootah-k8s-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/bootah -n bootah

# Check pods
kubectl get pods -n bootah

# View logs
kubectl logs -n bootah -l app=bootah -f

# Port forward (local testing)
kubectl port-forward -n bootah svc/bootah-service 5000:5000
```

---

## 🔐 Authentication Configuration

Bootah supports two authentication modes for flexible deployment scenarios:

### Authentication Modes

| Mode | Use Case | Description |
|------|----------|-------------|
| `replit` | Cloud/Replit deployments | OAuth-based authentication using Replit identity |
| `local` | Self-hosted/Air-gapped | Traditional username/password authentication |

### Choosing Your Authentication Mode

**Replit Mode (Default)** - Best for:
- Deployments on Replit platform
- Cloud environments with OAuth capabilities
- Organizations using Replit for identity management

**Local Mode** - Best for:
- Self-hosted installations
- Air-gapped networks without internet access
- Organizations with existing user directories
- Environments requiring local password management

### Configuring Local Authentication

To enable local authentication, set the `AUTH_MODE` environment variable:

```env
# .env file for local authentication
AUTH_MODE=local

# Required for local auth
SESSION_SECRET=YOUR_SECURE_RANDOM_STRING_32_CHARS_MINIMUM

# Optional: Allow new user registrations (default: true)
ALLOW_REGISTRATION=true

# Optional: Default role for new users (default: viewer)
DEFAULT_USER_ROLE=viewer
```

### Initial Setup (Local Mode)

When using local authentication for the first time:

1. Start the application with `AUTH_MODE=local`
2. Navigate to the web interface
3. You'll be prompted to create the initial administrator account
4. Enter username, email, and a strong password (12+ characters)
5. The first user is automatically assigned the `admin` role

### Password Policy (Local Mode)

Local authentication enforces strong password requirements:

- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*...)
- Cannot reuse the last 5 passwords
- Passwords expire after 90 days (configurable)

### Account Security Features (Local Mode)

- **Account Lockout**: 5 failed login attempts = 30-minute lockout
- **Login History**: All login attempts are logged with IP and timestamp
- **Password Reset**: Self-service password reset via email
- **Session Management**: Secure session handling with configurable TTL

### Email Configuration (for Password Reset)

Bootah supports three email providers for sending password reset emails:

| Provider | Use Case | Configuration |
|----------|----------|---------------|
| `console` | Development/Testing | Emails logged to console (default) |
| `smtp` | Self-hosted SMTP server | Configure SMTP settings |
| `sendgrid` | SendGrid cloud service | Provide API key |

#### Console Mode (Default)
In console mode, password reset emails are logged to the server console. Use this for development or when email isn't needed.

```env
EMAIL_PROVIDER=console
```

#### SMTP Configuration
For organizations with their own mail server:

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM=Bootah <noreply@yourdomain.com>
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
APP_URL=https://bootah.yourdomain.com
```

#### SendGrid Configuration
For cloud-based email delivery:

```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=Bootah <noreply@yourdomain.com>
SENDGRID_API_KEY=SG.your-api-key-here
APP_URL=https://bootah.yourdomain.com
```

#### Gmail SMTP Example
To use Gmail as your SMTP provider:

1. Enable 2-factor authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Configure:

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM=Your Name <your-email@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Environment Variables Reference

```env
# Authentication mode: 'replit' (default) or 'local'
AUTH_MODE=local

# Session secret (required for both modes)
SESSION_SECRET=YOUR_SECURE_RANDOM_STRING_32_CHARS_MINIMUM

# Allow new user self-registration (local mode only)
ALLOW_REGISTRATION=true

# Default role for new users: viewer, operator, or admin
DEFAULT_USER_ROLE=viewer

# Password expiry in days (local mode only, default: 90)
PASSWORD_EXPIRY_DAYS=90

# Email provider: 'console' (default), 'smtp', or 'sendgrid'
EMAIL_PROVIDER=smtp

# Email sender address
EMAIL_FROM=Bootah <noreply@yourdomain.com>

# Application URL for email links
APP_URL=https://bootah.yourdomain.com

# SMTP settings (when EMAIL_PROVIDER=smtp)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=username
SMTP_PASS=password

# SendGrid API key (when EMAIL_PROVIDER=sendgrid)
# SENDGRID_API_KEY=SG.your-api-key
```

---

## 🔒 Production Hardening

### Security Checklist

```
- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set strong SESSION_SECRET (32+ characters)
- [ ] Enable automatic security updates
- [ ] Setup database backups
- [ ] Use strong database password
- [ ] Restrict SSH access
- [ ] Enable fail2ban
- [ ] Configure monitoring
- [ ] Enable logging
- [ ] Setup rate limiting
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database - use strong password
DATABASE_URL=postgresql://bootah:STRONG_PASSWORD_HERE@db-host:5432/bootah

# Authentication - see Authentication Configuration section
AUTH_MODE=local                     # 'local' for self-hosted, 'replit' for cloud
ALLOW_REGISTRATION=false            # Disable registration in production
SESSION_SECRET=YOUR_SECURE_RANDOM_STRING_32_CHARS_MINIMUM

# RBAC
DEFAULT_USER_ROLE=viewer  # For production security

# PXE
PXE_SERVER_IP=YOUR_SERVER_IP
TFTP_PORT=69
DHCP_PORT=67
HTTP_PORT=80

# Storage
IMAGE_STORAGE_PATH=/var/bootah/images

# Optional - Monitoring
LOG_LEVEL=info
```

---

## 🔧 Maintenance

### Database Backups

```bash
# Manual backup
pg_dump -U bootah bootah | gzip > bootah_backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < bootah_backup_20251123.sql.gz | psql -U bootah bootah
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build

# Restart service (Linux)
sudo systemctl restart bootah

# Or with Docker
docker-compose down
docker-compose up -d --build
```

### Monitor Logs

```bash
# Linux systemd
sudo journalctl -u bootah -f

# Docker
docker-compose logs -f bootah

# Kubernetes
kubectl logs -n bootah -l app=bootah -f
```

---

## 🐛 Troubleshooting

### Can't Access Web Interface

```bash
# Check if service is running
sudo systemctl status bootah              # Linux
docker-compose ps                          # Docker
kubectl get pods -n bootah                 # Kubernetes

# Check if port is listening
netstat -tulpn | grep :5000
lsof -i :5000

# Test locally
curl http://localhost:5000
```

### Database Connection Error

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U bootah -d bootah -h localhost

# Check logs
sudo journalctl -u postgresql -f
```

### PXE Boot Issues

```bash
# Check TFTP
netstat -tulpn | grep 6969
sudo journalctl -u bootah | grep TFTP

# Test TFTP
tftp localhost -c get test.txt
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Check database size
du -sh /var/lib/postgresql/

# Clean old images
sudo rm -rf /home/bootah/images/old_*
```

---

## 📞 Support Resources

- **GitHub Issues**: https://github.com/drifftr6x/bootah/issues
- **Documentation**: See PROXMOX_INSTALLATION_GUIDE.md for Proxmox setup
- **Configuration**: See replit.md for detailed architecture

---

**Version**: 2.0  
**Last Updated**: November 2025  
**Supported Versions**: Node.js 18+, PostgreSQL 12+, Docker 20.10+
