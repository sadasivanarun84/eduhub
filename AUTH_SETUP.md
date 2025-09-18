# Authentication Setup Guide

This document explains how to set up Google OAuth authentication for the Game Hub application.

## Phase 1: Authentication Implementation Complete ✅

The following components have been successfully implemented:

### Backend Authentication
- **Google OAuth Strategy**: Passport.js configuration with Google OAuth 2.0
- **User Management**: Complete user CRUD operations in storage layer
- **Session Management**: Express session configuration with secure cookies
- **Role-based Access Control**: User, Admin, and Super Admin roles
- **Authentication Middleware**: Protection for routes requiring authentication

### Database Schema
- **Users Table**: Complete user schema with Google OAuth fields
- **Role System**: `user`, `admin`, `super_admin` roles
- **Super Admin**: `sadasivanarun84@gmail.com` automatically gets super_admin role

### Frontend Authentication
- **Auth Provider**: React context for authentication state
- **Auth Components**: Login/logout button with user profile display
- **Route Integration**: Authentication UI integrated into main layout

### API Endpoints
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `GET /auth/user` - Get current user info
- `POST /auth/logout` - Logout endpoint

## Environment Configuration Required

To complete the setup, you need to configure these environment variables:

### Required Environment Variables

```bash
# Google OAuth Credentials (Required)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Session Security (Recommended)
SESSION_SECRET=your_secure_random_session_secret_here

# Database (if using PostgreSQL - currently using MemStorage)
DATABASE_URL=postgresql://username:password@host:port/database
```

## Google OAuth Setup Steps

### 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Enable the Google+ API (if not already enabled)
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Choose "Web application"
7. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/google/callback`
   - For production: `https://your-domain.com/auth/google/callback`

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
GOOGLE_CLIENT_ID=your_client_id_from_google_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_console
SESSION_SECRET=a_long_random_string_for_session_security
```

### 3. Test Authentication

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`
3. Click "Login with Google" button
4. Complete OAuth flow
5. Verify user profile appears with logout option

## User Roles and Permissions

### Super Admin (`sadasivanarun84@gmail.com`)
- Full access to all games and campaigns
- Can manage all user data
- Administrative controls (when implemented)

### Regular Users
- Can create and manage their own game instances
- Personal campaign management
- Play all available games

## Next Phase: Route Protection

Once authentication is working, the next phase will include:

1. **Protected Routes**: Require authentication for game management
2. **User-specific Campaigns**: Each user gets their own game instances
3. **Admin Dashboard**: Super admin interface for global settings
4. **Database Migration**: Move from MemStorage to PostgreSQL

## Troubleshooting

### Common Issues

1. **"Not authenticated" errors**: Check if environment variables are set correctly
2. **OAuth callback failures**: Verify redirect URIs match exactly in Google Console
3. **Session issues**: Ensure SESSION_SECRET is set for production

### Development vs Production

- **Development**: Uses `http://localhost:3000` with secure cookies disabled
- **Production**: Requires HTTPS and secure cookie settings

## Current Status

✅ **Complete**: Basic authentication flow with Google OAuth
✅ **Complete**: User registration and login
✅ **Complete**: Session management
✅ **Complete**: Role-based access (super admin setup)
✅ **Complete**: Frontend UI components

🔄 **Next**: Environment setup and testing with real Google OAuth credentials