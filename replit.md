# Overview

This is a modern spinning wheel application built with React and Express. Users can create custom spinning wheels by adding colorful sections with text, spin the wheel to get random results, and view their spin history. The app features a sleek dark-themed UI with animations and provides both wheel customization and results tracking functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with a custom dark theme and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Canvas Rendering**: HTML5 Canvas API for drawing the spinning wheel with custom animations

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with endpoints for wheel sections and spin results
- **Data Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error middleware with structured error responses

## Data Storage Solutions
- **Primary Storage**: In-memory storage implementation (MemStorage class) with Maps for data persistence
- **Database Ready**: Drizzle ORM configured for PostgreSQL with migration support
- **Schema Management**: Shared TypeScript schemas between frontend and backend using Drizzle-Zod integration

## Data Models
- **WheelSection**: Contains text, color, order, and creation timestamp
- **SpinResult**: Stores winner text and timestamp for history tracking
- **User**: Basic user model prepared for future authentication

## Development Architecture
- **Monorepo Structure**: Unified codebase with client/, server/, and shared/ directories
- **Hot Module Replacement**: Vite development server with Express integration
- **Type Safety**: Full TypeScript coverage with shared types between client and server
- **Build Process**: Separate build steps for client (Vite) and server (esbuild)

## Key Design Decisions
- **In-Memory Storage**: Chosen for simplicity and immediate functionality, easily replaceable with PostgreSQL
- **Canvas-Based Wheel**: HTML5 Canvas provides smooth animations and precise control over wheel rendering
- **Real-Time UI Updates**: TanStack Query ensures immediate UI updates after mutations
- **Component Architecture**: Modular React components with clear separation of concerns (wheel rendering, controls, results)

# External Dependencies

## Core Framework Dependencies
- **@vitejs/plugin-react**: React support for Vite build tool
- **express**: Node.js web framework for API server
- **wouter**: Lightweight client-side routing

## UI and Styling
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant generation for component styling
- **clsx**: Utility for constructing className strings

## Data Management
- **@tanstack/react-query**: Powerful server state management for React
- **drizzle-orm**: TypeScript-first ORM with PostgreSQL support
- **drizzle-zod**: Integration between Drizzle and Zod for type-safe schemas
- **zod**: TypeScript-first schema validation library

## Database Integration
- **@neondatabase/serverless**: Serverless PostgreSQL client (configured but not actively used)
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Development Tools
- **typescript**: Static type checking
- **tsx**: TypeScript execution engine for development
- **esbuild**: Fast JavaScript bundler for server build process
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Utility Libraries
- **date-fns**: Modern JavaScript date utility library
- **nanoid**: URL-safe unique string ID generator
- **embla-carousel-react**: Carousel component (available but not implemented)