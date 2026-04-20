const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Create Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Standardizes the response format for all email functions
 */
const responseHandler = (success, message) => ({ success, message });

/**
 * Send Verification OTP via Nodemailer
 */
const sendVerificationEmail = async (email, otp) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('-----------------------------------------');
            console.log('📧 DEVELOPMENT MODE: EMAIL LOG');
            console.log(`TYPE: VERIFICATION OTP`);
            console.log(`TO: ${email}`);
            console.log(`CODE: ${otp}`);
            console.log('-----------------------------------------');
            // We return success true so the dev can proceed, 
            // but we don't attempt to send a real email unless requested.
            // If the user wants to test real nodemailer, they can set NODE_ENV=production
        }

        const mailOptions = {
            from: `"InfinityTech" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your InfinityTech Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #6366f1; text-align: center;">InfinityTech</h2>
                    <p>Hello,</p>
                    <p>Thank you for joining InfinityTech! Use the verification code below to complete your registration:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background: #f3f4f6; padding: 10px 30px; border-radius: 8px;">${otp}</span>
                    </div>
                    <p>This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 InfinityTech. All rights reserved.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent:', info.messageId);
        return responseHandler(true, 'Verification email sent successfully');
    } catch (error) {
        console.error('Nodemailer Error (Verification):', error);
        return responseHandler(false, error.message);
    }
};

/**
 * Send Password Reset OTP
 */
const sendResetEmail = async (email, otp) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('-----------------------------------------');
            console.log('📧 DEVELOPMENT MODE: EMAIL LOG');
            console.log(`TYPE: PASSWORD RECOVERY`);
            console.log(`TO: ${email}`);
            console.log(`CODE: ${otp}`);
            console.log('-----------------------------------------');
        }

        const mailOptions = {
            from: `"InfinityTech Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Recovery Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #6366f1; text-align: center;">Password Recovery</h2>
                    <p>We received a request to reset your password. Use the code below to proceed:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; background: #fef2f2; padding: 10px 30px; border-radius: 8px;">${otp}</span>
                    </div>
                    <p>This code is valid for 10 minutes. If you did not request a password reset, please secure your account immediately.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 InfinityTech. InfinityTech Support Team.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset email sent:', info.messageId);
        return responseHandler(true, 'Recovery email sent successfully');
    } catch (error) {
        console.error('Nodemailer Error (Reset):', error);
        return responseHandler(false, error.message);
    }
};

/**
 * Send Order Confirmation
 */
const sendOrderConfirmationEmail = async (email, order) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('-----------------------------------------');
            console.log('📧 DEVELOPMENT MODE: EMAIL LOG');
            console.log(`TYPE: ORDER CONFIRMATION`);
            console.log(`TO: ${email}`);
            console.log(`ORDER ID: ${order._id}`);
            console.log(`AMOUNT: ₹${order.totalPrice}`);
            console.log('-----------------------------------------');
        }

        const mailOptions = {
            from: `"InfinityTech Orders" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Order Confirmation - InfinityTech',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #10b981; text-align: center;">Order Confirmed!</h2>
                    <p>Hello,</p>
                    <p>Your order <strong>#${order._id}</strong> has been successfully placed.</p>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${order.totalPrice}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status}</p>
                        <p style="margin: 5px 0;"><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</p>
                    </div>
                    <p>Thank you for shopping with InfinityTech!</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 InfinityTech Store.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Order confirmation sent:', info.messageId);
        return responseHandler(true, 'Order confirmation sent successfully');
    } catch (error) {
        console.error('Nodemailer Error (Order):', error);
        return responseHandler(false, error.message);
    }
};

module.exports = {
    sendVerificationEmail,
    sendResetEmail,
    sendOrderConfirmationEmail
};
