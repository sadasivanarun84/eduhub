import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const displayName = profile.displayName;
        const profilePicture = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Check if user already exists
        let user = await storage.getUserByEmail(email);

        if (!user) {
          // Create new user
          user = await storage.createUser({
            email,
            googleId,
            displayName,
            profilePicture,
          });
        } else {
          // Update existing user's Google ID and last login
          user = await storage.updateUser(user.id, {
            googleId,
            displayName,
            profilePicture,
            lastLoginAt: new Date(),
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: User, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware to ensure user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Middleware to ensure user is admin or super admin
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as User;
  if (user.role === "admin" || user.role === "super_admin") {
    return next();
  }
  
  res.status(403).json({ message: "Admin access required" });
}

// Middleware to ensure user is super admin
export function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as User;
  if (user.role === "super_admin") {
    return next();
  }
  
  res.status(403).json({ message: "Super admin access required" });
}

// Helper to check if user can access resource
export function canAccessResource(user: User, resourceUserId: string): boolean {
  // Super admin can access everything
  if (user.role === "super_admin") {
    return true;
  }
  
  // Users can access their own resources
  return user.id === resourceUserId;
}

export { passport };