import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    user: { // Keeping for backward compatibility
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        product: { // Keeping for backward compatibility
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalPrice: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

CartSchema.methods.calculateTotal = function() {
    this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    return this.totalPrice;
};

CartSchema.pre('save', function(next) {
    this.calculateTotal();
    next();
});

const Cart = mongoose.model('Cart', CartSchema);
export default Cart;