const jwt = require('jsonwebtoken');

const generateAccessToken = ({ _id, email }) => {
    return jwt.sign(
        { id: _id, email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

const generateRefreshToken = ({ _id, email }) => {
    return jwt.sign(
        { id: _id, email },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
};


module.exports = {
    generateAccessToken,
    generateRefreshToken
};