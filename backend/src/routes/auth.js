import { Router } from 'express';
import { AuthService } from '../services/AuthService.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';
import { setRefreshTokenCookie, getRefreshTokenFromRequest, clearRefreshTokenCookie } from '../utils/authCookies.js';

const router = Router();
const authService = new AuthService();

const registerSchema = {
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 8 },
  username: { required: true, type: 'string', minLength: 1 },
};

const loginSchema = {
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 1 },
};

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    setRefreshTokenCookie(res, result.refreshToken, req);
    success(res, { token: result.token, user: result.user }, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    setRefreshTokenCookie(res, result.refreshToken, req);
    success(res, { token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    const result = await authService.refreshSession(refreshToken);
    setRefreshTokenCookie(res, result.refreshToken, req);
    success(res, { token: result.token, user: result.user });
  } catch (err) {
    clearRefreshTokenCookie(res, req);
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getUser(req.user.userId);
    success(res, { user: user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    await authService.logoutByRefreshToken(refreshToken);
    clearRefreshTokenCookie(res, req);
    success(res, { loggedOut: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getUser(req.user.userId);
    success(res, { user: user });
  } catch (err) {
    next(err);
  }
});

router.delete('/me', authenticate, async (req, res, next) => {
  try {
    await authService.deleteAccount(req.user.userId);
    clearRefreshTokenCookie(res);
    success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
