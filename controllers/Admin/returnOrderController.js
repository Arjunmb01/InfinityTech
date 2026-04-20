const Return = require('../../models/returnSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');

// Helper function to calculate refund amount with shipping and coupon distribution
const calculateRefundAmount = (order, items) => {
    const totalItemsPrice = order.products.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const couponDiscount = order.couponDiscount || 0;
    const shippingCharge = order.shippingCharge || 0;
    
    let refundAmount = 0;

    if (totalItemsPrice === 0) return 0;

    items.forEach(item => {
        const product = order.products.find(p => p.productId.toString() === item.productId.toString());
        if (product) {
            const itemPrice = product.totalPrice || 0;
            const proportionalShipping = (itemPrice / totalItemsPrice) * shippingCharge;
            const proportionalCoupon = (itemPrice / totalItemsPrice) * couponDiscount;
            // The refund is the item price plus its share of shipping minus its share of discount
            const itemRefund = itemPrice + proportionalShipping - proportionalCoupon;
            refundAmount += itemRefund;
        }
    });

    return Math.max(0, Math.round(refundAmount * 100) / 100); // Standardize to 2 decimal places
};

// Get all return requests
exports.getReturnRequests = async (req, res) => {
    try {
        const returnRequests = await Return.find()
            .populate({
                path: 'orderId',
                populate: { path: 'user', select: 'name email' }
            })
            .populate('items.productId');

        const formattedRequests = returnRequests.map(request => ({
            ...request._doc,
            orderId: request.orderId ? request.orderId._id : null,
            items: request.items.map(item => ({
                ...item._doc,
                productDetails: {
                    name: item.productId?.name || 'Unknown',
                    price: item.productId?.price || 0,
                    image: (item.productId?.images && item.productId.images[0]?.url) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600'
                },
                valid: !!item.productId
            })),
            returnStatus: request.status
        }));

        const formatPrice = price => `₹${price.toFixed(2)}`;

        res.render('admin/returnOrder', { 
            returnRequests: formattedRequests, 
            path: '/admin/return/requests',
            formatPrice
        });
    } catch (error) {
        console.error('Error fetching return requests:', error);
        res.status(500).render('admin/pageerror', { message: 'Failed to load return requests' });
    }
};

// Get specific return request details
exports.getReturnRequestDetails = async (req, res) => {
    try {
        const returnId = req.params.id;
        const returnRequest = await Return.findById(returnId)
            .populate({
                path: 'orderId',
                populate: [
                    { path: 'user', select: 'name email phone' },
                    { path: 'products.productId' }
                ]
            })
            .populate('items.productId');

        if (!returnRequest) throw new Error('Return request not found');

        const formattedRequest = {
            ...returnRequest._doc,
            orderId: returnRequest.orderId ? returnRequest.orderId : null,
            returnStatus: returnRequest.status || 'Pending', // Map status to returnStatus, fallback to 'Pending'
            items: returnRequest.items.map(item => ({
                ...item._doc,
                productDetails: {
                    name: item.productId?.name || 'Unknown',
                    price: item.productId?.price || 0,
                    image: (item.productId?.images && item.productId.images[0]?.url) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600'
                },
                valid: !!item.productId
            }))
        };

        // Define helper functions
        const formatDate = date => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const formatPrice = price => `₹${price.toFixed(2)}`;
        const getStatusColor = status => {
            const safeStatus = (status || 'Pending').toLowerCase(); // Fallback to 'Pending' if status is undefined
            switch (safeStatus) {
                case 'pending': return 'status-pending';
                case 'approved': return 'status-approved';
                case 'rejected': return 'status-rejected';
                default: return 'bg-gray-600 text-gray-200'; // Fallback for unexpected values
            }
        };

        res.render('admin/returnDetails', {
            returnRequest: formattedRequest,
            formatDate,
            formatPrice,
            getStatusColor
        });
    } catch (error) {
        console.error('Error fetching return details:', error);
        res.status(404).render('admin/pageerror', { message: 'Return request not found' });
    }
};

// Approve return request
exports.approveReturnRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const returnId = req.params.id;
        console.log(`[Admin] Starting approval for return request: ${returnId}`);

        const returnRequest = await Return.findById(returnId);
        if (!returnRequest) {
            throw new Error('Return request not found in database');
        }
        if (returnRequest.status !== 'Pending') {
            throw new Error(`Return request already processed. Current status: ${returnRequest.status}`);
        }

        const order = await Order.findById(returnRequest.orderId);
        if (!order) {
            throw new Error(`Associated order ${returnRequest.orderId} not found`);
        }

        const refundAmount = calculateRefundAmount(order, returnRequest.items);
        console.log(`[Admin] Calculated refund amount: ₹${refundAmount}`);
        
        if (isNaN(refundAmount)) {
            throw new Error('Refund calculation resulted in NaN');
        }

        // Identify user for wallet update - use returnRequest.user with fallback to order.userId/order.user
        const targetUserId = returnRequest.user || order.userId || order.user;
        if (!targetUserId) {
            throw new Error('Could not identify user for refund');
        }

        returnRequest.status = 'Approved';
        returnRequest.refundedAmount = refundAmount;

        returnRequest.items.forEach(item => {
            const productIndex = order.products.findIndex(p => p.productId.toString() === item.productId.toString());
            if (productIndex === -1) {
                console.warn(`[Admin] Product ${item.productId} not found in order ${order._id}`);
            } else {
                order.products[productIndex].status = 'Returned';
            }
        });

        order.orderAmount = Math.max(0, Math.round((order.orderAmount - refundAmount) * 100) / 100);

        // Update overall order status if everything is returned
        if (order.products.every(p => p.status === 'Returned' || p.status === 'Cancelled')) {
            order.status = 'Returned';
            order.orderStatus = 'Returned';
        }

        console.log(`[Admin] Updating wallet for user ${targetUserId} with ₹${refundAmount}`);
        const walletUpdate = await Wallet.findOneAndUpdate(
            { userId: targetUserId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        amount: refundAmount,
                        type: 'credit',
                        description: `Refund for approved return #${returnId}`,
                        date: new Date()
                    }
                }
            },
            { upsert: true, new: true, session }
        );
        
        if (!walletUpdate) {
            throw new Error('Failed to update or create user wallet');
        }

        await Promise.all([
            returnRequest.save({ session }), 
            order.save({ session })
        ]);

        await session.commitTransaction();
        console.log(`[Admin] Return approval successful for ${returnId}`);
        res.json({ success: true, message: 'Return approved and refund processed successfully.' });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error approving return:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to approve return' });
    } finally {
        session.endSession();
    }
};

// Reject return request
exports.rejectReturnRequest = async (req, res) => {
    try {
        const returnId = req.params.id;
        console.log(`[Admin] Rejecting return request: ${returnId}`);

        const returnRequest = await Return.findById(returnId);
        if (!returnRequest || returnRequest.status !== 'Pending') {
            throw new Error('Invalid return request or already processed');
        }

        const order = await Order.findById(returnRequest.orderId);
        if (!order) {
            throw new Error('Associated order not found');
        }

        returnRequest.status = 'Rejected';
        returnRequest.items.forEach(item => {
            const productIndex = order.products.findIndex(p => p.productId.toString() === item.productId.toString());
            if (productIndex !== -1 && order.products[productIndex].status === 'Return Requested') {
                order.products[productIndex].status = 'Ordered';
            }
        });

        await Promise.all([returnRequest.save(), order.save()]);
        console.log(`[Admin] Return rejection successful for ${returnId}`);
        res.json({ success: true, message: 'Return request rejected.' });
    } catch (error) {
        console.error('Error rejecting return:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to reject return' });
    }
};

module.exports = exports;