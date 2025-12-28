const Auth = require('../models/Auth');
const UserProfile = require('../models/User');

const getMe = async (req, res) => {
    try {
        const userProfile = await UserProfile.findById(req.user.id);
if (!userProfile) {
    return res.status(404).json({ success: false, message: 'User not found' });
}

const authData = await Auth.findById(userProfile.authId).select("-password");

const avatarUrl = userProfile.avatar 
      ? `${req.protocol}://${req.get('host')}${userProfile.avatar}` 
      : null;

return res.status(200).json({
    success: true,
    user: {
        id: userProfile._id,
        name: userProfile.name,
        username: userProfile.username,
        email: authData.email,
        avatar: userProfile.avatar,
        cover: userProfile.cover || null,
        bio: userProfile.bio || "",
        birth: userProfile.birth || null,
        isVerified: userProfile.isVerified,
        verificationExpiresAt: userProfile.verificationExpiresAt,
        isAdmin: userProfile.isAdmin,
        createdAt: userProfile.createdAt,
    }
});


    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userProfile = await UserProfile.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const authData = await Auth.findById(userProfile.authId).select("-password");

    return res.status(200).json({
      success: true,
      user: {
        id: userProfile._id,
        name: userProfile.name,
        username: userProfile.username,
        email: authData?.email || null,
        avatar: userProfile.avatar || null,
        cover: userProfile.cover || null,
        bio: userProfile.bio || "",
        birth: userProfile.birth || null,
        isVerified: userProfile.isVerified,
        verificationExpiresAt: userProfile.verificationExpiresAt,
        isAdmin: userProfile.isAdmin,
        createdAt: userProfile.createdAt,
      }
    });

  } catch (err) {
    console.error('Error fetching user by ID:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


const verifyuser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified, expiresAt } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ message: 'isVerified must be boolean' });
    }

    const user = await UserProfile.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = isVerified;
    if (expiresAt) {
      user.verificationExpiresAt = new Date(expiresAt);
    } else {
      user.verificationExpiresAt = null; // permanent verification if no expiresAt
    }

    await user.save();

    res.json({
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserImageHandler = async (req, res) => {
  try {
    const type = req.params.type; // avatar أو cover
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const user = await UserProfile.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // تحديد مجلد الصورة حسب النوع
    let folder = '';
    if (type === 'avatar') folder = 'USERS/Profile';
    else if (type === 'cover') folder = 'USERS/Cover';
    else folder = 'Others';

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${folder}/${req.file.filename}`;

    if (type === 'avatar') user.avatar = imageUrl;
    else if (type === 'cover') user.cover = imageUrl;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `${type} uploaded successfully`,
      data: { url: imageUrl }
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const searchUser = async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ success: false, message: 'Query is required' });

  try {
    const users = await UserProfile.find({
      $and: [
        { _id: { $ne: req.user.id } }, // exclude current user
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).limit(10);

    res.json({ success: true, results: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Validate userId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const currentUser = await UserProfile.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'Current user not found' });
    }

    const isFollowing = currentUser.following.includes(userId);

    return res.status(200).json({
      success: true,
      isFollowing: isFollowing
    });
  } catch (err) {
    console.error('Error checking follow status:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Validate userId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Cannot follow yourself
    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const targetUser = await UserProfile.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = await UserProfile.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'Current user not found' });
    }

    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Already following this user' });
    }

    // Add to following list
    currentUser.following.push(userId);
    // Add to followers list
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `Successfully followed ${targetUser.name}`
    });
  } catch (err) {
    console.error('Error following user:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Validate userId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const targetUser = await UserProfile.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = await UserProfile.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'Current user not found' });
    }

    // Check if not following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Not following this user' });
    }

    // Remove from following list
    currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
    // Remove from followers list
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);

    await currentUser.save();
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `Successfully unfollowed ${targetUser.name}`
    });
  } catch (err) {
    console.error('Error unfollowing user:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
    getMe,
    getUserById,
    verifyuser,
    updateUserImageHandler,
    searchUser,
    getFollowStatus,
    followUser,
    unfollowUser,
}