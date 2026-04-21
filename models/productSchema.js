import mongoose from 'mongoose';
const { Schema } = mongoose;

const productSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    brand: {
        type: String,
        required: [true, 'Brand is required'],
        trim: true
    },
    description: {
        short: { type: String, required: true },
        long: { type: String, required: true }
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true
    },
    subcategory: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        index: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
        index: true
    },
    salePrice: {
        type: Number,
        min: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        required: [true, 'Stock is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    salesCount: {
        type: Number,
        default: 0
    },
    images: [
        {
            url: { type: String, required: true },
            isPrimary: { type: Boolean, default: false }
        }
    ],
    specifications: {
        type: Map,
        of: String
    },
    attributes: {
        type: Map,
        of: Schema.Types.Mixed,
        // MUST match category filters for dynamic querying
        // Example: { "RAM": "16GB", "Processor": "i7" }
    },
    variants: [
        {
            color: String,
            price: Number,
            stock: Number,
            sku: String
        }
    ],
    ratings: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    status: {
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false }
    },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true }
}, {
    timestamps: true
});

// MANDATORY INDEXES for high-performance querying
productSchema.index({ "attributes.$**": 1 }); // Wildcard index for dynamic attributes
productSchema.index({ name: 'text', brand: 'text' }); // Search indexing

const Product = mongoose.model('Product', productSchema);

export default Product;