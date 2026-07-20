import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { serviceAccountService } from '../services/ServiceAccountService.js';
import { gcpService } from '../services/GcpService.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Try service account token first (sec_live_***)
    if (token.startsWith('sec_live_')) {
      try {
        const sa = await serviceAccountService.validateToken(token);
        req.user = {
          userId: sa.id,
          email: sa.saId,
          roles: ['service_account'],
          orgId: sa.orgId,
          serviceAccount: sa,
        };
        return next();
      } catch {
        // Not a valid service account token, fall through to JWT
      }
    }

    // JWT user token
    const decoded = jwt.verify(token, config.jwtSecret);
    const userDoc = await gcpService.firestore.collection('users').doc(decoded.sub).get();
    if (!userDoc.exists) {
      throw new UnauthorizedError('User not found');
    }

    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
      orgId: decoded.orgId,
    };

    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!hasRole) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
};

export const requireOrgAccess = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.body.orgId;

    if (!orgId) {
      return next(new UnauthorizedError('Organization ID required'));
    }

    // Service accounts must belong to the org
    if (req.user.serviceAccount) {
      if (req.user.orgId !== orgId) {
        return next(new UnauthorizedError('Service account does not have access to this organization'));
      }
      return next();
    }

    // For regular users, check org ownership from Firestore
    const orgDoc = await gcpService.firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return next(new UnauthorizedError('Organization not found'));
    }

    const orgData = orgDoc.data();
    const isOwner = orgData.accountId === req.user.userId;
    const isMember = orgData.members?.some(m => m.userId === req.user.userId);
    const isGlobalAdmin = req.user.roles?.includes('admin');

    if (!isOwner && !isMember && !isGlobalAdmin) {
      console.warn(`[requireOrgAccess] 401 Unauthorized for user ${req.user.userId} on org ${orgId}. isOwner: ${isOwner}, isMember: ${isMember}, isGlobalAdmin: ${isGlobalAdmin}`);
      console.warn(`[requireOrgAccess] orgData.accountId: ${orgData.accountId}, orgData.members:`, orgData.members);
      return next(new UnauthorizedError('User does not have access to this organization'));
    }

    req.user.orgId = orgId;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireProjectAccess = (req, res, next) => {
  const projectId = req.params.projectId;
  if (!projectId) return next();

  // Service account project scoping
  if (req.user.serviceAccount) {
    const sa = req.user.serviceAccount;
    const hasAccess = serviceAccountService.hasProjectAccess(sa, projectId, 'write');
    if (!hasAccess) {
      return next(new UnauthorizedError('Service account does not have access to this project'));
    }
  }

  next();
};

async function loadOrganization(orgId) {
  const orgDoc = await gcpService.getOrgRef(orgId).get();
  if (!orgDoc.exists) {
    throw new UnauthorizedError('Organization not found');
  }

  return orgDoc.data();
}

export const requireOrganizationOwner = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.body.orgId;

    if (!orgId) {
      throw new UnauthorizedError('Organization ID required');
    }

    if (req.user?.serviceAccount) {
      throw new ForbiddenError('Service accounts cannot perform this action');
    }

    const org = await loadOrganization(orgId);
    const isOwner = org.accountId === req.user.userId;
    const isGlobalAdmin = req.user.roles?.includes('admin');

    if (!isOwner && !isGlobalAdmin) {
      throw new ForbiddenError('Only the organization owner can perform this action');
    }

    req.user.orgId = orgId;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireOrganizationManager = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.body.orgId;

    if (!orgId) {
      throw new UnauthorizedError('Organization ID required');
    }

    if (req.user?.serviceAccount) {
      if (req.user.orgId !== orgId || !req.user.serviceAccount?.permissions?.manageUsers) {
        throw new ForbiddenError('Service account does not have access to manage organization users');
      }
      return next();
    }

    const org = await loadOrganization(orgId);
    const isOwner = org.accountId === req.user.userId;
    const member = org.members?.find((m) => m.userId === req.user.userId);
    const memberRole = member?.role?.toLowerCase();
    const isAdmin = memberRole === 'admin' || memberRole === 'owner';
    const isGlobalAdmin = req.user.roles?.includes('admin');

    if (!isOwner && !isAdmin && !isGlobalAdmin) {
      throw new ForbiddenError('Only the organization owner or admin can manage organization users');
    }

    req.user.orgId = orgId;
    next();
  } catch (err) {
    next(err);
  }
};
