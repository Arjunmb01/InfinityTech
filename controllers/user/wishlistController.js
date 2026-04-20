const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const { getBestOfferForProduct } = require('../../utils/offer');

/**
 * @desc Get User Wishlist
 */
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        if (!userId) return res.redirect('/login');

        let wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'products',
            select: 'name images price productOffer category status stock'
        });

        if (!wishlist) {
            wishlist = { products: [] };
        }

        const wishlistItems = await Promise.all(wishlist.products.map(async (product) => {
            const offerDetails = await getBestOfferForProduct(product);
            return { product, offerDetails };
        }));

        res.render('user/wishlist', {
            wishlistItems,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).render('error', {
            message: 'Failed to load wishlist. Please try again later.',
            user: req.session.user
        });
    }
};

/**
 * @desc Add to Wishlist
 */
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const { productId } = req.body;

        if (!userId) return res.status(401).json({ success: false, message: 'Please log in' });

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, userId: userId, products: [] });
        }

        if (wishlist.products.includes(productId)) {
            return res.status(400).json({ success: false, message: 'Product already in wishlist' });
        }

        wishlist.products.push(productId);
        await wishlist.save();

        res.status(200).json({ success: true, message: 'Added to wishlist', wishlistCount: wishlist.products.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Remove from Wishlist
 */
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const { productId } = req.params;

        if (!userId) return res.status(401).json({ success: false, message: 'Please log in' });

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();

        res.status(200).json({ success: true, message: 'Removed from wishlist', wishlistCount: wishlist.products.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Toggle Wishlist (for UI convenience)
 */
exports.toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const { productId } = req.body;

        if (!userId) return res.status(401).json({ success: false, message: 'Please log in' });

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, userId: userId, products: [] });
        }

        const index = wishlist.products.indexOf(productId);
        let action = 'added';
        if (index > -1) {
            wishlist.products.splice(index, 1);
            action = 'removed';
        } else {
            wishlist.products.push(productId);
        }

        await wishlist.save();
        res.status(200).json({ 
            success: true, 
            message: `Product ${action} successfully`, 
            action, 
            wishlistCount: wishlist.products.length 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getWishlistProductIds = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        if (!userId) return res.json({ wishlistItems: [] });

        const wishlist = await Wishlist.findOne({ userId }).select('products');
        res.json({ success: true, wishlistItems: wishlist ? wishlist.products : [] });
    } catch (error) {
        res.status(500).json({ success: false, wishlistItems: [] });
    }
};

exports.getWishlistCount = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        if (!userId) return res.json({ success: true, count: 0 });

        const wishlist = await Wishlist.findOne({ userId });
        res.json({ success: true, count: wishlist ? wishlist.products.length : 0 });
    } catch (error) {
        res.status(500).json({ success: false, count: 0 });
    }
};