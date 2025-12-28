const Story = require('../models/Story');
const User = require('../models/User');
const { getIO } = require('../services/socket');

/**
 * Create a new story
 */
const createStory = async (req, res) => {
  try {
    const { caption, type, duration, backgroundColor } = req.body;
    const userId = req.user.id;

    let mediaUrl = null;

    // Handle file upload
    if (req.file) {
      mediaUrl = `${req.protocol}://${req.get('host')}/uploads/POSTS/Media/${req.file.filename}`;
    } else if (type === 'text') {
      // Text stories don't require media
      mediaUrl = '';
    } else {
      // Image and video stories require media
      return res.status(400).json({
        success: false,
        message: 'Media is required for image and video stories',
      });
    }

    const story = new Story({
      user: userId,
      mediaUrl: mediaUrl || req.body.mediaUrl,
      type: type || 'image',
      caption: caption || '',
      duration: duration || 5,
      backgroundColor: backgroundColor || null,
      viewedBy: [],
    });

    await story.save();
    await story.populate('user', 'name username avatar isVerified');

    // Emit socket event to notify followers
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit('story:created', {
        success: true,
        story,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story,
    });
  } catch (error) {
    console.error('Create story error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get all stories from followed users
 */
const getStories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skip = 0, limit = 20 } = req.query;

    // Get user's following list
    const user = await User.findById(userId).select('following');
    const followingIds = user?.following || [];

    // Add self to see own stories
    const userIds = [userId, ...followingIds];

    // Get stories from followed users (not deleted, not expired)
    const stories = await Story.find({
      user: { $in: userIds },
      isDeleted: false,
      expiresAt: { $gt: new Date() }, // Not expired
    })
      .populate('user', 'name username avatar isVerified')
      .populate('viewedBy.user', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Group stories by user
    const storiesByUser = {};
    stories.forEach((story) => {
      const userId = story.user._id.toString();
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = {
          user: story.user,
          stories: [],
        };
      }
      storiesByUser[userId].stories.push(story);
    });

    const groupedStories = Object.values(storiesByUser);

    return res.status(200).json({
      success: true,
      stories: groupedStories,
      count: groupedStories.length,
    });
  } catch (error) {
    console.error('Get stories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get stories from specific user
 */
const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const stories = await Story.find({
      user: userId,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'name username avatar isVerified')
      .populate('viewedBy.user', 'name username avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      stories,
      count: stories.length,
    });
  } catch (error) {
    console.error('Get user stories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Mark story as viewed
 */
const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check if already viewed
    const alreadyViewed = story.viewedBy.some(
      (view) => view.user.toString() === userId
    );

    if (!alreadyViewed) {
      story.viewedBy.push({
        user: userId,
        viewedAt: new Date(),
      });
      await story.save();
    }

    await story.populate('viewedBy.user', 'name username avatar');

    return res.status(200).json({
      success: true,
      message: 'Story marked as viewed',
      story,
    });
  } catch (error) {
    console.error('View story error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Delete story (soft delete)
 */
const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check ownership
    if (story.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this story',
      });
    }

    story.isDeleted = true;
    await story.save();

    return res.status(200).json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    console.error('Delete story error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Get story view count and viewers
 */
const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await Story.findById(storyId)
      .populate('viewedBy.user', 'name username avatar isVerified');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    return res.status(200).json({
      success: true,
      viewCount: story.viewedBy.length,
      viewers: story.viewedBy,
    });
  } catch (error) {
    console.error('Get story viewers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  createStory,
  getStories,
  getUserStories,
  viewStory,
  deleteStory,
  getStoryViewers,
};
