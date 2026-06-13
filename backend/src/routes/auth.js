import { Router } from 'express';
import { AuthService } from '../services/AuthService.js';
import { validate } from '../middleware/validate.js';
import { success } from '../utils/response.js';

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
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
