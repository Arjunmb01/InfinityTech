const express = require('express');
const router = express.Router();

const userController = require('../controllers/user/userControllers');
const profileController = require('../controllers/user/userProfileController');
const productController = require('../controllers/user/productController');
const addressController = require('../controllers/user/addressController');
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkOutController');
const orderController = require('../controllers/user/orderController');
const passwordController = require('../controllers/user/password');
const wishlist = require('../controllers/user/wishlistController');
const walletController = require('../controllers/user/walletController');
const paymentController = require('../controllers/user/paymentController');
const authController = require('../controllers/authController');

const { isAuthenticated, isNotAuthenticated, auth, authMiddleware } = require('../middleware/auth');
const passport = require('passport');

// JWT Token Management Routes
router.post('/api/auth/refresh-token', authController.refreshAccessToken);
router.post('/api/auth/revoke-token', authController.revokeRefreshToken);
router.post('/api/auth/revoke-all-tokens', authMiddleware, authController.revokeAllRefreshTokens);
router.get('/api/auth/verify', authMiddleware, authController.verifyToken);

// Authentication routes
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.get('/login', isAuthenticated, userController.loadLogin);
router.post('/login', isAuthenticated, userController.login);
router.get('/verifyOtp', userController.loadverifyOtp);
router.post('/verifyOtp', userController.verifyOtp);
router.post('/resendOtp', userController.resendOtp);
router.get('/logout', userController.logout);

// Google Authentication Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    userController.handleGoogleCallback
);

router.get('/changePassword', userController.loadPassword);
router.post('/send-password-otp', userController.sendOTPForPasswordChange);
router.post('/change-password', userController.changePassword);
router.post('/changePasswordresendOtp', userController.resendOtp);

router.get('/forgotPassword', passwordController.getForgotPasswordPage);
router.post('/forgotPassword', passwordController.forgotPassword);
router.get('/forgotOtp', passwordController.getVerifyOTP);
router.post('/forgotOtp', passwordController.verifyOTP);
router.post('/forgotOtp/resend', passwordController.resendForgotOtp);
router.get('/resetPassword', passwordController.getResetPassword);
router.post('/resetPassword', passwordController.resetPassword);

// Product routes
router.get('/', userController.loadHomePage);
router.get('/shop', productController.loadShop);
router.get('/product/:id', auth, productController.getSingleProduct);
router.get('/api/products', productController.getProducts); // Advanced listing API
router.get('/api/products/featured', productController.getFeaturedProducts); // Featured products API
router.get('/categories', auth, productController.getAllCategories);
router.get('/category/:id', productController.getCategoryProducts);
router.get('/search', productController.searchProducts);
router.get('/api/product/stock/:productId', auth, productController.getProductStock);

// Cart routes
router.get('/cart', auth, cartController.getCart);
router.post('/api/cart/add', auth, cartController.addToCart);
router.put('/cart/update/:productId', auth, cartController.updateCartQuantity);
router.delete('/cart/remove/:productId', auth, cartController.removeFromCart);
router.get('/api/cart/count', cartController.getCartCount);

// Checkout routes
router.get('/checkout', auth, checkoutController.renderCheckout);
router.post('/checkout/place-order', auth, checkoutController.initiateCheckout);
router.post('/checkout/create-razorpay-order', auth, checkoutController.createRazorpayOrder);
router.post('/verify-payment', auth, checkoutController.verifyPayment);
router.get('/order-success', auth, checkoutController.showOrderSuccess);
router.post('/checkout/pending-order', auth, checkoutController.savePendingOrder);
router.patch('/retry-payment/:orderId', auth, checkoutController.retryPayment);
router.get('/orders/:orderId/invoice', auth, checkoutController.downloadInvoice);
router.post('/apply-coupon', auth, checkoutController.applyCoupon); // New route for applying coupons

// Order routes
router.get('/orders', auth, orderController.getOrdersList);
router.get('/orders/:id', auth, orderController.getOrderDetails);
router.put('/api/orders/:id/cancel', auth, orderController.cancelOrder);
router.put('/api/orders/:id/return', auth, orderController.returnOrder);
router.put('/api/orders/:id/cancel-product/:productId', auth, orderController.cancelProduct);
router.put('/api/orders/:id/return-product/:productId', auth, orderController.requestReturn);

// Static pages
router.get('/about', userController.loadAboutPage);
router.get('/contact', userController.loadContactPage);

// Profile management
router.get('/profile', auth, profileController.loadProfile);
router.get('/edit-profile', auth, profileController.getEditProfile);
router.post('/edit-profile', auth, profileController.postEditProfile);

// Address Management
router.get('/address', addressController.getAddress);
router.post('/add-address', addressController.addAddress);
router.get('/edit-address/:id', addressController.editAddress);
router.post('/edit-address/:id', addressController.updateAddress);
router.post('/set-default-address/:id', addressController.setDefaultAddress);
router.delete('/delete-address/:id', addressController.deleteAddress);

// Wishlist
router.get('/wishlist', auth, wishlist.getWishlist);
router.post('/api/wishlist/toggle', auth, wishlist.toggleWishlist);
router.post('/api/wishlist/add', auth, wishlist.addToWishlist); // New specific add route
router.delete('/api/wishlist/remove/:productId', auth, wishlist.removeFromWishlist); // Updated for consistency
router.get('/api/wishlist/count', wishlist.getWishlistCount);
router.get('/api/user/wishlist/products', auth, wishlist.getWishlistProductIds);

// Wallet Management
router.get('/wallet', auth, walletController.getWallet);
router.get('/wallet/history', auth, walletController.getTransactionHistory);

module.exports = router;