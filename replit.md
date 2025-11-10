# TravNL - Open-Source Dutch Transit Planner

## Overview

TravNL (Project Groenekoek) is a modern, open-source travel planner web application for Dutch transit, specifically focused on NS (Nederlandse Spoorwegen) rail services. Unlike standard travel apps that focus solely on getting from point A to B, TravNL aims to provide deeper insights into the journey itself, including train details, station amenities, real-time disruptions, and comprehensive trip information.

The application serves transit enthusiasts and travelers who want more detail and control than standard apps like NS Reisplanner or 9292 provide, featuring an expandable journey interface, detailed train information, and a modern aesthetic with theme support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, using Vite as the build tool

**Routing**: Wouter for lightweight client-side routing with four main pages:
- Journey Planner (default route `/`)
- Departure Board (`/vertrektijden`)
- Train Lookup (`/treininfo`)
- More/Settings (`/meer`)

**UI Component System**: Radix UI primitives with shadcn/ui components, following the "New York" style variant. Components are designed with:
- Rounded corners (12px for large elements, 8px medium, 4px small)
- Blur effects for overlays and navigation bars
- Blue primary accents with color-coded train types (yellow for Intercity, blue for Sprinter, green for non-NS trains)
- Responsive mobile-first design with bottom navigation on mobile, top navigation on desktop

**State Management**: 
- TanStack Query (React Query) for server state and API caching
- React Context for theme management (light/dark mode with localStorage persistence)
- Local component state for UI interactions

**Styling**: 
- Tailwind CSS with custom theme configuration
- CSS variables for theme tokens supporting light and dark modes
- Custom utility classes for elevation effects (`hover-elevate`, `active-elevate-2`)

**Design Principles**:
- Information clarity first with scannable transit data
- Progressive disclosure using expandable cards
- Touch-friendly interface with large tap targets
- Typography: Inter/SF Pro Display with clear hierarchy

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript

**API Pattern**: REST endpoints serving as a proxy/aggregator for NS APIs:
- `/api/departures` - Station departure times
- `/api/trips` - Journey planning between stations
- `/api/journey` - Detailed train/journey information
- `/api/stations` - Station list/search

**Request Handling**:
- JSON body parsing with raw body preservation for webhooks
- Request logging middleware with duration tracking
- Error handling with structured error responses

**Development Setup**:
- Vite integration for HMR in development
- Static file serving for production builds
- Custom logger with timestamp formatting

### Data Storage

**Current Implementation**: In-memory storage (`MemStorage` class) for user data

**Schema**: Drizzle ORM with PostgreSQL schema definitions for future database integration:
- User table with UUID primary keys
- Username/password fields for authentication (prepared but not fully implemented)

**Database Configuration**: 
- Drizzle Kit configured for PostgreSQL migrations
- Neon serverless PostgreSQL adapter included
- Schema located in `shared/schema.ts` for type sharing between client and server

**Note**: The application currently uses memory storage but is architected to support PostgreSQL. Database integration can be enabled by provisioning a database and running migrations.

### External Dependencies

**NS (Nederlandse Spoorwegen) APIs**:
- **Departures API** (`v2/departures`): Real-time departure information for stations
- **Trip Planner API** (`v3/trips`): Journey planning between origin and destination
- **Journey Details API** (`v2/journey`): Detailed train information including stops, platforms, and timing
- **Stations API**: Station listing and search functionality

**Authentication**: NS API requires `Ocp-Apim-Subscription-Key` header (API key stored in `NS_API_KEY` environment variable)

**Third-Party UI Libraries**:
- Radix UI primitives for accessible components (accordion, dialog, popover, etc.)
- Lucide React for icons
- date-fns for date/time formatting (Dutch locale support)
- Embla Carousel for potential carousel features
- cmdk for command palette functionality

**Type Safety**: Zod schemas for runtime validation, integrated with Drizzle for database types

**Build & Development Tools**:
- esbuild for server bundling
- PostCSS with Autoprefixer
- Replit-specific plugins for development experience

**Fonts**: Google Fonts CDN for Inter, Architects Daughter, DM Sans, Fira Code, and Geist Mono