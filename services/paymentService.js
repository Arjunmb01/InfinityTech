const { createRazorpayInstance } = require('../config/razorpay');

/**
 * Initiates a refund through Razorpay
 * @param {string} paymentId - The Razorpay payment ID
 * @param {number} amount - The amount to refund (in INR)
 * @returns {Promise<object>} - The refund response from Razorpay
 */
exports.initiateRazorpayRefund = async (paymentId, amount) => {
    try {
        const razorpay = createRazorpayInstance();
        
        // Razorpay expects amount in paise
        const refundOptions = {
            amount: Math.round(amount * 100),
            speed: 'normal',
            notes: {
                reason: 'Order Return Refund'
            }
        };

        const refund = await razorpay.payments.refund(paymentId, refundOptions);
        return { success: true, refund };
    } catch (error) {
        console.error('Razorpay Refund Error:', error);
        return { success: false, error: error.message };
    }
};
