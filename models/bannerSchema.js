import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        default: '/shop',
        trim: true
    },
    buttonText: {
        type: String,
        default: 'Shop Now',
        trim: true
    },
    backgroundColor: {
        type: String,
        default: 'from-blue-600 to-purple-600',
        trim: true
    },
    textColor: {
        type: String,
        default: 'text-white',
        trim: true
    },
    icon: {
        type: String,
        default: 'fa-gift',
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: null
    },
    priority: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Method to check if banner is currently valid
bannerSchema.methods.isValid = function () {
    const now = new Date();
    if (!this.isActive) return false;
    if (this.startDate && this.startDate > now) return false;
    if (this.endDate && this.endDate < now) return false;
    return true;
};

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
