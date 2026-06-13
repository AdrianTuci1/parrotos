import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import { serviceAccountService } from '../services/ServiceAccountService.js';

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

export const requireOrgAccess = (req, res, next) => {
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

  // For regular users, check org membership from JWT
  if (req.user.orgId && req.user.orgId !== orgId) {
    return next(new UnauthorizedError('User does not have access to this organization'));
  }

  req.user.orgId = orgId;
  next();
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
