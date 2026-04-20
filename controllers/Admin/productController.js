const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const slugify = require('slugify');
const fs = require('fs').promises;
const path = require('path');

// Load Products Page with pagination
const loadProduct = async (req, res) => {
    try {
        let page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 7;
        const { search, category, priceRange, stock, sortBy = '-createdAt', status } = req.query;

        let filterQuery = {};
        if (search) {
            filterQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { "description.short": { $regex: search, $options: 'i' } },
                { "description.long": { $regex: search, $options: 'i' } }
            ];
        }
        if (category) filterQuery.category = category;
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filterQuery.price = {};
            if (min) filterQuery.price.$gte = min;
            if (max) filterQuery.price.$lte = max;
        }
        if (stock) {
            switch (stock) {
                case 'out': filterQuery.stock = 0; break;
                case 'low': filterQuery.stock = { $gt: 0, $lte: 10 }; break;
                case 'available': filterQuery.stock = { $gt: 10 }; break;
            }
        }
        if (status) {
            if (status === 'active') filterQuery["status.isDeleted"] = false;
            if (status === 'inactive') filterQuery["status.isDeleted"] = true;
            if (status === 'listed') filterQuery["status.isActive"] = true;
            if (status === 'unlisted') filterQuery["status.isActive"] = false;
            if (status === 'featured') filterQuery["status.isFeatured"] = true;
            if (status === 'notfeatured') filterQuery["status.isFeatured"] = false;
        } else {
            // Default: don't show deleted products in main list unless requested
            filterQuery["status.isDeleted"] = false;
        }

        const skip = (page - 1) * limit;
        const [products, totalProducts, categories] = await Promise.all([
            Product.find(filterQuery).populate('category', 'name').sort(sortBy).skip(skip).limit(limit).lean(),
            Product.countDocuments(filterQuery),
            Category.find().lean()
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        // Handle AJAX requests
        if (req.query.ajax === 'true') {
            return res.json({
                success: true,
                products,
                currentPage: page,
                totalPages,
                totalProducts,
                filters: { search, category, priceRange, stock, sortBy, status }
            });
        }

        res.render('admin/products', {
            path: req.path,
            products,
            categories,
            filters: { search, category, priceRange, stock, sortBy, status },
            pagination: {
                currentPage: page,
                totalPages,
                limit,
                totalProducts,
                startIndex: skip + 1,
                endIndex: Math.min(skip + limit, totalProducts),
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
            success_msg: req.flash('success')[0],
            error_msg: req.flash('error')[0]
        });
    } catch (error) {
        console.error('Error in loadProduct:', error);
        req.flash('error', 'Error loading products');
        res.redirect('/admin/dashboard');
    }
};

// Load Add Product Page
const loadAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({ "status.isDeleted": false, parent: null }); // Root Categories
        res.render('admin/addProduct', {
            categories,
            message: req.flash('error')[0] || req.flash('success')[0],
            messageType: req.flash('error').length ? 'error' : 'success'
        });
    } catch (error) {
        console.error('Error in loadAddProduct:', error);
        req.flash('error', 'Error loading add product page');
        res.redirect('/admin/products');
    }
};

// Add New Product
const addProduct = async (req, res) => {
    try {
        if (!req.files || !req.files['images'] || req.files['images'].length === 0) {
            throw new Error('At least one product image is required');
        }

        const {
            name, brand, category, subcategory, price, salePrice, stock, shortDescription, longDescription, specKey, specValue
        } = req.body;

        const validateField = (field, value, message) => {
            if (!value || value.trim() === '') throw new Error(message);
            return value.trim();
        };

        const validatedFields = {
            name: validateField('name', name, 'Product name is required'),
            brand: validateField('brand', brand, 'Brand is required'),
            category: validateField('category', category, 'Category is required'),
            shortDescription: validateField('shortDescription', shortDescription, 'Short description is required'),
            longDescription: validateField('longDescription', longDescription, 'Long description is required')
        };

        const parsedPrice = parseFloat(price);
        const parsedSalePrice = parseFloat(salePrice || price);
        const parsedStock = parseInt(stock);
        const discount = Math.round(((parsedPrice - parsedSalePrice) / parsedPrice) * 100);

        const productImages = req.files['images'].map((file, index) => ({
            url: file.path,
            isPrimary: index === 0
        }));

        // Build Dynamic Specifications Map
        const specifications = new Map();
        if (Array.isArray(specKey)) {
            specKey.forEach((key, index) => {
                if (key && specValue[index]) specifications.set(key, specValue[index]);
            });
        } else if (specKey && specValue) {
            specifications.set(specKey, specValue);
        }

        const newProduct = new Product({
            name: validatedFields.name,
            slug: slugify(validatedFields.name, { lower: true }),
            brand: validatedFields.brand,
            category: validatedFields.category,
            subcategory: subcategory || null,
            description: {
                short: validatedFields.shortDescription,
                long: validatedFields.longDescription
            },
            price: parsedPrice,
            salePrice: parsedSalePrice,
            discount: discount,
            stock: parsedStock,
            specifications,
            images: productImages,
            status: {
                isActive: true,
                isDeleted: false,
                isFeatured: false
            }
        });

        await newProduct.save();
        res.status(200).json({ success: true, message: 'Product added successfully', product: newProduct });
    } catch (error) {
        console.error('Error in addProduct:', error);
        res.status(400).json({ success: false, message: error.message || 'Error adding product' });
    }
};

// Load Edit Product Page
const loadEditProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate('subcategory', 'name')
            .lean();
        if (!product) throw new Error('Product not found');
        
        const categories = await Category.find({ parent: null, "status.isDeleted": false }).lean();
        const subcategories = product.category ? await Category.find({ parent: product.category._id, "status.isDeleted": false }).lean() : [];

        res.render('admin/editProduct', {
            product,
            categories,
            subcategories,
            message: req.flash('error')[0] || req.flash('success')[0],
            messageType: req.flash('error').length ? 'error' : 'success'
        });
    } catch (error) {
        console.error('Error in loadEditProduct:', error);
        req.flash('error', error.message || 'Error loading product');
        res.redirect('/admin/products');
    }
};

// Update Product
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        const { name, brand, category, subcategory, shortDescription, longDescription, price, salePrice, stock, specKey, specValue } = req.body;

        // Build Dynamic Specifications Map
        const specifications = new Map();
        if (Array.isArray(specKey)) {
            specKey.forEach((key, index) => {
                if (key && specValue[index]) specifications.set(key, specValue[index]);
            });
        } else if (specKey && specValue) {
            specifications.set(specKey, specValue);
        }

        const parsedPrice = parseFloat(price);
        const parsedSalePrice = parseFloat(salePrice || price);
        const discount = Math.round(((parsedPrice - parsedSalePrice) / parsedPrice) * 100);

        const updateData = {
            name: name?.trim(),
            slug: slugify(name?.trim(), { lower: true }),
            brand: brand?.trim(),
            category,
            subcategory: subcategory || null,
            description: {
                short: shortDescription?.trim(),
                long: longDescription?.trim()
            },
            price: parsedPrice,
            salePrice: parsedSalePrice,
            discount: discount,
            stock: parseInt(stock),
            specifications
        };

        if (req.files && req.files['images'] && req.files['images'].length > 0) {
            const newImages = req.files['images'].map(file => ({
                url: file.path,
                isPrimary: false
            }));
            updateData.images = [...product.images, ...newImages];
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { runValidators: true, new: true });
        return res.status(200).json({ success: true, message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        console.error('Error in updateProduct:', error);
        return res.status(500).json({ success: false, message: error.message || 'Error updating product' });
    }
};

// Replace Product Image
const replaceProductImage = async (req, res) => {
    try {
        const { productId } = req.params;
        const { imageIndex } = req.body;

        if (!productId || imageIndex === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required parameters: productId and imageIndex' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (!product.images[imageIndex]) return res.status(400).json({ success: false, message: 'Image index not found in product' });
        if (!req.files || !req.files['newImage'] || req.files['newImage'].length === 0) {
            return res.status(400).json({ success: false, message: 'A new image is required to replace the deleted one' });
        }

        const oldImageUrl = product.images[imageIndex].url;
        const newImage = req.files['newImage'][0];
        const newImagePath = newImage.path; 

        // Note: fs.unlink won't work for Cloudinary URLs, but we'll leave this for context if local storage is used
        if (!oldImageUrl.startsWith('http')) {
            const absoluteOldPath = path.join(__dirname, '../../uploads/products', path.basename(oldImageUrl));
            await fs.unlink(absoluteOldPath).catch(err => console.error(`Warning: Could not delete file ${absoluteOldPath}:`, err));
        }

        product.images[imageIndex].url = newImagePath;
        await product.save();

        return res.status(200).json({
            success: true,
            message: 'Image replaced successfully',
            newImageUrl: newImagePath
        });
    } catch (error) {
        console.error('Error in replaceProductImage:', error);
        if (req.files && req.files['newImage']) {
            await fs.unlink(req.files['newImage'][0].path).catch(err => console.error('Error deleting file:', err));
        }
        return res.status(500).json({ success: false, message: error.message || 'Server error while replacing image' });
    }
};

// Remove Product Image
const removeProductImage = async (req, res) => {
    try {
        const { productId } = req.params;
        const { imageIndex } = req.body;

        if (productId === undefined || imageIndex === undefined) {
            return res.status(400).json({ success: false, message: 'ProductId and imageIndex are required' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        
        if (product.images.length <= 1) {
            return res.status(400).json({ success: false, message: 'At least one image is required. Cannot delete the only existing image.' });
        }

        if (!product.images[imageIndex]) {
            return res.status(400).json({ success: false, message: 'Image index out of bounds' });
        }

        // Remove the image at the specified index
        product.images.splice(imageIndex, 1);
        
        // If the primary image was deleted, set the new first image as primary
        if (product.images.length > 0 && !product.images.some(img => img.isPrimary)) {
            product.images[0].isPrimary = true;
        }

        await product.save();

        return res.status(200).json({ 
            success: true, 
            message: 'Image removed successfully',
            availableImages: product.images.length 
        });
    } catch (error) {
        console.error('Error in removeProductImage:', error);
        return res.status(500).json({ success: false, message: 'Server error while removing image' });
    }
};

// Toggle Listing Status
const toggleListStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        product.status.isActive = !product.status.isActive;
        await product.save();
        res.status(200).json({ success: true, message: `Product ${product.status.isActive ? 'listed' : 'unlisted'} successfully` });
    } catch (error) {
        console.error('Error toggling product list status:', error);
        res.status(500).json({ success: false, message: 'Server error while toggling product status' });
    }
};

// Toggle Featured Status
const toggleFeaturedStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        product.status.isFeatured = !product.status.isFeatured;
        await product.save();
        res.status(200).json({
            success: true,
            message: `Product ${product.status.isFeatured ? 'marked as featured' : 'removed from featured'} successfully`
        });
    } catch (error) {
        console.error('Error toggling featured status:', error);
        res.status(500).json({ success: false, message: 'Server error while toggling featured status' });
    }
};

// List Product (Set isActive to true)
const listProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        product.status.isActive = true;
        product.isActive = true; // Top level
        await product.save();
        res.status(200).json({ success: true, message: 'Product listed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Unlist Product (Set isActive to false)
const unlistProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        product.status.isActive = false;
        product.isActive = false; // Top level
        await product.save();
        res.status(200).json({ success: true, message: 'Product unlisted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Soft Delete Product
const softDeleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        product.status.isDeleted = !product.status.isDeleted;
        product.isDeleted = product.status.isDeleted; // Sync top level
        await product.save();
        res.status(200).json({ success: true, message: `Product ${product.status.isDeleted ? 'marked as deleted' : 'restored'} successfully` });
    } catch (error) {
        console.error('Error soft deleting product:', error);
        res.status(500).json({ success: false, message: 'Server error while soft deleting product' });
    }
};

module.exports = {
    loadProduct,
    loadAddProduct,
    addProduct,
    loadEditProduct,
    updateProduct,
    replaceProductImage,
    removeProductImage,
    toggleListStatus,
    toggleFeaturedStatus,
    softDeleteProduct,
    listProduct,
    unlistProduct
};