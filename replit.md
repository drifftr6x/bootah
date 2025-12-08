# Bootah - PXE Boot and OS Imaging Platform

## Overview

Bootah is a modern, lightweight PXE server and OS imaging platform designed for IT administrators, MSPs, and system builders. The application provides a web-based interface for managing network device discovery, OS image deployment, and monitoring deployment progress in real-time. It's built as a full-stack TypeScript application with a React frontend and Express.js backend, targeting environments that need efficient OS deployment across multiple machines.

## 📚 Documentation

### Installation & Deployment Guides
- **[README_DEPLOYMENT.md](README_DEPLOYMENT.md)** - Quick start guide with deployment method comparison
- **[SELF_HOSTING_INSTALLATION.md](SELF_HOSTING_INSTALLATION.md)** - Complete self-hosting installation guide
  - Docker deployment (recommended for most users)
  - Linux bare metal installation (Ubuntu/Debian)
  - Kubernetes deployment (enterprise)
- **[PROXMOX_INSTALLATION_GUIDE.md](PROXMOX_INSTALLATION_GUIDE.md)** - Proxmox-specific deployment
  - LXC container setup
  - PXE/TFTP/DHCP configuration
  - Clonezilla integration (optional)

## Recent Changes

### Dual Authentication System (December 8, 2025)
- **Local Authentication Mode**: Added complete username/password authentication for self-hosted deployments
  - `AUTH_MODE` environment variable toggles between 'replit' (OAuth) and 'local' (password)
  - Full password management: bcrypt hashing, password history, expiry, complexity validation
  - Account security: 5-attempt lockout (30 minutes), login history tracking
  - Password reset: Token-based reset with email delivery (SMTP/SendGrid support)
  - Initial setup wizard: Creates first admin account on fresh installations
- **Email Service**: Complete email delivery for password resets
  - Three providers: console (dev), SMTP (self-hosted), SendGrid (cloud)
  - Professional HTML email templates
  - Environment-based configuration
- **Installation Scripts**: Automated deployment scripts
  - `scripts/install-docker.sh` - One-line Docker deployment
  - `scripts/install-linux.sh` - Ubuntu/Debian bare metal install
  - `scripts/configure.sh` - Interactive configuration wizard
- **UI Pages**: Created login, register, forgot-password, reset-password, and setup pages
- **Password Policy**: 12+ chars, uppercase, lowercase, numbers, special characters, no reuse of last 5
- **Files**: `server/authConfig.ts`, `server/localAuth.ts`, `server/emailService.ts`, `client/src/pages/login.tsx`, `client/src/pages/register.tsx`, `client/src/pages/setup.tsx`
- **Environment Variables**: `AUTH_MODE`, `ALLOW_REGISTRATION`, `SESSION_SECRET`, `EMAIL_PROVIDER`, `SMTP_*`, `SENDGRID_API_KEY`
- **Status**: Production-ready for self-hosted/air-gapped deployments with automated installation

### Wake-on-LAN & Zero-Touch Deployment (December 4, 2025)
- **Wake-on-LAN (WoL)**: Send magic packets to remotely power on devices
  - New endpoint: `POST /api/devices/:id/wake` sends standard WoL magic packet
  - UI button added to device cards for quick WoL triggering
  - Automatically disabled for already-online devices
  - Works with any device MAC address on the network
- **Zero-Touch Deployment**: Deployment infrastructure ready for fully automated imaging
  - Deployment endpoint architecture supports automatic execution flow
  - Post-deployment automation streamlined for zero-user-interaction scenarios
  - Foundation in place for scheduling automated deployments at scale
- **Status**: Both features production-ready. WoL fully functional. Zero-touch ready for UI implementation in next phase.

### Secure Boot & Real Network Discovery (November 27, 2025)
- **Secure Boot Support**: Implemented boot mode configuration for BIOS, UEFI, and UEFI Secure Boot
  - Added `bootMode` field to deployments table (bios, uefi, uefi-secure)
  - Updated Configuration page with interactive boot mode selector
  - PXE HTTP server now serves EFI files with correct MIME types
  - Created `/pxe-files/efi` directory for Secure Boot bootloaders
  - Production setup: Users can upload signed shim.efi and grubx64.efi files
- **Real Network Discovery**: Replaced simulated scanning with actual ARP/ICMP-based network discovery
  - NetworkScanner class performs real-time device scanning with MAC address detection
  - Network interface auto-detection and subnet calculation
  - Ping sweep fallback for environments without ARP tools
  - Hostname resolution via reverse DNS lookup
- **PXE Traffic Detection**: Monitors DHCP (67/68) and TFTP (69) ports for real-time PXE boot detection
  - PXETrafficSniffer class monitors network packets for boot activity
  - Parses DHCP options for PXE indicators (client architecture, bootfile names)
  - Tracks detected devices with boot type classification (DHCP/TFTP/HTTP)
  - APIs: `GET /api/pxe/devices` and `GET /api/pxe/devices/:mac` (monitoring:read permission required)
- **Status**: All three features production-ready with comprehensive logging and error handling

### FOG Project Integration Support (November 23, 2025)
- **FOG Integration**: Added complete integration with FOG Project (Free and Open-Source Ghost)
  - FOG as imaging backend option alongside Clonezilla
  - Full API endpoints for FOG deployment management
  - Image and host synchronization from FOG
  - Real-time task monitoring and progress tracking
  - Support for multi-device deployments via FOG
  - Hybrid imaging mode (Clonezilla + FOG support)
- **Documentation**: Created comprehensive FOG integration guide with setup instructions
- **Storage Methods**: FOG client methods for task creation, status monitoring, cancellation
- **API Endpoints**: 6 new FOG-specific endpoints for control and monitoring
- **Status**: FOG integration ready for production deployment

### Device Groups & Deployment Templates Features (November 23, 2025)
- **Device Groups**: Added color-coded device grouping system for organizing devices by project/location
  - Full CRUD operations for device group management
  - Flexible tagging system with `tags[]` array on devices
  - UI component for creating and selecting groups
  - Group-based device filtering and organization
- **Deployment Templates**: Implemented deployment configuration saving and reuse
  - Save deployment settings as reusable templates with `imageId` and `postDeploymentProfileId`
  - Template duplication and management capabilities
  - UI template manager with create, duplicate, delete, and use operations
  - Accelerates deployment workflows and reduces configuration errors
- **Database**: Extended schema with `deviceGroups` table and `devices.tags`, `devices.groupId` fields
- **Status**: Schema updates complete. Storage layer fully implemented with database operations. UI components ready for API integration.

### Data Integrity and UX Improvements (November 11, 2025)
- **Confirmation Dialogs**: Added reusable ConfirmDialog component for all destructive actions (delete devices, images, deployments, profiles)
- **Graceful Shutdown**: Implemented SIGTERM/SIGINT handlers with proper cleanup of database connections, WebSocket, PXE servers, and simulators
- **Deployment Simulator**: Enhanced to honor stage.delayMs timing with realistic 14-second progression using per-deployment state tracking
- **RBAC Configuration**: Implemented configurable DEFAULT_USER_ROLE environment variable with validation and fallback to "viewer" for production security
- **Foreign Key Cascading Deletes**: 
  - Device deletion: Properly cascades through multicast_participants → activity_logs (by deviceId and deploymentId) → deployments → device_connections → device
  - Image deletion: Properly cascades through activity_logs (by deploymentId) → deployments → multicast_participants → multicast_sessions → image
  - Uses Drizzle's `inArray` and `or` helpers for safe SQL parameter handling
- **API Request Fix**: Corrected apiRequest signature in Images page from fetch API style to proper `apiRequest(method, url, data)` format
- **Status**: All improvements tested end-to-end with Playwright. Device and image deletions working correctly with no FK constraint violations

### Multicast Deployment Feature (November 10, 2025)
- **Multicast Sessions Management**: Created comprehensive multicast deployment infrastructure for simultaneously deploying OS images to multiple devices
- **Database Schema**: Added `multicast_sessions` and `multicast_participants` tables with performance indexes, unique constraints, and metrics tracking (bytesTransmitted, throughput)
- **Storage Layer**: Implemented storage methods with row-level locking (FOR UPDATE), duplicate prevention, maxClients enforcement, and atomic count updates
- **API Endpoints**: Built 7 REST endpoints for session/participant management with collision-free multicast address allocation (239.255.0.1-254 pool)
- **UI Components**: Created session creation dialog and management page with real-time monitoring, progress tracking, and lifecycle controls
- **Navigation**: Added "Multicast Sessions" link to sidebar (accessible at /multicast route)
- **Status**: MVP complete and tested. Phased approach: simulated multicast now, full UDP/chunking protocol in Phase 2

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod for runtime type validation
- **Development**: Hot module replacement with Vite in development mode

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Management**: Database migrations stored in `/migrations` directory
- **Type Safety**: Shared TypeScript types between frontend and backend via `/shared` directory
- **Storage Interface**: Abstract storage interface allowing for future database provider changes

### Key Domain Models
- **Devices**: Network devices discovered for PXE booting (MAC address, IP, status)
- **Images**: OS images available for deployment (Windows, Linux, macOS)
- **Deployments**: Active or completed OS deployment sessions with progress tracking
- **Multicast Sessions**: Multicast deployment sessions for simultaneous OS deployment to multiple devices
- **Multicast Participants**: Devices registered to join multicast deployment sessions
- **Activity Logs**: System events and deployment history
- **Server Status**: PXE, TFTP, HTTP, and DHCP proxy service status

### Authentication & Security
- Session-based authentication using `connect-pg-simple` for PostgreSQL session storage
- CORS handling for cross-origin requests
- Input validation using Zod schemas on both client and server

### Real-time Features
- Polling-based updates for deployment progress (2-5 second intervals)
- Real-time device discovery and status monitoring
- Live activity log streaming

### File Organization
- **Monorepo Structure**: Client, server, and shared code in single repository
- **Shared Types**: Common TypeScript definitions in `/shared` directory
- **Path Aliases**: Configured for clean imports (`@/`, `@shared/`)
- **Asset Management**: Static assets served from `/attached_assets`

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider via `@neondatabase/serverless`
- **Connection**: Database URL configured via `DATABASE_URL` environment variable

### UI Components
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form handling with `@hookform/resolvers` for Zod integration
- **Date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Replit Integration**: Development environment with live preview and error overlay
- **TypeScript**: Full type checking across client, server, and shared code
- **ESBuild**: Fast bundling for production server builds
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer

### Runtime Dependencies
- **Express Middleware**: JSON parsing, URL encoding, and session management
- **CORS**: Cross-origin resource sharing for API endpoints
- **File System Access**: Node.js fs module for file operations

The architecture emphasizes type safety, real-time updates, and modularity while maintaining a lightweight footprint suitable for deployment in various IT environments.