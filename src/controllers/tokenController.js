const jwt = require('../utils/jwt');
const RefreshToken = require('../models/Tokens');
const auth = require('../models/Auth');
const ms = require('ms');
const hashToken = require('../utils/hashtoken'); 
const UserProfile = require('../models/User');

const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh Token is required' });
        }

        const hashedRefresh = hashToken(refreshToken);
        // البحث عن Refresh Token في DB
        const storedToken = await RefreshToken.findOne({ token: hashedRefresh });
        if (!storedToken) {
            return res.status(401).json({ success: false, message: 'Invalid Refresh Token' });
        }

        // التحقق من انتهاء الصلاحية
        if (new Date() > storedToken.expiresAt) {
            await RefreshToken.deleteOne({ _id: storedToken._id });
            return res.status(401).json({ success: false, message: 'Refresh Token expired, please login again' });
        }

        // توليد Access Token جديد
        const user = await auth.findById(storedToken.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userProfile = await UserProfile.findOne({ authId: user._id });
if (!userProfile) {
    return res.status(404).json({ success: false, message: 'User profile not found' });
}

       // const newAccessToken = jwt.generateAccessToken(user);
      const newAccessToken = jwt.generateAccessToken({ _id: userProfile._id, email: user.email });


        return res.status(200).json({
            success: true,
            message: 'Access Token renewed successfully',
            accesstoken: newAccessToken
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Internal Error' });
    }
};

const rotateRefreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh Token is required' });
        }

        const hashedRefresh = hashToken(refreshToken);
        const storedToken = await RefreshToken.findOne({ token: hashedRefresh });
        if (!storedToken) {
            return res.status(401).json({ success: false, message: 'Invalid Refresh Token' });
        }

        if (new Date() > storedToken.expiresAt) {
            await RefreshToken.deleteOne({ _id: storedToken._id });
            return res.status(401).json({ success: false, message: 'Refresh Token expired, please login again' });
        }

        const user = await auth.findById(storedToken.userId);
if (!user) return res.status(404).json({ success: false, message: 'User not found' });

const userProfile = await UserProfile.findOne({ authId: user._id });
if (!userProfile) return res.status(404).json({ success: false, message: 'User profile not found' });

const newAccessToken = jwt.generateAccessToken({ _id: userProfile._id, email: user.email });
const newRefreshToken = jwt.generateRefreshToken({ _id: userProfile._id, email: user.email });

        const hashedNewRefresh = hashToken(newRefreshToken);

        // تحديث الـ DB
        storedToken.token = hashedNewRefresh;
        storedToken.expiresAt = new Date(Date.now() + ms(process.env.JWT_REFRESH_EXPIRES_IN));
        await storedToken.save();

        return res.status(200).json({
            success: true,
            message: 'Tokens renewed successfully',
            accesstoken: newAccessToken,
            refreshtoken: newRefreshToken
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Internal Error' });
    }
};

const FCMToken = async (req, res) => {
    const { fcmToken } = req.body;
    const userId = req.user.id || req.user._id;

    if (!fcmToken) return res.status(400).json({ success: false, message: 'FCM token is required' });

    try {
        const userProfile = await UserProfile.findById(userId);
        if (!userProfile) return res.status(404).json({ success: false, message: 'User not found' });

        userProfile.fcmToken = fcmToken;
        await userProfile.save();

        res.status(200).json({ success: true, message: 'FCM token saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { refreshAccessToken, rotateRefreshToken, FCMToken };
