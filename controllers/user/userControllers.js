import User from '../../models/userSchema.js';
import bcrypt from 'bcrypt';
import Product from '../../models/productSchema.js';
import { generateTokens } from '../../utils/jwt.js';
import * as emailService from '../../services/emailService.js';
import { getBestOfferForProduct } from '../../utils/offer.js';
import Banner from '../../models/bannerSchema.js';
import 'dotenv/config';

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
        res.render('/pageNotFound');
    }
};

export const loadLogin = async (req, res) => {
    try {
        res.render('user/login', {
            messages: req.flash() || { error: [], success: [] },
            email: ''
        });
    } catch (error) {
        console.error('Error loading login page:', error);
        req.flash('error', 'Failed to load login page');
        res.redirect('/pageNotFound');
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) {
            req.flash('error', 'Email is required');
            return res.redirect('/login');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            req.flash('error', 'Please enter a valid email address');
            return res.redirect('/login');
        }

        if (!password) {
            req.flash('error', 'Password is required');
            return res.redirect('/login');
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        if (user.isBlocked) {
            req.flash('error', 'Your account has been blocked');
            return res.redirect('/login');
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token in database
        user.refreshTokens = user.refreshTokens || [];
        user.refreshTokens.push({
            token: refreshToken,
            createdAt: new Date()
        });

        // Keep only last 5 refresh tokens
        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }

        await user.save();

        // Set tokens in HTTP-only cookies
        res.cookie('userAccessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('userRefreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Keep session for backward compatibility
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified
        };

        req.flash('success', `Welcome back, ${user.name}!`);
        return res.redirect('/');

    } catch (error) {
        console.error(`Login error for email ${req.body.email}:`, error);
        req.flash('error', 'An unexpected error occurred');
        return res.redirect('/login');
    }
};

export const loadSignup = async (req, res) => {
    try {
        res.render('user/signup', {
            messages: req.flash() || { error: [], success: [] },
        });
    } catch (error) {
        console.error('Error loading signup page:', error);
        res.redirect('/pageNotFound');
    }
};

export const signup = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;

        const errors = {};

        if (!name || !name.trim()) errors.name = 'Name is required';
        else if (!/^[a-zA-Z][a-zA-Z\s]*$/.test(name.trim())) errors.name = 'Name must start with a letter and contain only letters and spaces';
        else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters long';

        if (!email || !email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Invalid email format';

        if (!phone || !phone.trim()) errors.phone = 'Phone number is required';
        else if (!/^[6-9]\d{9}$/.test(phone.trim())) errors.phone = 'Phone number must start with 6-9 and be 10 digits';

        if (!password) errors.password = 'Password is required';
        else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
        else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password))
            errors.password = 'Password must contain uppercase, lowercase, number, and special character';

        if (!confirmPassword) errors.confirmPassword = 'Confirm password is required';
        else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, errors, message: 'Validation failed' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            errors.email = 'Email already registered';
            return res.status(400).json({ success: false, errors, message: 'Email already exists' });
        }

        const existingPhone = await User.findOne({ phone: phone.trim() });
        if (existingPhone) {
            errors.phone = 'Phone number already registered';
            return res.status(400).json({ success: false, errors, message: 'Phone already exists' });
        }

        const otp = generateOtp();
        console.log(`Generated OTP for ${email}: ${otp}`);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        const hashedPassword = await bcrypt.hash(password, 10);

        req.session.tempUser = {
            name: name.trim(),
            email: email.toLowerCase(),
            phone: phone.trim(),
            password: hashedPassword,
            otp,
            otpExpiry,
            resendCount: 0,
            isVerified: false,
            isBlocked: false,
        };

        const emailResult = await emailService.sendVerificationEmail(email.toLowerCase(), otp);
        if (!emailResult.success) {
            console.error(`Failed to send OTP to ${email}: ${emailResult.message}`);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to send verification email', 
                error: emailResult.message 
            });
        }

        console.log(`OTP sent successfully to ${email}`);
        console.log(otp)
        return res.status(200).json({
            success: true,
            message: process.env.NODE_ENV === 'development' ? `OTP sent to ${email}` : `OTP sent to ${email}`,
            redirect: '/verifyOtp',
            devOtp: process.env.NODE_ENV === 'development' ? otp : null
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'Server error during signup', error: error.message });
    }
};

export const loadverifyOtp = async (req, res) => {
    try {
        if (!req.session.tempUser) {
            console.error('No tempUser in session for verifyOtp page');
            return res.redirect('/signup');
        }
        res.render('verifyOtp', {
            email: req.session.tempUser.email,
            messages: req.flash() || { error: [], success: [] },
        });
    } catch (error) {
        console.error('verifyOtp page error:', error);
        res.redirect('/pageNotFound');
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const tempUser = req.session.tempUser;

        if (!tempUser) {
            console.error('No tempUser in session');
            return res.status(400).json({ success: false, message: 'Session expired. Please sign up again', redirect: '/signup' });
        }

        console.log(`Verifying OTP for ${tempUser.email}. Entered: ${otp}, Stored: ${tempUser.otp}`);

        if (!otp || otp.trim() !== tempUser.otp) {
            console.log('Invalid OTP entered');
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date() > new Date(tempUser.otpExpiry)) {
            console.log('OTP expired');
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        const newUser = new User({
            name: tempUser.name,
            email: tempUser.email,
            phone: tempUser.phone,
            password: tempUser.password,
            isVerified: true,
            isBlocked: false,
        });

        await newUser.save();
        console.log(`User ${newUser.email} saved successfully`);

        delete req.session.tempUser;

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(newUser);

        // Store refresh token in database
        newUser.refreshTokens = [{
            token: refreshToken,
            createdAt: new Date()
        }];
        await newUser.save();

        // Set tokens in HTTP-only cookies
        res.cookie('userAccessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('userRefreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Keep session for backward compatibility
        req.session.user = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            isVerified: true,
        };

        return res.status(200).json({
            success: true,
            message: `Welcome ${newUser.name}! Your account has been created successfully`,
            redirect: '/'
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({ success: false, message: 'Server error during verification', error: error.message });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const tempUser = req.session.tempUser;
        if (!tempUser) {
            console.error('No tempUser in session for resendOtp');
            return res.status(400).json({
                success: false,
                message: 'Session expired. Please sign up again',
                redirect: '/signup'
            });
        }

        const otp = generateOtp();
        console.log(`Generated new OTP for ${tempUser.email}: ${otp}`);
        
        // Rate limiting: Allow max 3 resends
        tempUser.resendCount = (tempUser.resendCount || 0) + 1;
        if (tempUser.resendCount > 3) {
            return res.status(429).json({
                success: false,
                message: 'Maximum resend attempts reached. Please sign up again.'
            });
        }

        tempUser.otp = otp;
        tempUser.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        req.session.tempUser = tempUser;

        console.log(`Attempting to resend OTP to ${tempUser.email} (Attempt: ${tempUser.resendCount}/3)`);
        const emailResult = await emailService.sendVerificationEmail(tempUser.email, otp);
        if (!emailResult.success) {
            console.error(`Failed to resend OTP to ${tempUser.email}: ${emailResult.message}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to resend OTP. Please try again.',
                error: emailResult.message
            });
        }

        console.log(`OTP resent successfully to ${tempUser.email}`);
        return res.status(200).json({
            success: true,
            message: process.env.NODE_ENV === 'development' ? `New Dev OTP: ${otp}` : `New OTP sent to ${tempUser.email}. Attempt ${tempUser.resendCount}/3`,
            devOtp: process.env.NODE_ENV === 'development' ? otp : null
        });
    } catch (error) {
        console.error('Resend OTP error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during OTP resend',
            error: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        // Clear JWT tokens from cookies
        res.clearCookie('userAccessToken');
        res.clearCookie('userRefreshToken');

        // Remove refresh token from database if user is logged in via JWT
        if (req.user && req.user._id) {
            const refreshToken = req.cookies?.userRefreshToken;
            if (refreshToken) {
                await User.findByIdAndUpdate(req.user._id, {
                    $pull: { refreshTokens: { token: refreshToken } }
                });
            }
        }

        // Destroy session for backward compatibility
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout Error:', err);
                return res.status(500).send('Logout failed');
            }
            res.redirect('/');
        });
    } catch (error) {
        console.log('Logout error', error);
        res.redirect('/pageNotFound');
    }
};

export const loadHomePage = async (req, res) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user._id);
            if (!user || user.isBlocked) {
                req.session.destroy(() => res.redirect('/login?error=blocked'));
                return;
            }
            req.session.user = user;
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch products with correct schema fields
        const newArrivalsData = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            createdAt: { $gte: sevenDaysAgo },
        }).populate('category').sort({ createdAt: -1 }).limit(8).lean();

        const featuredProductsData = await Product.find({
            "status.isDeleted": false,
            "status.isActive": true,
            "status.isFeatured": true
        }).populate('category').sort({ createdAt: -1 }).limit(8).lean();

        const topSellingProductsData = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            }).populate('category').sort({ salesCount: -1 }).limit(8).lean();

        const dealProductsData = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            $or: [
                { productOffer: { $gt: 0 } },
                { salePrice: { $lt: 1 } } // Placeholder, offer utility handles logic
            ]
        }).populate('category').limit(8).lean();

        // Enhance products with calculated offer details
        const enhanceProducts = async (products) => {
            return await Promise.all(products.map(async (product) => {
                const offerDetails = await getBestOfferForProduct(product);
                return { ...product, offerDetails };
            }));
        };

        const [newArrivals, featuredProducts, topSellingProducts, dealProducts] = await Promise.all([
            enhanceProducts(newArrivalsData),
            enhanceProducts(featuredProductsData),
            enhanceProducts(topSellingProductsData),
            enhanceProducts(dealProductsData)
        ]);

        // Fetch active banners
        const now = new Date();
        const activeBanners = await Banner.find({
            isActive: true,
            startDate: { $lte: now },
            $or: [
                { endDate: null },
                { endDate: { $gte: now } }
            ]
        }).sort({ priority: -1, createdAt: -1 }).limit(1).lean();

        res.render('user/home', {
            user: req.session.user || null,
            newArrivals,
            featuredProducts,
            topSellingProducts,
            dealProducts,
            banner: activeBanners[0] || null,
            messages: req.flash() || { error: [], success: [] },
        });
    } catch (error) {
        console.error('Error in loadHomePage:', error);
        res.redirect('/');
    }
};

export const loadAboutPage = async (req, res) => {
    try {
        res.render('user/about', {
            messages: req.flash() || { error: [], success: [] },
        });
    } catch (error) {
        console.error('Error loading about page:', error);
        res.redirect('/pageNotFound');
    }
};

export const loadContactPage = async (req, res) => {
    try {
        res.render('user/contact', {
            messages: req.flash() || { error: [], success: [] },
        });
    } catch (error) {
        console.error('Error loading contact page:', error);
        res.redirect('/pageNotFound');
    }
};

export const handleGoogleCallback = async (req, res) => {
    try {
        if (!req.user) {
            req.flash('error', 'Authentication failed. Please try again.');
            return res.redirect('/login');
        }

        const user = await User.findById(req.user._id);
        if (!user || user.isBlocked) {
            req.logout(err => {
                if (err) console.error('Logout error:', err);
                req.flash('error', 'Your account has been blocked');
                return res.redirect('/login');
            });
            return;
        }

        const { accessToken, refreshToken } = generateTokens(user);

        user.refreshTokens = user.refreshTokens || [];
        user.refreshTokens.push({
            token: refreshToken,
            createdAt: new Date()
        });

        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }

        await user.save();

        res.cookie('userAccessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('userRefreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
        };

        req.flash('success', `Welcome back, ${user.name}!`);
        const redirectUrl = process.env.CLIENT_URL || '/';
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error('Google callback error:', error);
        req.flash('error', 'Authentication failed. Please try again.');
        return res.redirect('/login');
    }
};


export const loadPassword = async (req, res) => {
    try {
        res.render('user/changePassword', {
            messages: req.flash() || { error: [], success: [] },
        });
    } catch (error) {
        console.error('Error loading change password page:', error);
        res.redirect('/pageNotFound');
    }
};

export const sendOTPForPasswordChange = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/changePassword');
        }

        const otp = generateOtp();
        user.resetPasswordOTP = {
            code: otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
        };
        await user.save();

        const emailResult = await emailService.sendVerificationEmail(email, otp);
        if (!emailResult.success) {
            console.error('Failed to send OTP email:', emailResult.message);
            req.flash('error', `Failed to send OTP: ${emailResult.message}`);
            return res.redirect('/changePassword');
        }

        req.flash('success', 'OTP sent to your email');
        return res.redirect('/changePassword');
    } catch (error) {
        console.error('Error sending OTP:', error);
        req.flash('error', 'Server error');
        return res.redirect('/changePassword');
    }
};

export const changePassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            req.flash('error', 'All fields are required');
            return res.redirect('/changePassword');
        }

        const user = await User.findOne({ email });
        if (!user || !user.resetPasswordOTP || user.resetPasswordOTP.code !== otp || user.resetPasswordOTP.expiresAt < Date.now()) {
            req.flash('error', 'Invalid or expired OTP');
            return res.redirect('/changePassword');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordOTP = undefined;
        await user.save();

        req.flash('success', 'Password changed successfully');
        return res.redirect('/changePassword');
    } catch (error) {
        console.error('Error changing password:', error);
        req.flash('error', 'Server error');
        return res.redirect('/changePassword');
    }
};