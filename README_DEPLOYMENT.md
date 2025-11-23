# Bootah - Deployment Guide

Welcome to Bootah! This guide helps you get started with deploying the PXE boot and OS imaging platform.

## 🚀 Choose Your Deployment Method

### 1. **Docker** (Recommended - 5 minutes) ⭐
Best for: Most users, development, small to medium deployments

```bash
git clone https://github.com/yourusername/bootah.git && cd bootah
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://bootah:bootah@postgres:5432/bootah
SESSION_SECRET=$(openssl rand -base64 32)
EOF
docker-compose up -d
```

**Access**: http://localhost:5000

**See also**: [SELF_HOSTING_INSTALLATION.md - Docker Section](#docker-deployment)

---

### 2. **Linux Bare Metal** (Ubuntu/Debian)
Best for: Production environments, high performance, custom control

**Requirements**:
- Ubuntu 22.04 LTS or Debian 12
- 2GB+ RAM, 2+ CPU cores
- Root or sudo access

**Time**: ~20 minutes

**See also**: [SELF_HOSTING_INSTALLATION.md - Linux Section](#linux-bare-metal-installation)

---

### 3. **Proxmox LXC Container**
Best for: Proxmox environments, laboratory setups, resource efficiency

**Requirements**:
- Proxmox VE 8.x
- Ubuntu 24.04 LTS template
- Network bridge configured

**Time**: ~30 minutes

**See also**: [PROXMOX_INSTALLATION_GUIDE.md](PROXMOX_INSTALLATION_GUIDE.md)

---

### 4. **Kubernetes** (Advanced)
Best for: Enterprise deployments, high availability, cloud platforms

**Requirements**:
- Kubernetes 1.20+
- kubectl configured
- Helm 3.0+
- Storage provisioner

**Time**: ~45 minutes

**See also**: [SELF_HOSTING_INSTALLATION.md - Kubernetes Section](#kubernetes-deployment-advanced)

---

## 📋 Quick Comparison

| Method | Setup Time | Performance | Maintenance | Scale | Cost |
|--------|-----------|-------------|-------------|-------|------|
| **Docker** | 5 min | Good | Low | Single host | Free |
| **Linux** | 20 min | Excellent | Medium | Single host | Free |
| **Proxmox** | 30 min | Excellent | Medium | Multiple VMs | Hardware |
| **Kubernetes** | 45 min | Excellent | High | Multiple nodes | Free (hosting varies) |

---

## ✨ Key Features

✅ **Web-based UI** - Intuitive management dashboard  
✅ **PXE Boot Server** - Network boot management  
✅ **TFTP/DHCP** - Built-in network services  
✅ **OS Imaging** - Deploy multiple OS images  
✅ **Device Discovery** - Auto-detect network devices  
✅ **Real-time Monitoring** - Live deployment progress  
✅ **Multicast Support** - Deploy to multiple devices simultaneously  
✅ **WebSocket Updates** - Real-time status updates  

---

## 🔧 System Requirements

### Minimum
- 2 CPU cores
- 2GB RAM
- 20GB storage

### Recommended
- 4 CPU cores
- 4GB RAM
- 50GB+ storage (for OS images)

### Production
- 8+ CPU cores
- 8GB+ RAM
- 100GB+ storage with SSD
- Redundant network connections

---

## 📖 Full Documentation

| Guide | Purpose |
|-------|---------|
| [SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md) | Complete installation for Docker, Linux, Kubernetes |
| [PROXMOX_INSTALLATION_GUIDE.md](PROXMOX_INSTALLATION_GUIDE.md) | Proxmox-specific setup and configuration |
| [replit.md](replit.md) | Architecture and system design details |

---

## 🎯 Next Steps

### After Deployment

1. **Access the Web UI** at http://localhost:5000 (or your server IP)
2. **Create first user** (becomes admin automatically)
3. **Upload OS images** for deployment
4. **Configure network** settings and DHCP/TFTP
5. **Test with a device** on the network
6. **Setup backups** for production environments

---

## ⚡ Common Tasks

### Upload an OS Image
1. Navigate to **Images** section
2. Click **Add New Image**
3. Select file or enter URL
4. Set OS type and version
5. Click **Upload**

### Deploy an Image
1. Go to **Devices** 
2. Select target device(s)
3. Click **Start Deployment**
4. Choose image and target
5. Confirm and start

### Monitor Progress
1. Dashboard shows real-time stats
2. Deployments page tracks all operations
3. Activity logs record all events
4. Network topology visualizes connections

---

## 🔐 Security Notes

- Change default passwords immediately
- Use strong SESSION_SECRET (32+ characters)
- Enable HTTPS in production
- Configure firewall rules
- Keep system updated
- Setup regular backups
- Monitor access logs

---

## 🆘 Troubleshooting

### Application Won't Start
1. Check logs: `docker-compose logs bootah`
2. Verify database: `docker-compose ps`
3. Check ports: `netstat -tulpn | grep 5000`

### Can't Access Web Interface
1. Verify service running: `sudo systemctl status bootah`
2. Check firewall: `sudo ufw status`
3. Test locally: `curl http://localhost:5000`

### PXE Boot Not Working
1. Check TFTP: `netstat -tulpn | grep 69`
2. Verify DHCP: `sudo systemctl status dnsmasq`
3. Check network config: See PROXMOX_INSTALLATION_GUIDE.md

---

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: See included markdown files
- **Network Config**: See PROXMOX_INSTALLATION_GUIDE.md for PXE setup

---

## 📝 Environment Variables Reference

```env
# Server Configuration
NODE_ENV=production                      # production or development
PORT=5000                                # Application port
HOST=0.0.0.0                             # Listen on all interfaces

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Security
SESSION_SECRET=random_string_32_chars    # Session encryption key
DEFAULT_USER_ROLE=admin                  # Default new user role

# PXE Services
PXE_SERVER_IP=192.168.1.50              # Server IP for PXE boot
TFTP_PORT=6969                           # TFTP service port
DHCP_PORT=4067                           # DHCP proxy port

# Storage
IMAGE_STORAGE_PATH=/app/images           # OS image storage location
```

---

**Ready to deploy?** 

→ **Start with [Docker](#quick-docker-deployment)** if you're new to this  
→ **See [SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md)** for detailed guides  
→ **See [PROXMOX_INSTALLATION_GUIDE.md](PROXMOX_INSTALLATION_GUIDE.md)** for Proxmox setup

---

**Version**: 2.0  
**Last Updated**: November 2025  
**License**: MIT
