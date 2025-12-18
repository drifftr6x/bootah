# Bootah Installation Scripts Guide

This guide explains how to use the automated installation scripts for deploying Bootah to different environments.

## 📦 Available Scripts

### Installation Scripts (Choose ONE)

| Script | Environment | Best For | Time |
|--------|-------------|----------|------|
| `install-docker.sh` | Docker | Most users, easy setup | 5 min |
| `install-linux.sh` | Linux (Ubuntu/Debian) | Production, bare metal | 15 min |
| `install-proxmox.sh` | Proxmox LXC | Proxmox environments | 20 min |

### Post-Installation Scripts (Optional)

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `configure.sh` | Change settings after install | Modify IP, ports, email, auth |
| `configure-pxe-server.sh` | Configure PXE/TFTP/DHCP | Set up network boot services |
| `create-boot-environment.sh` | Create PXE boot files | Download bootloaders (syslinux, grub) |
| `setup-clonezilla.sh` | Install Clonezilla | Add disk imaging with Clonezilla |

---

## 🎯 Installation Scenarios

### Scenario 1: Basic Web UI Only
Just want the Bootah dashboard without PXE boot services:

```bash
# Choose your platform:
./scripts/install-docker.sh    # OR
./scripts/install-linux.sh     # OR  
./scripts/install-proxmox.sh
```
**Result:** Web UI running, device management, no network boot

---

### Scenario 2: Full PXE Boot Server
Complete PXE boot infrastructure for network imaging:

```bash
# Step 1: Install Bootah
./scripts/install-linux.sh     # or install-proxmox.sh

# Step 2: Configure PXE networking
./scripts/configure-pxe-server.sh

# Step 3: Download boot files
./scripts/create-boot-environment.sh
```
**Result:** Full PXE boot server ready for network imaging

---

### Scenario 3: PXE + Clonezilla Imaging
Complete solution with Clonezilla disk imaging:

```bash
# Step 1: Install Bootah
./scripts/install-linux.sh     # or install-proxmox.sh

# Step 2: Configure PXE networking  
./scripts/configure-pxe-server.sh

# Step 3: Download boot files
./scripts/create-boot-environment.sh

# Step 4: Add Clonezilla integration
./scripts/setup-clonezilla.sh
```
**Result:** Complete PXE boot + Clonezilla disk cloning

---

### Scenario 4: Docker Development/Testing
Quick setup for testing or development:

```bash
./scripts/install-docker.sh
```
**Result:** Containerized Bootah for testing (PXE requires additional network config)

---

### Scenario 5: Reconfigure Existing Installation
Change settings on an already-installed system:

```bash
cd /opt/bootah   # or your install directory
./scripts/configure.sh
```
**Result:** Interactive menu to change IP, ports, email, authentication

---

## Quick Start

### Option 1: Docker (Easiest) ⭐

```bash
# Download the script
curl -O https://raw.githubusercontent.com/drifftr6x/bootah/main/install-docker.sh
chmod +x install-docker.sh

# Run the installation
./install-docker.sh
```

**What it does:**
- ✅ Checks Docker and Docker Compose installation
- ✅ Clones the Bootah repository (or uses existing)
- ✅ Creates environment configuration
- ✅ Builds Docker image
- ✅ Starts all services
- ✅ Provides access URLs

**Requirements:**
- Docker Engine 20.10+
- Docker Compose 1.29+
- 4GB RAM, 2 CPU cores

---

### Option 2: Linux Bare Metal

```bash
# Download the script
curl -O https://raw.githubusercontent.com/drifftr6x/bootah/main/install-linux.sh
chmod +x install-linux.sh

# Run with sudo
sudo ./install-linux.sh
```

**What it does:**
- ✅ Updates system packages
- ✅ Installs Node.js, PostgreSQL, and dependencies
- ✅ Sets up PostgreSQL database
- ✅ Clones Bootah repository
- ✅ Creates environment configuration
- ✅ Builds the application
- ✅ Creates systemd service for auto-start
- ✅ Starts the service

**Requirements:**
- Ubuntu 22.04 LTS or Debian 12
- Root or sudo access
- 4GB+ RAM, 2+ CPU cores
- 30GB+ free disk space

**Supported Distributions:**
- Ubuntu 22.04 LTS ✓
- Ubuntu 20.04 LTS ✓
- Debian 12 ✓
- Other distributions (with manual adjustments)

---

### Option 3: Proxmox LXC Container

```bash
# On Proxmox host, create LXC container first:
# - Template: Ubuntu 22.04
# - CPU: 2+ cores
# - RAM: 4GB+
# - Storage: 30GB+

# Inside the container:
curl -O https://raw.githubusercontent.com/drifftr6x/bootah/main/install-proxmox.sh
chmod +x install-proxmox.sh
sudo ./install-proxmox.sh
```

**What it does:**
- ✅ Detects Proxmox LXC environment
- ✅ Installs dependencies
- ✅ Sets up PostgreSQL
- ✅ Creates bootah user
- ✅ Clones Bootah repository
- ✅ Configures environment
- ✅ Creates systemd service
- ✅ Enables SSH access

**Requirements:**
- Proxmox VE 7.x or 8.x
- LXC container with Ubuntu 22.04
- 4GB+ RAM, 2+ CPU cores

**After Installation:**
1. Note the container IP address
2. Access via: `http://<container-ip>:5000`
3. Configure DHCP Option 66 to point to container IP

---

### Option 4: Kubernetes

```bash
# Prerequisites: kubectl configured and connected to cluster
kubectl version --short  # Verify kubectl connection

# Download the script
curl -O https://raw.githubusercontent.com/drifftr6x/bootah/main/install-kubernetes.sh
chmod +x install-kubernetes.sh

# Run the installation
./install-kubernetes.sh
```

**What it does:**
- ✅ Checks kubectl and cluster connection
- ✅ Creates bootah namespace
- ✅ Creates database secrets
- ✅ Creates application configuration
- ✅ Deploys PostgreSQL StatefulSet
- ✅ Deploys Bootah application
- ✅ Creates LoadBalancer service

**Requirements:**
- Kubernetes 1.20+
- kubectl configured
- Helm (optional, but recommended)
- Cluster with 4GB+ RAM available

**After Installation:**

Access via port-forwarding:
```bash
kubectl port-forward -n bootah svc/bootah-service 5000:80 &
# Then: http://localhost:5000
```

Or get external IP:
```bash
kubectl get svc -n bootah
# Use EXTERNAL-IP (if LoadBalancer type available)
```

---

## Script Prompts During Installation

### Docker Script Prompts:
```
1. Server IP Address: 192.168.1.50
```

### Linux Script Prompts:
```
1. Server IP Address: 192.168.1.50
```

### Proxmox Script Prompts:
```
1. Container IP Address: 192.168.1.100
```

### Kubernetes Script Prompts:
```
1. Cluster IP/hostname for PXE: bootah.default
```

---

## Manual Configuration (If Script Prompts Fail)

Each script creates an `.env` file with these variables:

```bash
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:password@host:5432/bootah
SESSION_SECRET=<random-32-char-string>
DEFAULT_USER_ROLE=admin
PXE_SERVER_IP=192.168.1.50
TFTP_PORT=6969
DHCP_PORT=4067
```

**To manually edit:**

**Docker:**
```bash
# Edit .env file in project directory
nano .env

# Restart services
docker-compose restart
```

**Linux:**
```bash
# Edit environment file
sudo nano /opt/bootah/.env

# Restart service
sudo systemctl restart bootah
```

**Proxmox:**
```bash
# Edit environment file
sudo nano /home/bootah/bootah/.env

# Restart service
sudo systemctl restart bootah
```

**Kubernetes:**
```bash
# Edit ConfigMap
kubectl edit configmap bootah-config -n bootah

# Restart pods
kubectl rollout restart deployment bootah -n bootah
```

---

## Verification After Installation

### Docker:
```bash
# Check containers
docker-compose ps

# View logs
docker-compose logs bootah

# Access
curl http://localhost:5000
```

### Linux:
```bash
# Check service
sudo systemctl status bootah

# View logs
sudo journalctl -u bootah -f

# Access
curl http://localhost:5000
```

### Proxmox:
```bash
# Check service
sudo systemctl status bootah

# View logs
sudo journalctl -u bootah -f

# Access from another machine
curl http://<container-ip>:5000
```

### Kubernetes:
```bash
# Check pods
kubectl get pods -n bootah

# View logs
kubectl logs -n bootah -l app=bootah -f

# Port forward
kubectl port-forward -n bootah svc/bootah-service 5000:80

# Access
curl http://localhost:5000
```

---

## Troubleshooting Installation

### Script Fails to Run

**Docker:**
```bash
# Ensure Docker is running
docker ps

# Check Docker Compose installation
docker-compose --version
```

**Linux:**
```bash
# Must run with sudo
sudo ./install-linux.sh

# Or run as root
sudo su
./install-linux.sh
```

**Proxmox:**
```bash
# Must be inside LXC container
# Check with: grep lxc /proc/self/cgroup

# SSH into container first
ssh bootah@<container-ip>
```

**Kubernetes:**
```bash
# Check kubectl connection
kubectl cluster-info

# Check namespace
kubectl get namespace bootah
```

---

### Installation Hangs

**All Platforms:**
- Wait 30-60 seconds (first start can be slow)
- Check logs for errors (see Verification section)
- Verify network connectivity

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Port already in use | Change PORT in .env file |
| Database connection error | Check PostgreSQL is running |
| Permission denied | Use sudo or root access |
| Docker image build fails | Check disk space: `df -h` |

---

### Database Not Initializing

If you see "column X does not exist" errors:

```bash
# For Docker:
docker-compose exec bootah npm run db:push

# For Linux:
cd /opt/bootah && npm run db:push

# For Proxmox:
cd /home/bootah/bootah && npm run db:push

# For Kubernetes:
kubectl exec -n bootah deployment/bootah -- npm run db:push
```

---

## Uninstalling Bootah

### Docker:
```bash
docker-compose down -v
rm -rf bootah/
```

### Linux:
```bash
sudo systemctl stop bootah
sudo systemctl disable bootah
sudo rm /etc/systemd/system/bootah.service
sudo rm -rf /opt/bootah
```

### Proxmox:
```bash
sudo systemctl stop bootah
sudo systemctl disable bootah
sudo userdel -r bootah
```

### Kubernetes:
```bash
kubectl delete namespace bootah
```

---

## Post-Installation Setup

After successful installation:

1. **Access Web UI:** Open `http://localhost:5000` or `http://<server-ip>:5000`

2. **Login:** Use default admin credentials (create on first access)

3. **Upload OS Images:** Go to Images page and upload Windows/Linux ISOs

4. **Create Device Groups:** Organize devices by project/location

5. **Setup Device Discovery:** Configure PXE boot on your network devices

6. **Create Deployment Templates:** Save common deployment configurations

7. **Start Deploying:** Deploy OS to devices in one click

---

## Support & Troubleshooting

For detailed information:
- See `STANDALONE_INSTALL.md` for complete manual setup
- See `SELF_HOSTING_INSTALLATION.md` for advanced configuration
- See `PROXMOX_INSTALLATION_GUIDE.md` for Proxmox specifics
- Check logs in `/var/log/bootah/` (Linux) or `docker-compose logs` (Docker)

---

## Script Customization

To customize a script:

1. Download the script
2. Edit with your preferred editor
3. Modify variables as needed
4. Run the edited version

**Example: Change default database password in Linux script:**
```bash
# Before:
PGPASSWORD=bootah_password

# After:
PGPASSWORD=your_secure_password_here
```

---

**Ready to install?** Choose your installation type and run the corresponding script!
