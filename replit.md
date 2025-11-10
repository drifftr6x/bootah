# Bootah - PXE Boot and OS Imaging Platform

## Overview

Bootah is a modern, lightweight PXE server and OS imaging platform designed for IT administrators, MSPs, and system builders. The application provides a web-based interface for managing network device discovery, OS image deployment, and monitoring deployment progress in real-time. It's built as a full-stack TypeScript application with a React frontend and Express.js backend, targeting environments that need efficient OS deployment across multiple machines.

## Recent Changes

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