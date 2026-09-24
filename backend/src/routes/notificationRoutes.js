import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read', markAsRead);
router.patch('/read', markAsRead);
router.patch('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);
router.patch('/mark-all-read', markAllAsRead);

export default router;
