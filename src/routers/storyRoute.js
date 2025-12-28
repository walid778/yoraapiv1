const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const verifyToken = require('../middlewares/verifyToken');
const { upload } = require('../config/multerConfig');

/**
 * POST /api/stories/create
 * Create a new story with optional media upload
 */
router.post(
  '/create',
  verifyToken,
  upload.single('media'),
  storyController.createStory
);

/**
 * GET /api/stories
 * Get all stories from followed users (with pagination)
 */
router.get('/', verifyToken, storyController.getStories);

/**
 * GET /api/stories/user/:userId
 * Get all stories from specific user
 */
router.get('/user/:userId', verifyToken, storyController.getUserStories);

/**
 * POST /api/stories/:storyId/view
 * Mark story as viewed
 */
router.post('/:storyId/view', verifyToken, storyController.viewStory);

/**
 * GET /api/stories/:storyId/viewers
 * Get list of users who viewed the story
 */
router.get('/:storyId/viewers', verifyToken, storyController.getStoryViewers);

/**
 * DELETE /api/stories/:storyId
 * Delete story (soft delete)
 */
router.delete('/:storyId', verifyToken, storyController.deleteStory);

module.exports = router;
