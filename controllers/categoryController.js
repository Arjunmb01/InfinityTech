import Category from '../models/categorySchema.js';
import slugify from 'slugify';

/**
 * @desc Create new category with slug and parent check
 */
export const createCategory = async (req, res) => {
    try {
        const { name, description, parent, filters, seo, sortOrder, isFeatured } = req.body;

        const slug = slugify(name, { lower: true, strict: true });
        
        // Ensure slug is unique
        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category with this name already exists' });
        }

        const category = new Category({
            name,
            slug,
            description,
            parent: parent || null,
            filters,
            seo,
            sortOrder,
            isFeatured: isFeatured || false,
            status: {
                isFeatured: isFeatured || false
            }
        });

        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Get all categories in a hierarchical tree structure
 */
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ "status.isDeleted": false }).sort({ sortOrder: 1 });
        
        // Helper function to build tree
        const buildTree = (cats, parentId = null) => {
            const tree = [];
            cats.filter(cat => {
                const catParentId = cat.parent ? cat.parent.toString() : null;
                const searchParentId = parentId ? parentId.toString() : null;
                return catParentId === searchParentId;
            }).forEach(cat => {
                const node = { ...cat._doc };
                node.children = buildTree(cats, cat._id);
                tree.push(node);
            });
            return tree;
        };

        const categoryTree = buildTree(categories);
        res.status(200).json({ success: true, count: categoryTree.length, data: categoryTree });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Update category and recalculate levels if parent changed
 */
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.name) {
            updates.slug = slugify(updates.name, { lower: true, strict: true });
        }

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

        // Update top-level isFeatured if provided
        if (updates.isFeatured !== undefined) {
            updates["status.isFeatured"] = updates.isFeatured;
        }

        Object.assign(category, updates);
        await category.save();

        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Soft delete category
 */
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndUpdate(id, { "status.isDeleted": true, isDeleted: true }, { new: true });
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
