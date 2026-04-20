const jwt = require('jsonwebtoken');
require('dotenv').config();

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Generate Access Token (short-lived)
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Generate Refresh Token (long-lived)
 * @param {Object} payload - User data to encode in token
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

/**
 * Verify Access Token
 * @param {String} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Access token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid access token');
        }
        throw error;
    }
};

/**
 * Verify Refresh Token
 * @param {String} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object from database
 * @returns {Object} Object containing accessToken and refreshToken
 */
const generateTokens = (user) => {
    const payload = {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin || false,
        isVerified: user.isVerified
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ _id: user._id.toString() });

    return { accessToken, refreshToken };
};

/**
 * Extract token from Authorization header or cookies
 * @param {Object} req - Express request object
 * @returns {String|null} JWT token or null
 */
const extractToken = (req) => {
    // Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.substring(7);
    }
    
    // Check cookies
    if (req.cookies && req.cookies.accessToken) {
        return req.cookies.accessToken;
    }
    
    return null;
};

/**
 * Extract refresh token from cookies or body
 * @param {Object} req - Express request object
 * @returns {String|null} JWT refresh token or null
 */
const extractRefreshToken = (req) => {
    // Check cookies first
    if (req.cookies && req.cookies.refreshToken) {
        return req.cookies.refreshToken;
    }
    
    // Check request body
    if (req.body && req.body.refreshToken) {
        return req.body.refreshToken;
    }
    
    return null;
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokens,
    extractToken,
    extractRefreshToken,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY
};
