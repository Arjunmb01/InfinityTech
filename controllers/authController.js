import User from '../models/userSchema.js';
import { 
    verifyRefreshToken, 
    generateAccessToken, 
    extractRefreshToken 
} from '../utils/jwt.js';


export const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = extractRefreshToken(req);

        if (!refreshToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Refresh token not provided',
                requiresLogin: true
            });
        }


        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(401).json({ 
                success: false, 
                message: error.message,
                requiresLogin: true
            });
        }

        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found',
                requiresLogin: true
            });
        }


        if (user.isBlocked) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your account has been blocked',
                requiresLogin: true
            });
        }

        const tokenExists = user.refreshTokens?.some(
            rt => rt.token === refreshToken
        );

        if (!tokenExists) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid refresh token',
                requiresLogin: true
            });
        }

        // Generate new access token
        const payload = {
            _id: user._id.toString(),
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin || false,
            isVerified: user.isVerified
        };

        const accessToken = generateAccessToken(payload);

        // Set new access token in cookie
        res.cookie('userAccessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Access token refreshed successfully',
            accessToken: accessToken // Also return in response for API clients
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Revoke Refresh Token (Logout from specific device)
 */
export const revokeRefreshToken = async (req, res) => {
    try {
        const refreshToken = extractRefreshToken(req);

        if (!refreshToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'Refresh token not provided'
            });
        }

        // Verify and decode token
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid refresh token'
            });
        }

        // Remove refresh token from database
        await User.findByIdAndUpdate(decoded._id, {
            $pull: { refreshTokens: { token: refreshToken } }
        });

        // Clear cookies
        res.clearCookie('userAccessToken');
        res.clearCookie('userRefreshToken');

        return res.status(200).json({ 
            success: true, 
            message: 'Token revoked successfully'
        });

    } catch (error) {
        console.error('Revoke token error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Revoke All Refresh Tokens (Logout from all devices)
 */
export const revokeAllRefreshTokens = async (req, res) => {
    try {
        const userId = req.user?._id || req.tokenPayload?._id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated',
                requiresLogin: true
            });
        }

        // Clear all refresh tokens
        await User.findByIdAndUpdate(userId, {
            $set: { refreshTokens: [] }
        });

        // Clear cookies
        res.clearCookie('userAccessToken');
        res.clearCookie('userRefreshToken');

        return res.status(200).json({ 
            success: true, 
            message: 'All tokens revoked successfully. Logged out from all devices.'
        });

    } catch (error) {
        console.error('Revoke all tokens error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Verify Token Status
 */
export const verifyToken = async (req, res) => {
    try {
        // If middleware passed, user is authenticated
        return res.status(200).json({ 
            success: true, 
            user: {
                _id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                isAdmin: req.user.isAdmin,
                isVerified: req.user.isVerified
            }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};
