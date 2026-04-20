
const User = require("../models/userSchema");
const { verifyAccessToken, extractToken } = require("../utils/jwt");

// For rendering pages - checks if JWT exists
exports.isAuthenticated = (req, res, next) => {
    const token = extractToken(req);
    if (token) {
        try {
            const decoded = verifyAccessToken(token);
            req.user = decoded;
            return res.redirect("/");
        } catch (error) {
            // Token invalid or expired, continue
        }
    }
    
    // Fallback to session for backward compatibility
    if (req.session && req.session.user) {
        return res.redirect("/");
    }
    
    next();
};

exports.isNotAuthenticated = (req, res, next) => {
    const token = extractToken(req);
    if (token) {
        try {
            const decoded = verifyAccessToken(token);
            req.user = decoded;
            return next();
        } catch (error) {
            // Token invalid, continue to session check
        }
    }
    
    // Fallback to session for backward compatibility
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    next();
};




exports.authMiddleware = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            // Try session fallback
            const userID = req.session?.user?._id;
            if (!userID) {
                if (req.session) {
                    req.session.destroy(() => res.redirect('/login'));
                } else {
                    return res.redirect('/login');
                }
                return;
            }
            
            const user = await User.findById(userID);
            if (!user) {
                req.session.destroy(() => res.redirect('/login'));
                return;
            }
            
            if (user.isBlocked) {
                req.session.destroy(() => res.redirect('/login?error=blocked'));
                return;
            }
            
            req.user = user;
            return next();
        }

        // Verify JWT token
        const decoded = verifyAccessToken(token);
        
        // Fetch user from database
        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({ 
                message: "User not found", 
                requiresLogin: true 
            });
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({ 
                message: "Your account has been blocked", 
                requiresLogin: true 
            });
        }

        req.user = user;
        req.tokenPayload = decoded; // Store decoded token data
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        
        if (error.message === 'Access token expired') {
            return res.status(401).json({ 
                message: "Token expired. Please refresh your token.", 
                tokenExpired: true 
            });
        }
        
        if (error.message === 'Invalid access token') {
            return res.status(401).json({ 
                message: "Invalid token", 
                requiresLogin: true 
            });
        }
        
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.auth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            // Fallback to session
            if (!req.session || !req.session.user) {
                return res.redirect('/login');
            }
            
            const user = await User.findById(req.session.user._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            
            req.user = user;
            return next();
        }

        // Verify JWT
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = user;
        req.tokenPayload = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.message === 'Access token expired') {
            return res.status(401).json({ 
                message: "Token expired", 
                tokenExpired: true 
            });
        }
        
        res.status(500).json({ message: "Internal server error" });
    }
};