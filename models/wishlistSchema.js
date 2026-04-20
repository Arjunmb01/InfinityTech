const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    user: { // For backward compatibility
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Wishlist', wishlistSchema);