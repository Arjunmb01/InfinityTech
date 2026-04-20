const { verifyAccessToken, extractToken } = require("../utils/jwt");

exports.isAdmin = async (req, res, next) => {
    try {
        const token = extractToken(req);

        const unauthorized = () => {
            if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                return res.status(401).json({ success: false, message: 'Session expired. Please login again.', redirect: '/admin/login' });
            }
            return res.redirect('/admin/login');
        };

        if (token) {
            try {
                const decoded = verifyAccessToken(token);
                if (decoded.isAdmin) {
                    req.admin = decoded;
                    return next();
                } else {
                    return unauthorized();
                }
            } catch (error) {
                // Token invalid, try session
            }
        }

        // Fallback to session
        if (req.session && req.session.admin) {
            next();
        } else {
            unauthorized();
        }
    } catch (error) {
        console.log(error);
        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(401).json({ success: false, message: 'Authentication error', redirect: '/admin/login' });
        }
        res.redirect('/admin/login');
    }
};

exports.isLogout = (req, res, next) => {
    try {
        const token = extractToken(req);

        if (token) {
            try {
                const decoded = verifyAccessToken(token);
                if (decoded.isAdmin) {
                    return res.redirect('/admin/dashboard');
                }
            } catch (error) {
                // Token invalid, continue
            }
        }

        // Fallback to session
        if (req.session && req.session.admin) {
            res.redirect('/admin/dashboard');
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        next();
    }
};