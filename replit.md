# Bootah - PXE Boot and OS Imaging Platform

## Overview

Bootah is a modern, lightweight PXE server and OS imaging platform designed for IT administrators, MSPs, and system builders. It offers a web-based interface for managing network device discovery, OS image deployment, and real-time monitoring of deployment progress. The platform is a full-stack TypeScript application with a React frontend and Express.js backend, aiming for efficient OS deployment across multiple machines. Its business vision includes providing a comprehensive, user-friendly solution for streamlined IT operations, reducing manual effort, and enabling rapid scaling of infrastructure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Validation**: Zod
- **Development**: Hot module replacement with Vite

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Management**: Database migrations in `/migrations`
- **Type Safety**: Shared TypeScript types between frontend and backend via `/shared`
- **Storage Interface**: Abstracted for future database provider changes

### Key Domain Models
- **Devices**: Network devices for PXE booting
- **Images**: OS images for deployment
- **Deployments**: Active/completed OS deployment sessions
- **Multicast Sessions**: For simultaneous OS deployment
- **Multicast Participants**: Devices in multicast sessions
- **Activity Logs**: System events and deployment history
- **Server Status**: PXE, TFTP, HTTP, DHCP proxy statuses

### Authentication & Security
- Session-based authentication using `connect-pg-simple`
- CORS handling
- Input validation using Zod schemas
- CSRF protection for authenticated state-changing routes
- Rate limiting for PXE client endpoints
- Dual authentication system: Replit OAuth and Local username/password modes
- Wake-on-LAN (WoL) for remote device power-on
- Secure Boot support (BIOS, UEFI, UEFI Secure Boot)

### Real-time Features
- Polling-based updates for deployment progress
- Real-time device discovery and status monitoring
- Live activity log streaming
- PXE Traffic Detection (DHCP/TFTP monitoring)

### System Design Choices
- **Zero-Touch Deployment**: Infrastructure ready for automated imaging.
- **FOG Project Integration**: Support for FOG as an imaging backend, including API endpoints for deployment management, image/host synchronization, and task monitoring.
- **Device Groups**: Color-coded grouping system for device organization.
- **Deployment Templates**: Reusable deployment configurations to streamline workflows.
- **Data Integrity**: Confirmation dialogs for destructive actions, graceful shutdown, and foreign key cascading deletes.
- **Network Discovery**: Real ARP/ICMP-based network scanning with MAC address detection and hostname resolution.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider (`@neondatabase/serverless`)

### UI Components
- **Radix UI**: Accessible UI primitives
- **Lucide React**: Icon library
- **React Hook Form**: Form handling with Zod resolvers
- **Date-fns**: Date manipulation utilities

### Runtime Dependencies
- **Express Middleware**: JSON parsing, URL encoding, session management
- **CORS**: Cross-origin resource sharing
- **Node.js `fs` module**: File system operations
- **Email Services**: SMTP, SendGrid (for password resets)