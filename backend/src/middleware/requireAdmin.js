/**
 * Middleware to require admin role.
 * Must be used after authenticate middleware.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.roles?.includes('admin') && !req.user.roles?.includes('owner')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
