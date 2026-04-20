import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/productSchema.js';
import Category from '../models/categorySchema.js';
import slugify from 'slugify';

dotenv.config();

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim()
});

const products = [
    {
        name: "Razer Blade 16 (2024)",
        brand: "Razer",
        categoryName: "Laptops",
        subcategoryName: "Gaming Laptops",
        price: 389999,
        salePrice: 369999,
        stock: 8,
        description: {
            short: "The ultimate 16-inch gaming laptop with dual-mode Mini-LED display.",
            long: "Experience insane performance with the Intel Core i9-14900HX and NVIDIA GeForce RTX 4090. The world's first dual-mode Mini-LED display allows you to toggle between UHD+ 120Hz for creative work and FHD+ 240Hz for competitive gaming."
        },
        specifications: {
            "Processor": "Intel Core i9-14900HX (24 Cores, up to 5.8 GHz)",
            "Graphics": "NVIDIA GeForce RTX 4090 Laptop GPU (16GB GDDR6, 175W TGP)",
            "Memory": "32GB Dual-Channel DDR5 5600MHz",
            "Display": "16-inch Dual Mode Mini-LED (UHD+ 120Hz / FHD+ 240Hz)",
            "Storage": "2TB PCIe Gen4 NVMe SSD",
            "Thermal": "Vapor Chamber Cooling with Patented Thermal Materials"
        },
        attributes: {
            "Processor": "Intel Core i9",
            "RAM": "32GB",
            "Storage": "2TB SSD",
            "Screen Size": "16\"",
            "Brand": "Razer"
        },
        sourceImage: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=1000",
        isFeatured: true
    },
    {
        name: "ASUS ROG Zephyrus G16 (2024)",
        brand: "ASUS",
        categoryName: "Laptops",
        subcategoryName: "Gaming Laptops",
        price: 249990,
        salePrice: 229990,
        stock: 12,
        description: {
            short: "Thin, light, and powerful with a breathtaking OLED Nebula Display.",
            long: "The 2024 Zephyrus G16 features a premium CNC-machined aluminum chassis and the all-new Intel Core Ultra 9 processor with AI acceleration. The 240Hz OLED display provides unparalleled color accuracy and speed."
        },
        specifications: {
            "Processor": "Intel Core Ultra 9 185H (AI-Accelerated)",
            "Graphics": "NVIDIA GeForce RTX 4080 Laptop GPU",
            "Memory": "32GB LPDDR5X 7467MHz",
            "Display": "16-inch 2.5K 240Hz OLED Nebula Display (100% DCI-P3)",
            "Storage": "2TB PCIe Gen4 SSD",
            "Weight": "1.85 kg (4.08 lbs)"
        },
        attributes: {
            "Processor": "Intel Core i9", // Core Ultra 9 categorized as i9 for simplicity in filters
            "RAM": "32GB",
            "Storage": "2TB SSD",
            "Screen Size": "16\"",
            "Brand": "ASUS"
        },
        sourceImage: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=1000",
        isFeatured: true
    },
    {
        name: "MSI Titan 18 HX A14V",
        brand: "MSI",
        categoryName: "Laptops",
        subcategoryName: "Workstations",
        price: 549990,
        salePrice: 499990,
        stock: 3,
        description: {
            short: "Total dominance. The most powerful laptop in existence.",
            long: "The Titan 18 HX is a desktop replacement that pushes the limits of mobile computing. With four memory slots for up to 128GB of RAM and massive vapor chamber cooling, it's built for extreme performance."
        },
        specifications: {
            "Processor": "Intel Core i9-14900HX",
            "Graphics": "NVIDIA GeForce RTX 4094 GPU 175W",
            "Memory": "128GB DDR5 RAM (4 x 32GB)",
            "Display": "18-inch 4K+ (3840 x 2400) 120Hz Mini-LED",
            "Storage": "4TB (2 x 2TB PCIe Gen4 RAID 0)",
            "Input": "SteelSeries Mechanical Keyboard with Cherry MX Switches"
        },
        attributes: {
            "Processor": "Intel Core i9",
            "RAM": "64GB", // Categorized as highest common for filter
            "Storage": "2TB SSD",
            "Screen Size": "17\"",
            "Brand": "MSI"
        },
        sourceImage: "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&q=80&w=1000"
    },
    {
        name: "MacBook Pro 14 (M3 Max)",
        brand: "Apple",
        categoryName: "Laptops",
        subcategoryName: "Thin & Light",
        price: 329900,
        salePrice: 329900,
        stock: 20,
        description: {
            short: "Mind-blowing power in a medium-sized frame.",
            long: "The 14-inch MacBook Pro with M3 Max features a 14-core CPU and 30-core GPU, making it a portable workstation that can handle Octane rendering and complex video editing on the go."
        },
        specifications: {
            "Processor": "Apple M3 Max (14-core CPU)",
            "Graphics": "30-core Apple GPU",
            "Memory": "36GB Unified Memory",
            "Display": "14.2-inch Liquid Retina XDR (120Hz ProMotion)",
            "Storage": "1TB Superfast SSD",
            "Battery": "Up to 18 hours Apple TV app movie playback"
        },
        attributes: {
            "Processor": "Apple M3",
            "RAM": "32GB",
            "Storage": "1TB SSD",
            "Screen Size": "14\"",
            "Brand": "Apple"
        },
        sourceImage: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=1000",
        isFeatured: true
    },
    {
        name: "Logitech MX Master 3S",
        brand: "Logitech",
        categoryName: "Laptop Accessories",
        subcategoryName: "Bags & Sleeves",
        price: 10995,
        salePrice: 8995,
        stock: 50,
        description: {
            short: "An icon, remastered. Now with 8K DPI and silent clicks.",
            long: "MX Master 3S is a remake of the most legendary mouse ever. Enjoy tactile scrolls with MagSpeed wheel and pixel-perfect precision on any surface—even glass."
        },
        specifications: {
            "Sensor": "8000 DPI Darkfield High Precision",
            "Buttons": "7 Buttons (Left/Right-click, Back/Forward, App-Switch, Wheel mode-shift, Middle click)",
            "Connectivity": "Logi Bolt USB Receiver & Bluetooth Low Energy",
            "Battery": "Rechargeable Li-Po (500 mAh); 70 days on a full charge",
            "Weight": "141 g"
        },
        attributes: {
            "Brand": "Logitech"
        },
        sourceImage: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=1000"
    },
    {
        name: "Razer BlackWidow V4 Pro",
        brand: "Razer",
        categoryName: "Laptop Accessories",
        subcategoryName: "Bags & Sleeves", 
        price: 24999,
        salePrice: 22499,
        stock: 15,
        description: {
            short: "The battlestation command center for true enthusiasts.",
            long: "Featuring all-new Razer Command Dial and 8 dedicated macro keys. Immerse yourself with 2-side underglow and per-key lighting powered by Razer Chroma™ RGB."
        },
        specifications: {
            "Switches": "Razer Green Mechanical (Clicky & Tactile)",
            "Lighting": "Razer Chroma RGB with Underglow",
            "Wrist Rest": "Plush Leatherette with Underglow",
            "Polling Rate": "Native 8000Hz Ultra-polling",
            "Macros": "5 Dedicated side keys + 3 Side buttons"
        },
        attributes: {
            "Brand": "Razer"
        },
        sourceImage: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=1000"
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
        console.log('✅ Connected to MongoDB');

        for (const p of products) {
            console.log(`\nProcessing product: ${p.name}...`);

            // 1. Resolve Categories
            const rootCat = await Category.findOne({ name: p.categoryName, level: 1 });
            const subCat = await Category.findOne({ name: p.subcategoryName, parent: rootCat?._id });

            if (!rootCat) {
                console.warn(`⚠️ Root Category "${p.categoryName}" not found. Skipping.`);
                continue;
            }

            // 2. Upload Image to Cloudinary
            console.log(`  Uploading image to Cloudinary...`);
            const uploadRes = await cloudinary.uploader.upload(p.sourceImage, {
                folder: 'infinitytech/products',
                public_id: slugify(p.name, { lower: true, remove: /[*+~.()'"!:@]/g }),
                overwrite: true
            });

            // 3. Prepare Product Object
            const productData = {
                name: p.name,
                slug: slugify(p.name, { lower: true, remove: /[*+~.()'"!:@]/g }),
                sku: `INF-${p.brand.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                brand: p.brand,
                description: p.description,
                category: rootCat._id,
                subcategory: subCat ? subCat._id : null,
                price: p.price,
                salePrice: p.salePrice,
                stock: p.stock,
                images: [{ url: uploadRes.secure_url, isPrimary: true }],
                specifications: p.specifications, // Mongoose handles Map conversion from Object
                attributes: p.attributes,
                status: {
                    isActive: true,
                    isDeleted: false,
                    isFeatured: p.isFeatured || false
                },
                isFeatured: p.isFeatured || false,
                isActive: true,
                isDeleted: false
            };

            // 4. Save/Update
            const result = await Product.findOneAndUpdate(
                { name: p.name },
                productData,
                { upsert: true, new: true }
            );

            console.log(`✅ Seeded: ${result.name} (${result.sku})`);
        }

        console.log('\n✨ Expanded Product Portfolio seeded successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seed();
