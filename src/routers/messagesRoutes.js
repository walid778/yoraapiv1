const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messageController');
const verifyToken = require('../middlewares/verifyToken');

router.get('/chats/:chatId', verifyToken, messagesController.getChatMessages);
router.get('/chats', verifyToken, messagesController.getChats);
router.post('/send', verifyToken, messagesController.sendMessage);
router.patch(
  '/chats/:chatUserId/seen',
  verifyToken,
  messagesController.markConversationAsSeen
);

router.patch(
  '/messages/:messageId/seen',
  verifyToken,
  messagesController.markAsSeen
);

router.delete(
  '/messages/:messageId',
  verifyToken,
  messagesController.deleteMessage
);

module.exports = router;
