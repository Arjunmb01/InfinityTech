const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const slugify = require('slugify');
const path = require('path');

// Models
const Category = require('../models/categorySchema');
const Product = require('../models/productSchema');

dotenv.config();

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const productData = [
    {
        name: 'MacBook Pro 16" (M3 Max, 2024)',
        brand: 'Apple',
        categoryName: 'Laptops',
        subcategoryName: 'Thin & Light',
        price: 349900,
        salePrice: 329900,
        stock: 15,
        isFeatured: true,
        description: {
            short: 'The most advanced Mac laptop ever built for creators.',
            long: 'MacBook Pro blasts forward with the M3, M3 Pro, and M3 Max chips. Built on 3-nanometer technology and featuring an all-new GPU architecture, they’re the most advanced chips ever built for a personal computer. And each one brings more pro performance and capability.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'Processor': 'Apple M3 Max',
            'RAM': '32GB',
            'Storage': '1TB SSD',
            'Screen Size': '16"',
            'Weight': '1.6kg'
        }
    },
    {
        name: 'ASUS ROG Strix G16 (2024)',
        brand: 'ASUS',
        categoryName: 'Laptops',
        subcategoryName: 'Gaming Laptops',
        price: 189900,
        salePrice: 169900,
        stock: 25,
        isFeatured: true,
        description: {
            short: 'High-performance gaming laptop with Nebula HDR Display.',
            long: 'Draw more frames and win more games with the raw horsepower of the brand-new 2024 ROG Strix G16. With up to an NVIDIA® GeForce RTX™ 4080 Laptop GPU and up to an Intel® Core™ i9-14900HX processor, handle even the most demanding games with ease.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'GPU': 'NVIDIA RTX 4080',
            'RAM': '16GB',
            'Processor': 'Intel Core i9',
            'Refresh Rate': '240Hz'
        }
    },
    {
        name: 'Lenovo ThinkPad X1 Carbon Gen 12',
        brand: 'Lenovo',
        categoryName: 'Laptops',
        subcategoryName: 'Business Laptops',
        price: 210000,
        salePrice: 195000,
        stock: 10,
        isFeatured: false,
        description: {
            short: 'The pinnacle of professional mobile productivity.',
            long: 'Our legendary ThinkPad X1 Carbon Gen 12 is built for power on the go. Featuring Intel® Core™ Ultra processors and a stunning OLED display option, it combines security, durability, and premium style.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'Security Features': 'Fingerprint Reader',
            'RAM': '32GB',
            'Weight': 'Under 1.1kg',
            'Processor': 'Intel Core i7'
        }
    },
    {
        name: 'Dell XPS 13 2-in-1',
        brand: 'Dell',
        categoryName: 'Laptops',
        subcategoryName: '2-in-1 Convertibles',
        price: 125000,
        salePrice: 110000,
        stock: 8,
        isFeatured: true,
        description: {
            short: 'Versatility meets premium performance in a compact frame.',
            long: 'The XPS 13 2-in-1 allows you to work or play anywhere. With its detachable keyboard and stunning 3K display, it transitions seamlessly from a high-performance laptop to a portable tablet.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'Touchscreen': 'Yes',
            'Stylus Support': 'Supported',
            'RAM': '16GB',
            'Processor': 'Intel Core i5'
        }
    },
    {
        name: 'HP Elite Dragonfly G4',
        brand: 'HP',
        categoryName: 'Laptops',
        subcategoryName: 'Business Laptops',
        price: 175000,
        salePrice: 165000,
        stock: 5,
        isFeatured: false,
        description: {
            short: 'Exceptionally light and powerful for mobile leaders.',
            long: 'Redefine mobility with the HP Elite Dragonfly G4. Weighing under 1kg and featuring advanced AI noise reduction, it’s the ultimate machine for the executive on the move.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'Weight': 'Under 1kg',
            'RAM': '16GB',
            'Security Features': 'TPM 2.0',
            'Processor': 'Intel Core i7'
        }
    },
    {
        name: 'Peak Design Everyday Backpack Zip 20L',
        brand: 'Peak Design',
        categoryName: 'Laptop Accessories',
        subcategoryName: 'Bags & Sleeves',
        price: 18000,
        salePrice: 16500,
        stock: 40,
        isFeatured: true,
        description: {
            short: 'A versatile, visually clean daypack for laptop and gear.',
            long: 'The Everyday Backpack Zip is a simplified version of our award-winning Everyday Backpack. Ideal for everyday carry and light photo carry, with a dedicated laptop sleeve for up to 16" devices.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'Size': '15-16"',
            'Type': 'Backpack',
            'Brand': 'Peak Design'
        }
    },
    {
        name: 'Dell Dual Video USB-C Dock - UD22',
        brand: 'Dell',
        categoryName: 'Laptop Accessories',
        subcategoryName: 'Docking Stations',
        price: 16000,
        salePrice: 14999,
        stock: 30,
        isFeatured: false,
        description: {
            short: 'Boost your PC’s power with the world’s first modular dock.',
            long: 'Experience a consistent connection no matter which laptop you use. The UD22 provides dual 4K monitor support and legacy USB connectivity for all your office peripherals.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?q=80&w=1000&auto=format&fit=crop',
        attributes: {
            'Connection': 'USB-C',
            'Dual Display Support': 'Yes',
            'Brand': 'Dell'
        }
    }
];

async function seedProducts() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
        console.log('✅ Connected to MongoDB');

        for (const p of productData) {
            console.log(`\n📦 Processing: ${p.name}`);

            // 1. Find Category & Subcategory IDs
            const category = await Category.findOne({ name: p.categoryName });
            if (!category) {
                console.warn(`⚠️ Category "${p.categoryName}" not found. Skipping.`);
                continue;
            }

            let subcategory = null;
            if (p.subcategoryName) {
                subcategory = await Category.findOne({ name: p.subcategoryName, parent: category._id });
                if (!subcategory) {
                    console.warn(`⚠️ Subcategory "${p.subcategoryName}" not found under "${p.categoryName}".`);
                }
            }

            // 2. Upload Image to Cloudinary
            console.log(`🖼️ Uploading image to Cloudinary...`);
            const uploadResult = await cloudinary.uploader.upload(p.imageUrl, {
                folder: 'infinitytech/products',
                public_id: slugify(p.name, { lower: true }),
                overwrite: true
            });
            console.log(`✅ Image uploaded: ${uploadResult.secure_url}`);

            // 3. Prepare Product Data
            const slug = slugify(p.name, { lower: true });
            const sku = `INF-${p.brand.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const productUpdate = {
                name: p.name,
                brand: p.brand,
                slug: slug,
                sku: sku,
                description: p.description,
                category: category._id,
                subcategory: subcategory ? subcategory._id : null,
                price: p.price,
                salePrice: p.salePrice,
                discount: Math.round(((p.price - p.salePrice) / p.price) * 100),
                stock: p.stock,
                images: [{ url: uploadResult.secure_url, isPrimary: true }],
                attributes: p.attributes,
                isFeatured: p.isFeatured,
                status: {
                    isActive: true,
                    isDeleted: false,
                    isFeatured: p.isFeatured
                },
                isActive: true,
                isDeleted: false
            };

            // 4. Upsert Product
            const result = await Product.findOneAndUpdate(
                { slug: slug },
                productUpdate,
                { upsert: true, new: true }
            );

            console.log(`✨ Product ${result ? 'Seeded' : 'Failed'}: ${p.name}`);
        }

        console.log('\n🏁 Seeding complete!');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seedProducts();
