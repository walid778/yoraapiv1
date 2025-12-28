const bcrypt = require('bcrypt');
const UserProfile = require('../models/User');
const auth = require('../models/Auth');
const jwt = require('../utils/jwt');
const RefreshToken = require('../models/Tokens');
const ms = require('ms');
const hashToken = require('../utils/hashtoken');
const tokenBlacklist = require('../config/tokenBlacklist');

const generateNumber = () => Math.floor(Math.random() * 10000);

const Register = async (req, res) => {

    try {
        const { email, password, name } = req.body;

        const existingemail = await auth.FindbyEmail(email);

        if (existingemail) {
            return res.status(409).json({ success: false, message: 'email already exist' });
        }
        else {

            const saltRound = 12;
            const hashedPassword = await bcrypt.hash(password, saltRound);

            const newAuth = await auth.create({ email, password: hashedPassword });

            await UserProfile.create({
                authId: newAuth._id,
                name: name,
                username: name + generateNumber(),
                birth: '',
                bio: '',
                avatar: '',
            });

            res.status(201).json({
                success: true,
                message: 'user Created Successfully',
            });
        }
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Internal Error' });
    }
};

const Login = async (req, res) => {

    try {
        const { email, password } = req.body;

        const user = await auth.FindbyEmail(email);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not registered yet' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Credentials' });
        }
        else {

            
            const userProfile = await UserProfile.findOne({ authId: user._id });
if (!userProfile) return res.status(404).json({ message: 'User profile not found' });

            const accesstoken = jwt.generateAccessToken({ _id: userProfile._id, email: user.email });
const refreshtoken = jwt.generateRefreshToken({ _id: userProfile._id, email: user.email });


            const hashedRefreshToken = hashToken(refreshtoken);

            const expiresInMs = ms(process.env.JWT_REFRESH_EXPIRES_IN);

            const newRefreshToken = new RefreshToken({
                userId: user._id,
                email: user.email,
                token: hashedRefreshToken,
                expiresAt: new Date(Date.now() + expiresInMs)
            });
            await newRefreshToken.save();
              
            console.log(`${userProfile.username} Logged in Successfully`);

            return res.status(200).json({
                success: true,
                message: 'User Logged in Successfully',
                accesstoken: accesstoken,
                refreshtoken: refreshtoken,
                user: userProfile,
            });

         
        }
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Internal Error' });
    }
};


const Logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader?.split(' ')[1];

        if (!accessToken) {
            return res.status(400).json({ success: false, message: 'No access token provided' });
        }

        // حذف الـ Refresh Token من قاعدة البيانات إذا موجود
        if (refreshToken) {
            const hashedRefresh = hashToken(refreshToken);
            const deleted = await RefreshToken.deleteOne({ token: hashedRefresh });
            if (deleted.deletedCount === 0) {
                console.warn('Refresh token not found or already deleted');
            }
        }

        if (tokenBlacklist.has(accessToken)) {
            return res.status(400).json({
                success: false,
                message: 'Token already logged out'
            });
        }
        tokenBlacklist.add(accessToken);


        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (err) {
        console.error('Logout Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Internal Error'
        });
    }
};



module.exports = {
    Register,
    Login,
    Logout,
}