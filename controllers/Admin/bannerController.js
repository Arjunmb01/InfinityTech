import Banner from '../../models/bannerSchema.js';

// Get all banners
export const getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find().sort({ priority: -1, createdAt: -1 }).lean();
        res.render('admin/banners', {
            path: req.path,
            banners,
            success_msg: req.flash('success')[0],
            error_msg: req.flash('error')[0]
        });
    } catch (error) {
        console.error('Error loading banners:', error);
        req.flash('error', 'Error loading banners');
        res.redirect('/admin/dashboard');
    }
};

// Get add banner form
export const getAddBanner = async (req, res) => {
    try {
        res.render('admin/addBanner', {
            path: req.path,
            message: req.flash('error')[0] || req.flash('success')[0],
            messageType: req.flash('error').length ? 'error' : 'success'
        });
    } catch (error) {
        console.error('Error loading add banner page:', error);
        req.flash('error', 'Error loading add banner page');
        res.redirect('/admin/banners');
    }
};

// Create new banner
export const createBanner = async (req, res) => {
    try {
        const { title, description, link, buttonText, backgroundColor, textColor, icon, isActive, startDate, endDate, priority } = req.body;

        // Validation
        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
        }

        const newBanner = new Banner({
            title: title.trim(),
            description: description.trim(),
            link: link || '/shop',
            buttonText: buttonText || 'Shop Now',
            backgroundColor: backgroundColor || 'from-blue-600 to-purple-600',
            textColor: textColor || 'text-white',
            icon: icon || 'fa-gift',
            isActive: isActive === 'true' || isActive === true,
            startDate: startDate || Date.now(),
            endDate: endDate || null,
            priority: parseInt(priority) || 0
        });

        await newBanner.save();
        res.status(200).json({ success: true, message: 'Banner created successfully', banner: newBanner });
    } catch (error) {
        console.error('Error creating banner:', error);
        res.status(500).json({ success: false, message: error.message || 'Error creating banner' });
    }
};

// Get edit banner form
export const getEditBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id).lean();
        if (!banner) {
            req.flash('error', 'Banner not found');
            return res.redirect('/admin/banners');
        }

        res.render('admin/editBanner', {
            path: req.path,
            banner,
            message: req.flash('error')[0] || req.flash('success')[0],
            messageType: req.flash('error').length ? 'error' : 'success'
        });
    } catch (error) {
        console.error('Error loading edit banner page:', error);
        req.flash('error', 'Error loading banner');
        res.redirect('/admin/banners');
    }
};

// Update banner
export const updateBanner = async (req, res) => {
    try {
        const { title, description, link, buttonText, backgroundColor, textColor, icon, isActive, startDate, endDate, priority } = req.body;

        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        // Update fields
        banner.title = title?.trim() || banner.title;
        banner.description = description?.trim() || banner.description;
        banner.link = link || banner.link;
        banner.buttonText = buttonText || banner.buttonText;
        banner.backgroundColor = backgroundColor || banner.backgroundColor;
        banner.textColor = textColor || banner.textColor;
        banner.icon = icon || banner.icon;
        banner.isActive = isActive === 'true' || isActive === true;
        banner.startDate = startDate || banner.startDate;
        banner.endDate = endDate || null;
        banner.priority = parseInt(priority) || banner.priority;

        await banner.save();
        res.status(200).json({ success: true, message: 'Banner updated successfully', banner });
    } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({ success: false, message: error.message || 'Error updating banner' });
    }
};

// Toggle banner status
export const toggleBannerStatus = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        res.status(200).json({
            success: true,
            message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: banner.isActive
        });
    } catch (error) {
        console.error('Error toggling banner status:', error);
        res.status(500).json({ success: false, message: 'Error toggling banner status' });
    }
};

// Delete banner
export const deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        res.status(200).json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({ success: false, message: 'Error deleting banner' });
    }
};
