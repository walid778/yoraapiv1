const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middlewares/verifyToken');
const { upload } = require('../config/multerConfig');
const tokenController = require('../controllers/tokenController');

router.post('/fcm-token', verifyToken, tokenController.FCMToken);
router.get('/search', verifyToken, userController.searchUser);
router.get("/me", verifyToken, userController.getMe);
router.get("/:userId/follow-status", verifyToken, userController.getFollowStatus);
router.post("/:userId/follow", verifyToken, userController.followUser);
router.post("/:userId/unfollow", verifyToken, userController.unfollowUser);
router.get("/:userId", verifyToken, userController.getUserById);
router.patch("/:userId/verify",  userController.verifyuser);

// رفع صورة avatar أو cover
router.post(
  "/upload/:type",
  verifyToken,
  (req, res, next) => {
    const type = req.params.type;
    if (!['avatar', 'cover'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid image type' });
    }
    upload.single(type)(req, res, (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      next();
    });
  },
  userController.updateUserImageHandler
);

module.exports = router;
