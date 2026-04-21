// adminRouter.js
import express from 'express';
const router = express.Router();

import * as adminControllers from '../controllers/Admin/adminController.js';
import * as customerController from '../controllers/Admin/customerController.js';
import * as categoryController from '../controllers/Admin/categoryController.js';
import * as productController from '../controllers/Admin/productController.js';
import * as orderController from '../controllers/Admin/orderControllers.js';
import * as offerController from '../controllers/Admin/offerController.js';
import * as couponController from '../controllers/Admin/couponController.js';
import * as returnController from '../controllers/Admin/returnOrderController.js';
import * as bannerController from '../controllers/Admin/bannerController.js';
import { upload, handleMulterError } from '../config/cloudinary.js';
import * as admin from '../middleware/adminAuth.js';

// Admin Authentication Routes
router.get('/pageerror', adminControllers.pageerror);
router.get('/login', admin.adminGuest, adminControllers.loadLogin);
router.post('/login', admin.adminGuest, adminControllers.login);
router.get('/dashboard', admin.adminAuth, adminControllers.loadDashboard);
router.get('/logout', adminControllers.logout);

// Sales Report Routes (API Endpoints Only)
router.get('/sales-report/data', admin.adminAuth, adminControllers.getSalesReport);
router.get('/sales-report/download', admin.adminAuth, adminControllers.downloadSalesReport);
router.get('/top-sellers', admin.adminAuth, adminControllers.getTopSellers);
router.get('/detailed-orders', admin.adminAuth, adminControllers.getDetailedOrders);

// Coupon Application Route
router.post('/apply-coupon', admin.adminAuth, adminControllers.applyCouponToOrder);

// User Management Routes
router.get('/users', admin.adminAuth, customerController.customerInfo);
router.put('/users/block/:id', admin.adminAuth, customerController.blockUser);

// Category Management Routes
router.get('/categories', admin.adminAuth, categoryController.categoryInfo);
router.get('/categories/:id', admin.adminAuth, categoryController.getCategoryDetails);
router.get('/addCategory', admin.adminAuth, categoryController.loadCategory);
router.post('/addCategory', admin.adminAuth, categoryController.addCategory);
router.get('/editCategory/:id', admin.adminAuth, categoryController.loadEditCategory);
router.put('/updateCategory/:id', admin.adminAuth, categoryController.updateCategory);
router.put('/toggleCategoryStatus/:id', admin.adminAuth, categoryController.toggleCategoryStatus);

// Product Management 
router.get('/products', admin.adminAuth, productController.loadProduct);
router.get('/addProduct', admin.adminAuth, productController.loadAddProduct);
router.post('/addProduct', admin.adminAuth, upload, handleMulterError, productController.addProduct);
router.get('/editProduct/:id', admin.adminAuth, productController.loadEditProduct);
router.post('/editProduct/:id', admin.adminAuth, upload, handleMulterError, productController.updateProduct);
router.post('/replaceProductImage/:productId', admin.adminAuth, upload, handleMulterError, productController.replaceProductImage);
router.post('/products/:id/toggle-list', admin.adminAuth, productController.toggleListStatus);
router.post('/products/:id/list', admin.adminAuth, productController.listProduct); // Explicit list
router.post('/products/:id/unlist', admin.adminAuth, productController.unlistProduct); // Explicit unlist
router.post('/products/:id/toggle-featured', admin.adminAuth, productController.toggleFeaturedStatus);
router.post('/softDeleteProduct/:id', admin.adminAuth, productController.softDeleteProduct);
router.post('/removeProductImage/:productId', admin.adminAuth, productController.removeProductImage);

// Order Management
router.get('/orders', admin.adminAuth, orderController.getOrders);
router.patch('/orders/:orderId/status', admin.adminAuth, orderController.toggleOrderStatus); // Standard status update
router.patch('/orders/:orderId/payment-status', admin.adminAuth, orderController.updatePaymentStatus);
router.patch('/orders/:orderId/product-status', admin.adminAuth, orderController.updateProductStatus);
router.get('/orders/:orderId', admin.adminAuth, orderController.viewOrderDetails);
router.post('/orders/:orderId/cancel-product', admin.adminAuth, orderController.cancelProduct);
router.post('/orders/:orderId/return-product', admin.adminAuth, orderController.returnProduct);
router.post('/orders/:orderId/approve-return', admin.adminAuth, orderController.approveReturn);

// Offer Management
router.get('/offers', admin.adminAuth, offerController.getAllOffers);
router.get('/offers/add', admin.adminAuth, offerController.getAddOffer);
router.post('/offers/add', admin.adminAuth, offerController.postAddOffer);
router.get('/offers/edit/:id', admin.adminAuth, offerController.getEditOffer);
router.post('/offers/edit/:id', admin.adminAuth, offerController.postEditOffer);
router.patch('/offers/toggle/:id', admin.adminAuth, offerController.toggleOfferStatus);

// Coupon Management
router.get('/coupons', admin.adminAuth, couponController.getAllCoupon);
router.get('/add-coupon', admin.adminAuth, couponController.getCreateCouponForm);
router.post('/addCoupon', admin.adminAuth, couponController.postCreateCoupon);
router.get('/editCoupon/:Id', admin.adminAuth, couponController.getEditCouponForm);
router.post('/editCoupon/:Id', admin.adminAuth, couponController.updateCoupon);
router.get('/deleteCoupon/:Id', admin.adminAuth, couponController.deleteCoupon);
router.delete('/deleteCoupon/:Id', admin.adminAuth, couponController.deleteCoupon);

// Return Request Management
router.get('/return/requests', admin.adminAuth, returnController.getReturnRequests);
router.post('/return/approve/:id', admin.adminAuth, returnController.approveReturnRequest);
router.post('/return/reject/:id', admin.adminAuth, returnController.rejectReturnRequest);
router.get('/return/order-details/:id', admin.adminAuth, returnController.getReturnRequestDetails);

// Banner Management Routes
router.get('/banners', admin.adminAuth, bannerController.getAllBanners);
router.get('/banners/add', admin.adminAuth, bannerController.getAddBanner);
router.post('/banners/add', admin.adminAuth, bannerController.createBanner);
router.get('/banners/edit/:id', admin.adminAuth, bannerController.getEditBanner);
router.post('/banners/edit/:id', admin.adminAuth, bannerController.updateBanner);
router.patch('/banners/toggle/:id', admin.adminAuth, bannerController.toggleBannerStatus);
router.delete('/banners/delete/:id', admin.adminAuth, bannerController.deleteBanner);

export default router;