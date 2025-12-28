const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/fcmController');
const verifyToken = require('../middlewares/verifyToken');

router.get('/', verifyToken, notificationsController.getNotifications);
router.patch('/:id/read', verifyToken, notificationsController.markAsRead);
router.delete('/:id', verifyToken, notificationsController.deleteNotification);

module.exports = router;