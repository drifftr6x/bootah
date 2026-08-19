# Bootah - PXE Boot and OS Imaging Platform 🚀

**Boot smarter. Deploy faster.**

Bootah is a modern, lightweight PXE server and OS imaging platform designed for IT administrators, MSPs, and system builders. Deploy OS images to multiple devices simultaneously with an intuitive web interface, real-time monitoring, and comprehensive device management.

## ✨ Key Features

### Core Imaging
- 🌐 **Network PXE Boot** - Direct network OS deployment
- 🔄 **Multi-Engine Support** - Clonezilla + FOG Project integration
- 📊 **Multicast Deployments** - Deploy to multiple devices simultaneously
- 📱 **Real-time Monitoring** - Live progress tracking with WebSocket updates
- 🎯 **Device Discovery** - Auto-discover and manage network devices

### Organization & Management
- 👥 **Device Groups** - Color-coded organization by project/location
- 🏷️ **Flexible Tagging** - Categorize devices with custom tags
- 📋 **Templates** - Save and reuse deployment configurations
- 🔒 **Role-Based Access Control** - Admin, operator, viewer roles
- 📝 **Audit Trail** - Complete activity logging

### Advanced Features
- ⚙️ **Post-Deployment Tasks** - Custom scripts after OS deployment
- 🔐 **Domain Join** - Automatic Active Directory integration
- 🔑 **Product Keys** - Manage Windows license keys
- 📦 **Snapin Packages** - Deploy software post-imaging
- 🕐 **Scheduled Deployments** - Recurring or delayed deployments
- 🌍 **Multi-Site Support** - Enterprise deployments across locations

### Deployment Options
- 🐳 **Docker** - Quickest setup (5 minutes)
- 🐧 **Linux Bare Metal** - Production servers
- 📦 **Proxmox LXC** - Container-based deployment
- ☸️ **Kubernetes** - Cloud/enterprise scale

## 🚀 Quick Start

> **Phase 1 safety notice:** this repository is currently a containment build, not a production-ready imaging platform. Host-local imaging, unauthenticated machine callbacks, WebSockets, multicast execution, FOG execution, webhook delivery, and object proxying are intentionally disabled. Do not connect it to production PXE networks or storage until later security and protocol phases are complete.

> **Database migration notice:** Compose runs the committed Drizzle migration history through a one-shot `db-init` service before Bootah starts. Copy `.env.example` to `.env`, replace every secret placeholder with a unique value, and keep generated migrations under review.

### Docker (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-docker.sh | bash
# Access at http://localhost:5000
```

### Linux (Ubuntu/Debian)
```bash
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-linux.sh | sudo bash
# Access at http://your-server-ip:5000
```

### Proxmox LXC
```bash
# Inside your Proxmox LXC container:
curl -sSL https://raw.githubusercontent.com/drifftr6x/bootah/main/scripts/install-proxmox.sh | bash
# Access at http://container-ip:5000
```

### Manual Setup
See [STANDALONE_INSTALL.md](STANDALONE_INSTALL.md) for complete step-by-step instructions.

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[STANDALONE_INSTALL.md](STANDALONE_INSTALL.md)** | Manual step-by-step installation for all platforms |
| **[INSTALLATION_SCRIPTS_GUIDE.md](INSTALLATION_SCRIPTS_GUIDE.md)** | Guide for automated installation scripts |
| **[FOG_INTEGRATION.md](FOG_INTEGRATION.md)** | FOG Project integration setup and configuration |
| **[PRODUCTION_MIGRATION_OPTION_B.md](PRODUCTION_MIGRATION_OPTION_B.md)** | Manual SQL migration for production databases |
| **[README_DEPLOYMENT.md](README_DEPLOYMENT.md)** | Quick reference deployment guide |
| **[PROXMOX_INSTALLATION_GUIDE.md](PROXMOX_INSTALLATION_GUIDE.md)** | Proxmox LXC specific installation |
| **[SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md)** | Advanced self-hosting and configuration |

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket for live updates
- **UI Components**: Radix UI + shadcn components

### System Components
- **PXE Server** - Network boot service (TFTP, DHCP proxy)
- **Web API** - RESTful endpoints with RBAC
- **WebSocket Server** - Real-time deployment monitoring
- **Database Layer** - PostgreSQL with type-safe ORM
- **Imaging Engine** - Clonezilla or FOG integration
- **Scheduler** - Recurring/delayed deployments

## 🎯 Use Cases

### IT Administrators
- Deploy Windows/Linux to 10+ devices in minutes
- Organize devices by location/project with device groups
- Save deployment templates for recurring tasks
- Monitor all deployments in real-time

### MSPs (Managed Service Providers)
- Manage multiple client sites from single interface
- Template-based deployments for consistent configurations
- Multicast deployments for bandwidth efficiency
- Scheduled deployments during off-hours

### System Builders
- Mass deployment for new hardware rollouts
- Post-deployment customization with scripts
- Hardware inventory tracking
- Audit trail for compliance

## 📋 System Requirements

### Minimum (Single Server)
- CPU: 2+ cores
- RAM: 4GB+
- Storage: 30GB+ (OS images stored separately)
- Network: 1Gbps recommended for imaging

### Network
- DHCP server with PXE boot option (66) support
- Network broadcast capability for multicast
- Firewall rules for ports: 5000 (HTTP), 6969 (TFTP), 4067 (DHCP)

## 🔐 Security Features

- ✅ Session-based authentication with PostgreSQL store
- ✅ Role-based access control (RBAC)
- ✅ CORS handling for cross-origin requests
- ✅ Input validation with Zod schemas
- ✅ Encrypted credential storage
- ✅ Audit logging of all operations
- ✅ Graceful shutdown with proper cleanup

## 📊 Supported Operating Systems

### Windows
- Windows Server 2016+
- Windows 10/11 Enterprise
- Windows Server 2022

### Linux
- Ubuntu 22.04 LTS
- Ubuntu 20.04 LTS
- Debian 12
- CentOS/RHEL 8+

### macOS
- macOS 12+
- macOS 13+

## 🔄 Integration Options

### FOG Project
Deploy using FOG's robust imaging engine while keeping Bootah's user interface:
- Sync FOG images and hosts
- Create deployments in Bootah, execute in FOG
- Real-time task monitoring
- Multi-device support

See [FOG_INTEGRATION.md](FOG_INTEGRATION.md) for setup.

### Clonezilla
Direct imaging via Clonezilla:
- Network boot and imaging
- Direct deployment from Bootah
- Real-time progress tracking
- Multicast support

## 🚀 API Endpoints

### Core Resources
- `GET/POST /api/devices` - Device management
- `GET/POST /api/images` - OS image management
- `GET/POST /api/deployments` - Deployment operations
- `GET/POST /api/device-groups` - Device grouping
- `GET/POST /api/templates` - Deployment templates

### Advanced Features
- `POST /api/multicast/sessions` - Multicast deployments
- `POST /api/post-deployment/profiles` - Custom post-deployment tasks
- `POST /api/deployments/fog` - FOG integrations
- `GET /api/activity-logs` - Audit trail

Full API documentation is available at `/api/docs` when running.

## 🛠️ Development

### Setup
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Database Migrations
```bash
npm run db:push      # Apply migrations
```

### Environment Variables
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/bootah
SESSION_SECRET=generate-at-least-32-random-characters
ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
BOOTSTRAP_TOKEN=generate-a-one-time-bootstrap-credential
ALLOW_REGISTRATION=false
```

## 📖 Workflows

### Typical Deployment Flow
1. **Discover Devices** - PXE boot network devices
2. **Organize** - Create device groups
3. **Prepare** - Upload OS images
4. **Configure** - Save deployment template
5. **Deploy** - Select devices and deploy
6. **Monitor** - Watch progress in real-time
7. **Verify** - Check activity logs

### Multicast Deployment
1. Create multicast session with target image
2. Add devices to participate
3. Start session
4. All devices receive image simultaneously
5. Monitor progress for all participants

## ⚙️ Configuration

### Basic Settings
- Application port (default: 5000)
- Database connection URL
- PXE server IP address
- Role defaults for new users

### Advanced Settings
- Session timeout
- TFTP/DHCP port configuration
- Multicast address pool
- FOG integration credentials
- Email notifications (optional)

See [SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md) for advanced configuration.

## 🆘 Troubleshooting

### Common Issues

**Devices not discovering**
- Verify DHCP Option 66 points to Bootah IP
- Check PXE server is running: `netstat -tulpn | grep 6969`
- Enable network broadcast

**Deployment fails**
- Check device MAC address format
- Verify image file integrity
- Review activity logs for details
- Check disk space on Bootah server

**Database connection error**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

**High bandwidth usage**
- Use multicast sessions instead of unicast
- Compress OS images with gzip
- Deploy during off-peak hours

See [STANDALONE_INSTALL.md - Troubleshooting](STANDALONE_INSTALL.md#troubleshooting) for more solutions.

## 📈 Performance Tips

- Use SSD for OS image storage
- Deploy during off-hours when possible
- Enable multicast for 10+ device deployments
- Monitor system resources regularly
- Use device groups to organize large fleets

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Additional OS support (macOS, ChromeOS)
- Cloud storage integration
- Advanced hardware detection
- Performance optimizations
- Documentation improvements

## 🙏 Acknowledgments

Bootah stands on the shoulders of giants. We gratefully acknowledge these foundational open-source projects that inspired and enabled our work:

### [FOG Project](https://fogproject.org)
FOG (Free Open-source Ghost) is a free, open-source network computer cloning and management solution. FOG has been the gold standard for enterprise imaging for over a decade, providing comprehensive features for OS deployment, inventory management, and network boot services. Bootah integrates directly with FOG as a backend imaging engine, leveraging its proven reliability for production deployments.

### [Clonezilla](https://clonezilla.org)
Clonezilla is a partition and disk imaging/cloning program similar to True Image or Norton Ghost. Created by the NCHC Free Software Labs in Taiwan, Clonezilla has been a cornerstone of the open-source imaging community since 2004. Its efficient block-level imaging and multicast capabilities have influenced imaging tools worldwide. Bootah supports Clonezilla as an imaging backend for its excellent compression and cross-platform compatibility.

---

These projects have collectively served millions of IT administrators, educators, and system builders. We encourage users to support these projects and contribute to their continued development.

## 📜 License

[Add your license here]

## 🔗 Resources

- **Official Website**: https://bootah64x.com 
- **GitHub Repository**: https://github.com/drifftr6x/bootah
- **Issue Tracker**: https://github.com/drifftr6x/bootah/issues
- **FOG Project**: https://fogproject.org
- **Clonezilla**: https://clonezilla.org

## 👥 Support

- 📧 **Email**: support@bootah64x.com
- 💬 **GitHub Discussions**: Coming soon
- 🐛 **Report Bugs**: GitHub Issues

---

**Version**: 1.0.0  
**Last Updated**: November 23, 2025  
**Maintainer**: drifftr6x

**Boot smarter. Deploy faster.** 🚀
