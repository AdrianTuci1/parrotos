import { Router } from 'express';
import { NotificationService } from '../services/NotificationService.js';
import { authenticate } from '../middleware/auth.js';
import { success } from '../utils/response.js';

const router = Router();
const notificationService = new NotificationService();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.listForUser(req.user.userId, { limit, unreadOnly });
    success(res, notifications);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.user.userId, req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await notificationService.delete(req.user.userId, req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
