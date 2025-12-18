# Bootah - Manual Installation (Copy/Paste Commands)

This guide provides complete copy/paste commands for installing Bootah without using automated scripts.

---

## Step 0: Get Bootah Source Files

**Before installing, you need to get the Bootah source code.** Choose one method:

### Method 1: Download from Replit (Current)

1. Open the Bootah project in Replit
2. Click the three-dot menu (top-left) > "Download as zip"
3. Extract the zip file on your local machine
4. Transfer to your server:

```bash
# From your local machine:
# 1. Create directory on server:
ssh user@server-ip "mkdir -p ~/bootah"
# 2. Transfer files (use /. to include hidden files):
scp -r ~/Downloads/bootah-main/. user@server-ip:~/bootah/
# 3. Connect and navigate:
ssh user@server-ip
cd ~/bootah
```

### Method 2: Git Clone (Once Repository is Public)

```bash
# This will work after the repository is pushed to GitHub:
git clone https://github.com/drifftr6x/bootah.git
cd bootah
```

### Method 3: Download Release Archive (Once Available)

```bash
# This will work after the repository is public:
wget https://github.com/drifftr6x/bootah/archive/refs/heads/main.zip
unzip main.zip && mv bootah-main bootah
cd bootah
```

---

## Quick Navigation

- [Docker Installation](#docker-installation)
- [Linux Bare Metal Installation](#linux-bare-metal-installation)
- [Proxmox LXC Installation](#proxmox-lxc-installation)
- [FOG Integration Setup](#fog-integration-setup)

---

## Docker Installation

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 1.29+
- 4GB RAM, 2 CPU cores, 30GB disk

### Step 1: Install Docker (if not installed)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose unzip
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Create Project Directory

```bash
mkdir -p ~/bootah
cd ~/bootah
```

### Step 3: Create docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    container_name: bootah-app
    restart: unless-stopped
    ports:
      - "${PORT:-5000}:5000"
      - "${TFTP_PORT:-6969}:6969/udp"
      - "${DHCP_PORT:-4067}:4067/udp"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-5000}
      - HOST=0.0.0.0
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - AUTH_MODE=${AUTH_MODE:-local}
      - ALLOW_REGISTRATION=${ALLOW_REGISTRATION:-true}
      - DEFAULT_USER_ROLE=${DEFAULT_USER_ROLE:-admin}
      - PXE_SERVER_IP=${PXE_SERVER_IP}
      - TFTP_PORT=${TFTP_PORT:-6969}
      - DHCP_PORT=${DHCP_PORT:-4067}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - bootah-network

  postgres:
    image: postgres:16-alpine
    container_name: bootah-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=bootah
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=bootah
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bootah -d bootah"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - bootah-network

networks:
  bootah-network:
    driver: bridge

volumes:
  postgres_data:
EOF
```

### Step 4: Create Dockerfile

```bash
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/migrations ./migrations
EXPOSE 5000 6969/udp 4067/udp
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
EOF
```

### Step 5: Create Environment File

```bash
# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
SESSION_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "192.168.1.50")

cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://bootah:${POSTGRES_PASSWORD}@postgres:5432/bootah
SESSION_SECRET=${SESSION_SECRET}
AUTH_MODE=local
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=${SERVER_IP}
TFTP_PORT=6969
DHCP_PORT=4067
EOF

echo "Generated .env file with:"
echo "  Server IP: ${SERVER_IP}"
echo "  Database password: ${POSTGRES_PASSWORD}"
```

### Step 6: Copy Application Files

If you downloaded from Replit (Method 1 in Step 0), your files are already in place.
Otherwise, ensure these folders/files are in your bootah directory:

```
bootah/
├── package.json
├── package-lock.json
├── tsconfig.json
├── docker-compose.yml (created in Step 3)
├── Dockerfile (created in Step 4)
├── .env (created in Step 5)
├── client/           # Frontend React app
├── server/           # Backend Express server
├── shared/           # Shared TypeScript types
└── migrations/       # Database migrations
```

### Step 7: Start Bootah

```bash
docker-compose up -d --build
docker-compose logs -f
```

### Step 8: Access Bootah

Open http://localhost:5000 in your browser. First user to register becomes admin.

---

## Linux Bare Metal Installation

### Prerequisites
- Ubuntu 22.04/24.04 or Debian 12
- Root access
- 4GB RAM, 2 CPU cores, 30GB disk

### Step 1: Update System

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y unzip curl
```

### Step 2: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x
```

### Step 3: Install PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Step 4: Create Database and User

```bash
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
echo "Database password: $DB_PASSWORD"

sudo -u postgres psql << EOF
CREATE USER bootah WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE bootah OWNER bootah;
GRANT ALL PRIVILEGES ON DATABASE bootah TO bootah;
\q
EOF
```

### Step 5: Create Application Directory

```bash
sudo mkdir -p /opt/bootah
sudo chown $USER:$USER /opt/bootah
cd /opt/bootah
```

### Step 6: Copy Application Files

If you downloaded from Replit (see Step 0), copy to /opt/bootah/:

```bash
# From your local machine:
scp -r ~/Downloads/bootah-main/. root@server-ip:/opt/bootah/

# Or if files are already on the server:
cp -r ~/bootah/* /opt/bootah/
```

Verify the structure:
```bash
ls /opt/bootah/
# Should show: client/ server/ shared/ package.json etc.
```

### Step 7: Install Dependencies

```bash
cd /opt/bootah
npm ci
```

### Step 8: Create Environment File

```bash
SESSION_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:${DB_PASSWORD}@localhost:5432/bootah
SESSION_SECRET=${SESSION_SECRET}
AUTH_MODE=local
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=${SERVER_IP}
TFTP_PORT=6969
DHCP_PORT=4067
EOF
```

### Step 9: Build Application

```bash
npm run build
```

### Step 10: Run Database Migrations

```bash
npm run db:push
```

### Step 11: Create Systemd Service

```bash
sudo cat > /etc/systemd/system/bootah.service << EOF
[Unit]
Description=Bootah PXE Boot Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/bootah
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable bootah
sudo systemctl start bootah
```

### Step 12: Configure Firewall

```bash
sudo ufw allow 5000/tcp   # Web UI
sudo ufw allow 6969/udp   # TFTP
sudo ufw allow 4067/udp   # DHCP Proxy
sudo ufw reload
```

### Step 13: Verify Installation

```bash
sudo systemctl status bootah
curl -s http://localhost:5000/api/health | head
```

---

## Proxmox LXC Installation

### Prerequisites
- Proxmox VE 8.x
- Ubuntu 24.04 LXC container created

### Step 1: Enter Container

```bash
# On Proxmox host:
pct enter <CTID>
```

### Step 2: Update System

```bash
apt-get update && apt-get upgrade -y
apt-get install -y unzip curl
```

### Step 3: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
```

### Step 4: Install PostgreSQL

```bash
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

### Step 5: Create Database

```bash
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
echo "Database password: $DB_PASSWORD (save this!)"

sudo -u postgres psql -c "CREATE USER bootah WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "CREATE DATABASE bootah OWNER bootah;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bootah TO bootah;"
```

### Step 6: Create Application Directory

```bash
mkdir -p /opt/bootah
cd /opt/bootah
```

### Step 7: Copy Application Files

If you downloaded from Replit (see Step 0 at top of document), copy to /opt/bootah/:

```bash
# From your local machine:
scp -r ~/Downloads/bootah-main/. root@container-ip:/opt/bootah/

# Verify structure:
ls /opt/bootah/
# Should show: client/ server/ shared/ package.json etc.
```

### Step 8: Install Dependencies and Build

```bash
cd /opt/bootah
npm ci
npm run build
```

### Step 9: Create Environment File

```bash
SESSION_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:${DB_PASSWORD}@localhost:5432/bootah
SESSION_SECRET=${SESSION_SECRET}
AUTH_MODE=local
ALLOW_REGISTRATION=true
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=${SERVER_IP}
TFTP_PORT=6969
DHCP_PORT=4067
EOF
```

### Step 10: Run Migrations

```bash
npm run db:push
```

### Step 11: Create Systemd Service

```bash
cat > /etc/systemd/system/bootah.service << EOF
[Unit]
Description=Bootah PXE Boot Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bootah
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bootah
systemctl start bootah
```

### Step 12: Verify Installation

```bash
systemctl status bootah
curl http://localhost:5000/api/health
```

Access at http://<container-ip>:5000

---

## FOG Integration Setup

After installing Bootah, add FOG Project integration:

### Step 1: Get FOG API Credentials

1. Access FOG Web UI: http://fog-server-ip/fog
2. Go to System Settings > API
3. Create API user with imaging permissions
4. Note the API token

### Step 2: Add FOG Environment Variables

```bash
# Add to your .env file:
cat >> .env << EOF

# FOG Project Integration
FOG_ENABLED=true
FOG_SERVER_URL=http://your-fog-server/fog
FOG_API_TOKEN=your_fog_api_token
FOG_USERNAME=bootah
FOG_PASSWORD=your_fog_password
IMAGING_ENGINE=hybrid
EOF
```

### Step 3: Restart Bootah

```bash
# Docker:
docker-compose restart app

# Linux/Proxmox:
systemctl restart bootah
```

### Step 4: Verify FOG Connection

```bash
curl -s http://localhost:5000/api/fog/status | jq
```

Expected output:
```json
{
  "enabled": true,
  "connected": true,
  "serverUrl": "http://your-fog-server/fog",
  "message": "Connected to FOG"
}
```

---

## Quick Verification Commands

```bash
# Check Bootah is running
curl http://localhost:5000/api/health

# Check server status
curl http://localhost:5000/api/server-status

# View logs (Docker)
docker-compose logs -f app

# View logs (Linux/Proxmox)
journalctl -u bootah -f
```

---

## Support

- Website: https://bootah64x.com
- GitHub: https://github.com/drifftr6x/bootah
- Documentation: See SELF_HOSTING_INSTALLATION.md for full guide
