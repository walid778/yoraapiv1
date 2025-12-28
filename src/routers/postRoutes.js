const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const verifyToken = require('../middlewares/verifyToken');
const { upload } = require('../config/multerConfig');

router.post(
  '/create', 
  verifyToken, 
  upload.single('media'), // 'media' هو اسم الحقل من Flutter
  postController.createPost
);
// Create a post
//router.post('/create', verifyToken, postController.createPost);

// Get all posts
router.get('/getposts', verifyToken, postController.getPosts);

// React to a post
router.post('/:id/react', verifyToken, postController.reactToPost);

// Get React post
router.get('/:id/reactions', verifyToken, postController.getPostReactions);

// Delete Post
router.delete('/:postId', verifyToken, postController.deletePost);

// Comment on a post
router.post('/:postId/comments', verifyToken, postController.createComment);
router.get('/:postId/comments', verifyToken, postController.getPostComments);

router.post('/:postId/comments/:commentId/reply', verifyToken, postController.replyToComment);
router.post('/:postId/comments/:commentId/react', verifyToken, postController.reactToComment);
router.delete('/:postId/comments/:commentId', verifyToken, postController.deleteComment);


module.exports = router;
