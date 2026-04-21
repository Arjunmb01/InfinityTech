import Category from '../../models/categorySchema.js';
import Product from '../../models/productSchema.js';

export const categoryInfo = async (req, res) => {
    try {
        const { page = 1, search = "", status = "", sort = "date" } = req.query;
        const perPage = 5;
        const currentPage = parseInt(page);

        let query = { "status.isDeleted": false };

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }
        if (status !== "") {
            query["status.isActive"] = status === "true";
        }

        let sortOption = sort === "name" ? { name: 1 } : { createdAt: -1 };

        const totalCategories = await Category.countDocuments(query);
        const categories = await Category.find(query)
            .sort(sortOption)
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        const totalPages = Math.ceil(totalCategories / perPage);

        if (req.query.ajax === 'true') {
            return res.json({
                success: true,
                categories,
                currentPage,
                totalPages,
                search,
                status,
                sort
            });
        }

        res.render('admin/categories', { 
            path: req.path,
            categories, 
            currentPage,
            totalPages,
            search,
            status,
            sort
        });

    } catch (error) {
        console.error('Error in categoryInfo:', error);
        req.flash('error', 'Error loading categories');
        res.redirect('/admin/dashboard');
    }
};

export const loadCategory = async (req, res) => {
    try {
        const categories = await Category.find({ "status.isDeleted": false, "status.isActive": true });
        res.render('admin/addCategory', { categories });
    } catch (error) {
        console.error('Error in loadCategory:', error);
        res.redirect('/admin/categories');
    }
};

export const addCategory = async (req, res) => {
    try {
        const { 
            name, 
            description, 
            parent, 
            categoryOffer, 
            sortOrder, 
            filters, 
            seo 
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Category name must be at least 2 characters' });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            "status.isDeleted": false
        });

        if (existingCategory) {
            return res.status(409).json({ success: false, message: 'Category with this name already exists' });
        }

        let level = 1;
        if (parent) {
            const parentCategory = await Category.findById(parent);
            if (parentCategory) {
                level = parentCategory.level + 1;
            }
        }

        const newCategory = new Category({
            name: name.trim(),
            slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: description ? description.trim() : '',
            parent: parent || null,
            level: level,
            categoryOffer: categoryOffer || 0,
            sortOrder: sortOrder || 0,
            filters: filters || [],
            seo: seo || {},
            status: {
                isActive: true,
                isDeleted: false
            }
        });

        await newCategory.save();

        return res.status(201).json({
            success: true,
            message: 'Category added successfully'
        });

    } catch (error) {
        console.error('Error in addCategory:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'An error occurred while adding the category'
        });
    }
};

export const loadEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await Category.findOne({
            _id: categoryId,
            "status.isDeleted": false
        });

        if (!category) {
            req.flash('error', 'Category not found');
            return res.redirect('/admin/categories');
        }

        const categories = await Category.find({ 
            "status.isDeleted": false, 
            "status.isActive": true,
            _id: { $ne: categoryId } 
        });

        res.render('admin/editCategory', {
            category,
            categories
        });
    } catch (error) {
        console.error('Error in loadEditCategory:', error);
        req.flash('error', 'Error loading category');
        res.redirect('/admin/categories');
    }
};

export const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { 
            name, 
            description, 
            parent, 
            categoryOffer, 
            sortOrder, 
            filters, 
            seo 
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const existingCategory = await Category.findOne({
            name: name.trim(),
            _id: { $ne: categoryId },
            "status.isDeleted": false
        });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }

        let level = 1;
        if (parent) {
            const parentCategory = await Category.findById(parent);
            if (parentCategory) {
                level = parentCategory.level + 1;
            }
        }

        const updateData = {
            name: name.trim(),
            slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: description ? description.trim() : '',
            parent: parent || null,
            level: level,
            categoryOffer: categoryOffer || 0,
            sortOrder: sortOrder || 0,
            filters: filters || [],
            seo: seo || {}
        };

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        console.error('Error in updateCategory:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating category'
        });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const productsCount = await Product.countDocuments({
            category: categoryId,
            "status.isDeleted": false
        });

        if (productsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with associated products',
                productsCount
            });
        }

        const deletedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { "status.isDeleted": true },
            { new: true }
        );

        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteCategory:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting category'
        });
    }
};

export const toggleCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        category.status.isActive = !category.status.isActive;
        await category.save();

        res.setHeader('Content-Type', 'application/json');
        
        return res.status(200).json({
            success: true,
            message: `Category ${category.status.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: category.status.isActive,
            category: {
                _id: category._id,
                name: category.name,
                isActive: category.status.isActive
            }
        });
    } catch (error) {
        console.error('Error in toggleCategoryStatus:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error toggling category status'
        });
    }
};

export const getCategoryDetails = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findOne({
            _id: categoryId,
            "status.isDeleted": false
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const allCategories = await Category.find({ 
            "status.isDeleted": false, 
            "status.isActive": true,
            _id: { $ne: categoryId } 
        });

        res.json({
            success: true,
            category: category,
            allCategories: allCategories
        });
    } catch (error) {
        console.error('Error in getCategoryDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category details'
        });
    }
};