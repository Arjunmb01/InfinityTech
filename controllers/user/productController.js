import Product from '../../models/productSchema.js';
import LaptopCategory from '../../models/categorySchema.js';
import User from '../../models/userSchema.js';
import Cart from '../../models/cartSchema.js';
import Wishlist from '../../models/wishlistSchema.js';
import { getBestOfferForProduct } from '../../utils/offer.js';
import mongoose from 'mongoose';

// Get Home Page Products
export const getHomePageProducts = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeCategories = await LaptopCategory.find({ "status.isActive": true }).select('_id');
        const activeCategoryIds = activeCategories.map(cat => cat._id);

        const newArrivals = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            category: { $in: activeCategoryIds },
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: -1 }).limit(8).lean();

        const featuredProducts = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            "status.isFeatured": true,
            category: { $in: activeCategoryIds }
        }).sort({ createdAt: -1 }).limit(8).lean();

        const topSellingProducts = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            category: { $in: activeCategoryIds }
        }).sort({ salesCount: -1 }).limit(8).lean();

        const dealProducts = await Product.find({
            "status.isActive": true,
            "status.isDeleted": false,
            category: { $in: activeCategoryIds }
        }).sort({ createdAt: -1 }).limit(8).lean();

        const enhanceProducts = async (products) => {
            return await Promise.all(products.map(async (product) => {
                try {
                    const offerDetails = await getBestOfferForProduct(product);
                    return { ...product, offerDetails };
                } catch (error) {
                    console.error(`Error calculating offer for product ${product._id}:`, error);
                    return {
                        ...product,
                        offerDetails: {
                            originalPrice: product.price,
                            finalPrice: product.price,
                            discountAmount: 0,
                            discountPercentage: 0,
                            appliedOfferType: null
                        }
                    };
                }
            }));
        };

        const enhancedNewArrivals = await enhanceProducts(newArrivals);
        const enhancedFeaturedProducts = await enhanceProducts(featuredProducts);
        const enhancedTopSellingProducts = await enhanceProducts(topSellingProducts);
        const enhancedDealProducts = await enhanceProducts(dealProducts);

        res.render('user/home', {
            newArrivals: enhancedNewArrivals,
            featuredProducts: enhancedFeaturedProducts,
            topSellingProducts: enhancedTopSellingProducts,
            dealProducts: enhancedDealProducts,
            message: {
                type: req.flash('error').length ? 'error' : 'success',
                content: req.flash('error')[0] || req.flash('success')[0]
            }
        });
    } catch (error) {
        console.error('Error in getHomePageProducts:', error);
        req.flash('error', 'Error loading home page');
        res.redirect('/');
    }
};

// Get Single Product Details
export const getSingleProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findOne({
            _id: productId,
            "status.isActive": true,
            "status.isDeleted": false
        }).populate('category').lean();

        if (!product) {
            req.flash('error', 'Product not found or unavailable');
            return res.redirect('/shop');
        }

        const offerDetails = await getBestOfferForProduct(product);

        const recommendedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
            "status.isActive": true,
            "status.isDeleted": false
        }).populate('category').limit(4).sort('-createdAt').lean();

        const recommendedProductsWithOffers = await Promise.all(recommendedProducts.map(async (prod) => {
            const recOfferDetails = await getBestOfferForProduct(prod);
            return { ...prod, offerDetails: recOfferDetails };
        }));

        let cartItemsCount = 0;
        if (req.user) {
            const cart = await Cart.findOne({ user: req.user._id });
            if (cart) {
                cartItemsCount = cart.items.length;
            }
        }

        res.render('user/product', {
            product: { ...product, offerDetails },
            recommendedProducts: recommendedProductsWithOffers,
            cartItemsCount,
            message: {
                type: req.flash('error').length ? 'error' : 'success',
                content: req.flash('error')[0] || req.flash('success')[0]
            }
        });
    } catch (error) {
        console.error('Error in getSingleProduct:', error);
        req.flash('error', 'Error loading product details');
        res.redirect('/shop');
    }
};

// Get All Categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await LaptopCategory.find({ "status.isActive": true })
            .sort('name')
            .lean();

        const categoriesWithCount = await Promise.all(categories.map(async category => {
            const count = await Product.countDocuments({ category: category._id });
            return { ...category, productCount: count };
        }));

        res.render('user/categories', {
            categories: categoriesWithCount,
            message: {
                type: req.flash('error').length ? 'error' : 'success',
                content: req.flash('error')[0] || req.flash('success')[0]
            }
        });
    } catch (error) {
        console.error('Error in getAllCategories:', error);
        req.flash('error', 'Error loading categories');
        res.redirect('/');
    }
};

// Get Category Products
export const getCategoryProducts = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await LaptopCategory.findOne({ _id: categoryId, "status.isActive": true });
        if (!category) {
            req.flash('error', 'Category not found or inactive');
            return res.redirect('/categories');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const [products, totalProducts] = await Promise.all([
            Product.find({
                category: categoryId,
                "status.isActive": true,
                "status.isDeleted": false
            })
                .populate('category')
                .skip(skip)
                .limit(limit)
                .sort('-createdAt')
                .lean(),
            Product.countDocuments({
                category: categoryId,
                "status.isActive": true,
                "status.isDeleted": false
            })
        ]);

        const productsWithOffers = await Promise.all(products.map(async (product) => {
            const offerDetails = await getBestOfferForProduct(product);
            return { ...product, offerDetails };
        }));

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('user/categoryProducts', {
            category,
            products: productsWithOffers,
            currentPage: page,
            totalPages,
            totalProducts,
            message: {
                type: req.flash('error').length ? 'error' : 'success',
                content: req.flash('error')[0] || req.flash('success')[0]
            }
        });
    } catch (error) {
        console.error('Error in getCategoryProducts:', error);
        req.flash('error', 'Error loading category products');
        res.redirect('/categories');
    }
};

// Load Shop Page
export const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const selectedCategories = req.query.category 
            ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]).filter(c => c && c.trim() !== '') 
            : [];
        const sortOption = req.query.sort || 'newest';
        const searchQuery = req.query.search || '';
        const minPrice = (req.query.minPrice !== undefined && req.query.minPrice !== '') ? parseFloat(req.query.minPrice) : null;
        const maxPrice = (req.query.maxPrice !== undefined && req.query.maxPrice !== '') ? parseFloat(req.query.maxPrice) : null;

        let activeCategories = [];
        try {
            activeCategories = await LaptopCategory.find({ "status.isActive": true }).select('_id name').lean();
        } catch (err) {
            console.error('Error fetching categories:', err);
            activeCategories = [];
        }

        const filter = {
            "status.isActive": true,
            "status.isDeleted": false,
            category: { $in: activeCategories.length > 0 ? activeCategories.map(cat => cat._id) : [] }
        };

        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { "description.short": { $regex: searchQuery, $options: 'i' } },
                { "description.long": { $regex: searchQuery, $options: 'i' } }
            ];
        }

        if (selectedCategories.length > 0) {
            filter.category = { $in: selectedCategories };
        }

        let allProducts = [];
        try {
            allProducts = await Product.find(filter).populate('category').lean();
        } catch (err) {
            console.error('Error fetching products:', err);
            allProducts = [];
        }

        const productsWithOffers = await Promise.all(allProducts.map(async (product) => {
            try {
                const offerDetails = await getBestOfferForProduct(product);
                return { ...product, offerDetails };
            } catch (err) {
                console.error(`Error calculating offer for product ${product._id}:`, err);
                return {
                    ...product,
                    offerDetails: {
                        originalPrice: product.price,
                        finalPrice: product.price,
                        discountAmount: 0,
                        discountPercentage: 0,
                        appliedOfferType: null
                    }
                };
            }
        }));

        let filteredProducts = productsWithOffers;
        if (minPrice !== null) {
            filteredProducts = filteredProducts.filter(p => p.offerDetails.finalPrice >= minPrice);
        }
        if (maxPrice !== null) {
            filteredProducts = filteredProducts.filter(p => p.offerDetails.finalPrice <= maxPrice);
        }

        const sortQuery = {
            'price_low_to_high': (a, b) => a.offerDetails.finalPrice - b.offerDetails.finalPrice,
            'price_high_to_low': (a, b) => b.offerDetails.finalPrice - a.offerDetails.finalPrice,
            'newest': (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        }[sortOption] || ((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        filteredProducts.sort(sortQuery);

        const paginatedProducts = filteredProducts.slice(skip, skip + limit);

        const finalPrices = productsWithOffers.map(p => p.offerDetails.finalPrice);
        const minPriceInDb = finalPrices.length > 0 ? Math.min(...finalPrices) : 0;
        const maxPriceInDb = finalPrices.length > 0 ? Math.max(...finalPrices) : 0;

        const totalProducts = filteredProducts.length;
        const totalPages = Math.ceil(totalProducts / limit);

        let wishlist = [];
        if (req.user && req.user._id) {
            try {
                const user = await User.findById(req.user._id).select('wishlist').lean();
                wishlist = user ? user.wishlist.map(id => id.toString()) : [];
            } catch (err) {
                console.error('Error fetching wishlist:', err);
                wishlist = [];
            }
        }

        res.render('user/shop', {
            products: paginatedProducts,
            categories: activeCategories,
            currentPage: page,
            totalPages,
            totalProducts,
            selectedCategory: selectedCategories.length > 0 ? selectedCategories[0] : '',
            sortOption,
            searchQuery,
            minPrice: minPriceInDb,
            maxPrice: maxPriceInDb,
            selectedMinPrice: minPrice || minPriceInDb,
            selectedMaxPrice: maxPrice || maxPriceInDb,
            wishlist,
            message: {
                type: req.flash('error').length ? 'error' : 'success',
                content: req.flash('error')[0] || req.flash('success')[0]
            }
        });
    } catch (error) {
        console.error('Unexpected error in loadShop:', error);
        req.flash('error', 'Something went wrong while loading the shop page.');
        res.render('user/shop', {
            products: [],
            categories: [],
            currentPage: 1,
            totalPages: 1,
            totalProducts: 0,
            selectedCategory: '',
            sortOption: 'newest',
            searchQuery: '',
            minPrice: 0,
            maxPrice: 0,
            selectedMinPrice: 0,
            selectedMaxPrice: 0,
            wishlist: [],
            message: {
                type: 'error',
                content: 'Failed to load shop data. Please try again later.'
            }
        });
    }
};

// Search Products
export const searchProducts = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        const products = await Product.find({
            $and: [
                { 'status.isActive': true },
                { 'status.isDeleted': false },
                {
                    $or: [
                        { name: { $regex: searchQuery, $options: 'i' } },
                        { brand: { $regex: searchQuery, $options: 'i' } },
                        { "description.short": { $regex: searchQuery, $options: 'i' } },
                        { "description.long": { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            ]
        })
        .populate('category')
        .lean();

        const productsWithOffers = await Promise.all(products.map(async (product) => {
            const offerDetails = await getBestOfferForProduct(product);
            return { ...product, offerDetails };
        }));

        res.render('user/search', {
            products: productsWithOffers,
            searchQuery,
            message: {
                type: req.flash('error').length ? 'error' : 'success',
                content: req.flash('error')[0] || req.flash('success')[0]
            }
        });
    } catch (error) {
        console.error('Error in searchProducts:', error);
        req.flash('error', 'Error searching products');
        res.redirect('/shop');
    }
};

// Add to Wishlist
export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;

        const product = await Product.findById(productId);
        if (!product || product.status.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const user = await User.findById(userId);
        if (user.wishlist.includes(productId)) {
            return res.json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        user.wishlist.push(productId);
        await user.save();

        res.json({
            success: true,
            message: 'Product added to wishlist successfully'
        });
    } catch (error) {
        console.error('Error in addToWishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product to wishlist'
        });
    }
};

// Get Product Stock
export const getProductStock = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        const product = await Product.findById(productId).select('stock');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, stock: product.stock });
    } catch (error) {
        console.error('Error fetching product stock:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Advanced Product Listing (API)
export const getProducts = async (req, res) => {
    try {
        const { category, price, sort, page = 1, limit = 20, ...attributes } = req.query;

        const finalQuery = {
            "status.isActive": true,
            "status.isDeleted": false
        };

        // 1. Category Filter
        if (category) {
            const cat = await LaptopCategory.findOne({ slug: category, "status.isDeleted": false });
            if (cat) {
                finalQuery.category = cat._id;
            } else if (mongoose.Types.ObjectId.isValid(category)) {
                finalQuery.category = category;
            }
        }

        // 2. Price Range Filter
        if (price) {
            finalQuery.price = {};
            if (price.gte) finalQuery.price.$gte = Number(price.gte);
            if (price.lte) finalQuery.price.$lte = Number(price.lte);
        }

        // Dynamic Attribute Filtering
        Object.keys(attributes).forEach(key => {
            if (!['page', 'limit', 'sort'].includes(key)) {
                finalQuery[`attributes.${key}`] = attributes[key];
            }
        });

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort) {
            switch (sort) {
                case 'price-low-high': sortOption = { price: 1 }; break;
                case 'price-high-low': sortOption = { price: -1 }; break;
                case 'newest': sortOption = { createdAt: -1 }; break;
                default: sortOption = { createdAt: -1 };
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const products = await Product.find(finalQuery)
            .sort(sortOption)
            .skip(skip)
            .limit(Number(limit))
            .populate('category', 'name slug');

        const total = await Product.countDocuments(finalQuery);

        res.status(200).json({
            success: true,
            count: products.length,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            },
            data: products
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ "status.isFeatured": true, "status.isActive": true, "status.isDeleted": false })
            .limit(10)
            .populate('category', 'name slug');
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};