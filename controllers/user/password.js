import User from '../../models/userSchema.js';
import bcrypt from 'bcrypt';
import * as emailService from '../../services/emailService.js';

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getForgotPasswordPage = (req, res) => {
    res.render('user/forgotPassword', { 
        title: 'Forgot Password',
        messages: req.flash() || { error: [], success: [] }
    });
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Processing forgot password for email:', email);

        // Backend Validation
        if (!email) {
            req.flash('error', 'Email is required');
            return res.redirect('/forgotPassword');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            req.flash('error', 'Please enter a valid email address');
            return res.redirect('/forgotPassword');
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('success', 'If an account exists with this email, you will receive reset instructions.');
            return res.redirect('/forgotPassword');
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        user.resetPasswordOTP = { code: otp, expiresAt: otpExpiry };
        await user.save();

        req.session.forgotPasswordResendCount = 0; // Initialize resend count

        const emailResult = await emailService.sendResetEmail(email, otp);
        if (!emailResult.success) {
            req.flash('error', `Failed to send OTP: ${emailResult.message}`);
            return res.redirect('/forgotPassword');
        }

        req.flash('success', 'OTP sent to your email');
        return res.redirect(`/forgotOtp?email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'Server error. Please try again later.');
        return res.redirect('/forgotPassword');
    }
};

export const getVerifyOTP = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            req.flash('error', 'Invalid request. Please start over.');
            return res.redirect('/forgotPassword');
        }
        res.render('user/forgotOtp', { 
            email,
            messages: req.flash() || { error: [], success: [] }
        });
    } catch (error) {
        console.error('Error loading OTP verification page:', error);
        req.flash('error', 'Server error');
        return res.redirect('/forgotPassword');
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        console.log('Verifying OTP:', otp, 'for email:', email);

        if (!email || !otp) {
            req.flash('error', 'Email and OTP are required');
            return res.redirect(`/forgotOtp?email=${encodeURIComponent(email)}`);
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/forgotPassword');
        }

        if (!user.resetPasswordOTP?.code || !user.resetPasswordOTP?.expiresAt) {
            req.flash('error', 'No OTP request found');
            return res.redirect(`/forgotOtp?email=${encodeURIComponent(email)}`);
        }

        if (new Date() > user.resetPasswordOTP.expiresAt) {
            user.resetPasswordOTP = { code: null, expiresAt: null };
            await user.save();
            req.flash('error', 'OTP has expired');
            return res.redirect(`/forgotOtp?email=${encodeURIComponent(email)}`);
        }

        if (user.resetPasswordOTP.code !== otp) {
            req.flash('error', 'Invalid OTP');
            return res.redirect(`/forgotOtp?email=${encodeURIComponent(email)}`);
        }

        req.flash('success', 'OTP verified successfully');
        return res.redirect(`/resetPassword?email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error('OTP verification error:', error);
        req.flash('error', 'Internal server error');
        return res.redirect(`/forgotOtp?email=${encodeURIComponent(req.body.email)}`);
    }
};

export const getResetPassword = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            req.flash('error', 'Invalid request. Please start over.');
            return res.redirect('/forgotPassword');
        }
        res.render('user/resetPassword', { 
            email,
            messages: req.flash() || { error: [], success: [] }
        });
    } catch (error) {
        console.error('Error loading reset password page:', error);
        req.flash('error', 'Server error');
        return res.redirect('/forgotPassword');
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect(`/resetPassword?email=${encodeURIComponent(email)}`);
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/forgotPassword');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.password = hashedPassword;
        user.resetPasswordOTP = { code: null, expiresAt: null };
        await user.save();

        req.flash('success', 'Password reset successful');
        return res.redirect('/login');
    } catch (error) {
        console.error('Password reset error:', error);
        req.flash('error', 'Internal server error');
        return res.redirect(`/resetPassword?email=${encodeURIComponent(req.body.email)}`);
    }
};

export const resendForgotOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Rate limiting: Max 3 resends
        req.session.forgotPasswordResendCount = (req.session.forgotPasswordResendCount || 0) + 1;
        if (req.session.forgotPasswordResendCount > 3) {
            return res.status(429).json({
                success: false,
                message: 'Maximum resend attempts reached. Please start over.'
            });
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.resetPasswordOTP = { code: otp, expiresAt: otpExpiry };
        await user.save();

        console.log(`Resending password recovery OTP to ${email} (Attempt: ${req.session.forgotPasswordResendCount}/3)`);
        const emailResult = await emailService.sendResetEmail(email, otp);
        
        if (!emailResult.success) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to resend OTP', 
                error: emailResult.message 
            });
        }

        return res.status(200).json({
            success: true,
            message: `Recovery code resent to ${email}. Attempt ${req.session.forgotPasswordResendCount}/3`
        });

    } catch (error) {
        console.error('Resend Forgot OTP error:', error);
        return res.status(500).json({ success: false, message: 'Server error during resend' });
    }
};
