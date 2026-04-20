const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        default: null
    },
    password: {
        type: String,
        required: false
    },
    isVerified: { 
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    wallet: {
        type: Number,
        default: 0
    },
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    createdOn: {
        type: Date,
        default: Date.now,
    },
    referalCode: {
        type: String,
        required: false,
        sparse: true,
        default: null
    },
    redemmed: {
        type: Boolean,
        default: false
    },
    redemmedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    resetPasswordOTP: {
        code: {
            type: String,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        brand: {
            type: String,
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }],
    refreshToken: {
        type: String,
        default: null
    },
    refreshTokens: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 604800 // 7 days in seconds
        }
    }]
});

const User = mongoose.model("User", userSchema);
module.exports = User;
