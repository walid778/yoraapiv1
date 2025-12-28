const Post = require('../models/Post');
const Notification = require('../controllers/fcmController');
const { getIO } = require('../services/socket');
const User = require('../models/User');

const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    let mediaUrl = null;
    let type = 'text';

    if (req.file) {
  type = 'text';  // نوع البوست مع ملف هو 'media'
  mediaUrl = `${req.protocol}://${req.get('host')}/uploads/POSTS/Media/${req.file.filename}`;
}


    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Content or media is required.' });
    }

    const post = new Post({
      user: userId,
      content,
      type,
      mediaUrl,
    });

    await post.save();

    return res.status(201).json({ 
      success: true, 
      post,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

const createPostX = async (req, res) => {
  try {
    const { content, type, mediaUrl } = req.body;
    const userId = req.user.id;

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Content or media is required.' });
    }

    const post = new Post({
      user: userId,
      content,
      type: type || 'text',
      mediaUrl: mediaUrl || null,
    });

    await post.save();

    return res.status(201).json({ success: true, post });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isDeleted: false })
      .populate('user', 'name username avatar isVerified isAdmin verificationExpiresAt')
      .populate('comments.user', 'name username avatar isVerified isAdmin verificationExpiresAt')
      .populate('reactions.user', 'name username avatar isVerified isAdmin verificationExpiresAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // Check if user owns the post
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this post' 
      });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Post deleted successfully' 
    });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

const reactToPost = async (req, res) => {
  try {
    const io = getIO();
    const postId = req.params.id;
    const userId = req.user.id;
    const { type } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // إزالة أي reaction سابق
    post.reactions = post.reactions.filter(
      r => r.user.toString() !== userId.toString()
    );

    if (type) {
      post.reactions.push({ user: userId, type });
    }

    await post.save();

    // إرسال إشعار لصاحب البوست فقط
    if (post.user.toString() !== userId.toString()) {
      await Notification.sendSocketNotification(io, {
        userId: post.user.toString(), // receiver
        senderId: userId,             // actor
        type: 'like',
        postId: post._id,
      });
    }

    return res.status(200).json({
      success: true,
      reactions: post.reactions,
    });

  } catch (error) {
    console.error('❌ reactToPost error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const commentOnPost = async (req, res) => {
  try {
    const io = getIO();
    const postId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required',
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    post.comments.push({
      user: userId,
      content,
    });

    await post.save();

    // إشعار صاحب البوست
    if (post.user.toString() !== userId.toString()) {
      await Notification.sendSocketNotification(io, {
        userId: post.user.toString(), // receiver
        senderId: userId,             // actor
        type: 'comment',
        postId: post._id,
      });
    }

    return res.status(201).json({
      success: true,
      comments: post.comments,
    });

  } catch (error) {
    console.error('❌ commentOnPost error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Get reactions of a post
const getPostReactions = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .populate('reactions.user', 'name username avatar');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.status(200).json({
      success: true,
      reactions: post.reactions
    });

  } catch (error) {
    console.error('Get reactions error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};




const createComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { content, parentCommentId, mentionedUserIds } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment content is required' 
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    const newComment = {
      user: userId,
      content,
      parentCommentId: parentCommentId || null,
      mentionedUserIds: mentionedUserIds || [],
      reactions: []
    };

    post.comments.push(newComment);
    await post.save();

    // جلب التعليق مع بيانات المستخدم
    const updatedPost = await Post.findById(postId)
      .populate('user', 'name username avatar')
      .populate('comments.user', 'name username avatar')
      .populate('comments.reactions.user', 'name username avatar')
      .populate('comments.mentionedUserIds', 'name username avatar');

    const createdComment = updatedPost.comments[updatedPost.comments.length - 1];

    return res.status(201).json({ 
      success: true, 
      comment: createdComment 
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// الرد على تعليق
const replyToComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;
    const { content, mentionedUserIds } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reply content is required' 
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    const parentComment = post.comments.id(commentId);
    if (!parentComment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Parent comment not found' 
      });
    }

    const reply = {
      user: userId,
      content,
      parentCommentId: commentId,
      mentionedUserIds: mentionedUserIds || [],
      reactions: []
    };

    post.comments.push(reply);
    await post.save();

    // جلب الرد مع بيانات المستخدم
    const updatedPost = await Post.findById(postId)
      .populate('user', 'name username avatar')
      .populate('comments.user', 'name username avatar')
      .populate('comments.reactions.user', 'name username avatar')
      .populate('comments.mentionedUserIds', 'name username avatar');

    const createdReply = updatedPost.comments[updatedPost.comments.length - 1];

    return res.status(201).json({ 
      success: true, 
      reply: createdReply 
    });
  } catch (error) {
    console.error('Reply to comment error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// التفاعل مع تعليق
const reactToComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reaction type is required' 
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // إزالة التفاعل السابق لنفس المستخدم
    comment.reactions = comment.reactions.filter(
      reaction => reaction.user.toString() !== userId.toString()
    );

    // إضافة التفاعل الجديد
    comment.reactions.push({
      user: userId,
      type
    });

    await post.save();

    // جلب البيانات المحدثة
    const updatedPost = await Post.findById(postId)
      .populate('comments.reactions.user', 'name username avatar');

    const updatedComment = updatedPost.comments.id(commentId);

    return res.status(200).json({ 
      success: true, 
      reactions: updatedComment.reactions 
    });
  } catch (error) {
    console.error('React to comment error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// حذف تعليق
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // التحقق من أن المستخدم هو صاحب التعليق
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this comment' 
      });
    }

    // soft delete
    comment.isDeleted = true;
    comment.content = '[deleted]';
    
    await post.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Comment deleted successfully' 
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// جلب تعليقات البوست
const getPostComments = async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId)
      .populate('user', 'name username avatar')
      .populate('comments.user', 'name username avatar')
      .populate('comments.reactions.user', 'name username avatar')
      .populate('comments.mentionedUserIds', 'name username avatar');

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // تصفية التعليقات المحذوفة
    const activeComments = post.comments.filter(comment => !comment.isDeleted);

    return res.status(200).json({ 
      success: true, 
      comments: activeComments 
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};



module.exports = {
    createPost,
    getPosts,
    reactToPost,
    commentOnPost,
    deletePost,
    getPostReactions,
    
    createComment,
  replyToComment,
  reactToComment,
  deleteComment,
  getPostComments,
}