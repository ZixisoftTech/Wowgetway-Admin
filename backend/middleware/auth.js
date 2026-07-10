import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Role } from '../models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wow_gateway_default_secure_secret_2026_key_xyz';

// Local mock roles for fallback mode permission checks
const mockRolesDatabase = [
  {
    name: 'Super Admin',
    permissions: [
      { module: 'Dashboard', view: true, add: true, edit: true, delete: true },
      { module: 'Staff Management', view: true, add: true, edit: true, delete: true },
      { module: 'Roles & Permissions', view: true, add: true, edit: true, delete: true },
      { module: 'Attendance', view: true, add: true, edit: true, delete: true },
      { module: 'Salary Management', view: true, add: true, edit: true, delete: true },
      { module: 'Manage Homestay Owners', view: true, add: true, edit: true, delete: true },
      { module: 'Manage Homestays', view: true, add: true, edit: true, delete: true },
      { module: 'Manage Bookings', view: true, add: true, edit: true, delete: true }
    ]
  },
  {
    name: 'HR Manager',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Staff Management', view: true, add: true, edit: true, delete: true },
      { module: 'Roles & Permissions', view: true, add: false, edit: false, delete: false },
      { module: 'Attendance', view: true, add: true, edit: true, delete: true },
      { module: 'Salary Management', view: true, add: true, edit: true, delete: false }
    ]
  },
  {
    name: 'Accountant',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Salary Management', view: true, add: true, edit: true, delete: false }
    ]
  }
];

// Helper to check if MongoDB is active
const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Middleware to authenticate JWT Access Token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn(`[Auth] JWT verification failed: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired access token', code: 'TOKEN_EXPIRED' });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware to enforce Module-Level RBAC Permissions
 */
export const requirePermission = (moduleName, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { role } = req.user;

    // Super Admin has bypass access to everything
    if (role === 'Super Admin') {
      return next();
    }

    try {
      let permissions = [];

      if (isMongoConnected()) {
        // Query permissions from MongoDB
        const dbRole = await Role.findOne({ name: role });
        if (dbRole) {
          permissions = dbRole.permissions || [];
        }
      } else {
        // Fallback to local memory roles
        const mockRole = mockRolesDatabase.find(r => r.name === role);
        if (mockRole) {
          permissions = mockRole.permissions || [];
        }
      }

      // Check if user has permission for the specified module and action
      const modulePermission = permissions.find(p => p.module === moduleName);
      if (modulePermission && modulePermission[action]) {
        return next();
      }

      console.warn(`[Auth] Forbidden: User ${req.user.email} with role ${role} lacks '${action}' permission for '${moduleName}'`);
      return res.status(403).json({ 
        error: `Access Denied: You do not have permission to ${action} records in the ${moduleName} module.` 
      });
    } catch (err) {
      console.error(`[Auth] RBAC check failed:`, err);
      res.status(500).json({ error: 'Authorization validation exception', message: err.message });
    }
  };
};
