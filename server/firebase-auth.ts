import { getAuth } from 'firebase-admin/auth';
import { storage } from './storage';
import type { User } from '@shared/schema';

export const firebaseAuth = getAuth();

// Verify Firebase ID token and get user
export async function verifyFirebaseToken(idToken: string): Promise<User | null> {
  try {
    // Verify the ID token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      throw new Error('No email found in Firebase token');
    }

    // Try to check if user exists in our database
    let user;
    try {
      user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          email,
          googleId: uid,
          displayName: name || null,
          profilePicture: picture || null,
        });
      } else {
        // Update existing user's last login
        user = await storage.updateUser(user.id, {
          googleId: uid,
          displayName: name || user.displayName,
          profilePicture: picture || user.profilePicture,
          lastLoginAt: new Date(),
        });
      }
    } catch (storageError) {
      console.warn('Firestore not available, creating temporary user:', storageError);
      // If Firestore is not available, create a temporary user object
      user = {
        id: uid,
        email,
        googleId: uid,
        displayName: name || null,
        profilePicture: picture || null,
        role: 'user' as const,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };
    }

    return user;
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}

// Middleware to verify Firebase token from request headers
export async function requireFirebaseAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  const user = await verifyFirebaseToken(idToken);

  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// Middleware to require admin access
export async function requireAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const user = req.user as User;
  if (user.role === 'admin' || user.role === 'super_admin') {
    return next();
  }
  
  res.status(403).json({ message: 'Admin access required' });
}

// Middleware to require super admin access
export async function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const user = req.user as User;
  if (user.role === 'super_admin') {
    return next();
  }
  
  res.status(403).json({ message: 'Super admin access required' });
}

// Helper to check if user can access resource
export function canAccessResource(user: User, resourceUserId: string): boolean {
  // Super admin can access everything
  if (user.role === 'super_admin') {
    return true;
  }
  
  // Users can access their own resources
  return user.id === resourceUserId;
}