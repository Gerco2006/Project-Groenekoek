# TravNL - Open-Source Dutch Travel Planner

## Overview

TravNL (Project Groenekoek) is a modern, open-source travel planning web application focused on Dutch rail travel. The project aims to provide more detailed journey information than standard travel apps, targeting train enthusiasts and travelers who want comprehensive trip details. The application integrates with NS (Nederlandse Spoorwegen) APIs to provide real-time departure information, journey planning, and detailed train information.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server with HMR support
- Wouter for lightweight client-side routing (4 main routes: Journey Planner, Departures, Train Lookup, More)

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Shadcn/ui component library following the "New York" style variant
- Custom CSS variables for theming support (light/dark mode)

**State Management & Data Fetching**
- TanStack React Query for server state management
- Local state with React hooks for UI interactions
- Theme preference persisted in localStorage

**Design System**
- Modern aesthetic with rounded corners (12px/8px/4px border radius scale)
- Blur effects and backdrop filters for depth
- Color-coded train types: Yellow (Intercity), Blue (Sprinter), Green (non-NS trains)
- Responsive layout with mobile-first approach
- Bottom navigation for mobile, top navigation for desktop

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for the HTTP server
- Custom middleware for request logging and JSON parsing
- Development/production mode differentiation via NODE_ENV

**API Integration Strategy**
- Client-side integration with NS APIs (planned):
  - Departures API: `/api/v2/departures` for station departure boards
  - Journey Planner API: `/api/v3/trips` for route planning
  - Train Info API: `/api/v2/journey` for detailed train information
- Currently using mock data in components for development

**Module System**
- ES Modules throughout (type: "module" in package.json)
- Path aliases configured: `@/` for client, `@shared/` for shared code

### Data Storage

**Database Setup**
- Drizzle ORM configured for PostgreSQL with Neon serverless driver
- Schema defined with Zod validation integration
- Migrations managed via Drizzle Kit
- Current schema includes basic user table (authentication placeholder)

**Storage Abstraction**
- `IStorage` interface for CRUD operations
- `MemStorage` implementation for in-memory development storage
- Designed to swap between memory and database implementations

### Authentication & Authorization

**Current Implementation**
- Basic user schema with username/password fields
- No active authentication flow implemented
- Session management infrastructure present (connect-pg-simple installed)
- Prepared for future authentication implementation

### External Dependencies

**Third-Party Services**
- **NS (Nederlandse Spoorwegen) APIs**: Primary data source for train schedules, departures, and journey planning
  - Departures API for real-time station information
  - Trips API for multi-leg journey planning
  - Journey API for detailed train composition and stops
- **Neon Database**: Serverless PostgreSQL hosting (via `@neondatabase/serverless`)

**Key Libraries**
- **UI Framework**: React, Radix UI components, Tailwind CSS
- **Routing**: Wouter (lightweight alternative to React Router)
- **Data Fetching**: TanStack React Query for async state
- **Forms**: React Hook Form with Zod resolvers for validation
- **Date Handling**: date-fns with Dutch locale support
- **Icons**: Lucide React for consistent iconography

**Development Tools**
- TypeScript for type safety across frontend and backend
- Vite plugins for Replit integration (cartographer, dev banner, runtime error overlay)
- ESBuild for production server bundling
- PostCSS with Autoprefixer for CSS processing

**Design Tokens**
- Custom CSS variables for theming in `client/src/index.css`
- Extended Tailwind config with custom color scales for trains
- Inter font family as primary typeface