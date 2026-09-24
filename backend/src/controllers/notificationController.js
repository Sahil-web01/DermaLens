import Notification from '../models/Notification.js';

/**
 * GET /api/notifications
 * Fetch latest notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const role = req.query.role || req.user?.role || 'CLINICIAN';
    const filter = { recipientRole: role.toUpperCase() };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications.',
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns count of unread notifications
 */
export const getUnreadCount = async (req, res) => {
  try {
    const role = req.query.role || req.user?.role || 'CLINICIAN';
    const count = await Notification.countDocuments({
      recipientRole: role.toUpperCase(),
      read: false,
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch unread count.',
    });
  }
};

/**
 * POST /api/notifications/read
 * Mark specific notifications as read
 */
export const markAsRead = async (req, res) => {
  try {
    const ids = req.body?.notificationIds || (req.params?.id ? [req.params.id] : []);
    if (Array.isArray(ids) && ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ids } },
        { $set: { read: true } }
      );
    } else if (typeof ids === 'string' && ids) {
      await Notification.findByIdAndUpdate(ids, { read: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Notifications marked as read.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const role = req.body.role || 'CLINICIAN';
    await Notification.updateMany(
      { recipientRole: role.toUpperCase(), read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
