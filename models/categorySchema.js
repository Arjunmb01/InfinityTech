const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        index: true
    },
    level: {
        type: Number,
        default: 1 
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    media: {
        thumbnail: String,
        banner: String,
        icon: String
    },
    status: {
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        isAvailable: { type: Boolean, default: true }
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    categoryOffer: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    filters: [
        {
            name: String, // e.g., 'RAM', 'Processor'
            type: {
                type: String,
                enum: ['checkbox', 'radio', 'range'],
                default: 'checkbox'
            },
            options: [String] // e.g., ['8GB', '16GB', '32GB']
        }
    ],
    seo: {
        title: String,
        description: String,
        keywords: [String]
    }
}, {
    timestamps: true
});


categorySchema.pre('save', async function (next) {
    if (this.parent) {
        const parentCategory = await mongoose.model('Category').findById(this.parent);
        if (parentCategory) {
            this.level = parentCategory.level + 1;
        }
    } else {
        this.level = 1;
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
