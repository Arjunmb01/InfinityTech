import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/categorySchema.js';
import { connectDb, closeDb } from '../config/db.js';
import slugify from 'slugify';

dotenv.config();

const expandedLaptopCategories = [
    // Subcategories for Laptops
    {
        name: 'Student Laptops',
        parentName: 'Laptops',
        description: 'Budget-friendly and durable laptops perfect for students and academic life.',
        filters: [
            { name: 'Battery Life', type: 'checkbox', options: ['Under 6 Hours', '6-10 Hours', 'Over 10 Hours'] },
            { name: 'Weight', type: 'checkbox', options: ['Lightweight (<1.5kg)', 'Standard (>1.5kg)'] }
        ],
        seo: {
            title: 'Student Laptops - Durable & Affordable Education PCs',
            description: 'Find the best laptops for school and university. Reliable performance at student-friendly prices.',
            keywords: ['student laptops', 'back to school', 'education laptops', 'affordable laptops']
        }
    },
    {
        name: 'Chromebooks',
        parentName: 'Laptops',
        description: 'Fast, secure, and easy-to-use laptops running ChromeOS.',
        filters: [
            { name: 'Storage Type', type: 'checkbox', options: ['eMMC', 'SSD'] },
            { name: 'Screen Size', type: 'checkbox', options: ['11"', '12"', '14"'] }
        ],
        seo: {
            title: 'Chromebooks - Simple & Fast ChromeOS Laptops',
            description: 'Browse our range of Chromebooks from Acer, HP, and Lenovo. Perfect for cloud-based tasks.',
            keywords: ['chromebooks', 'chromeos', 'google laptops', 'affordable computing']
        }
    },
    {
        name: '2-in-1 Convertibles',
        parentName: 'Laptops',
        description: 'The versatility of a tablet with the power of a laptop. Features 360-degree hinges and touchscreens.',
        filters: [
            { name: 'Stylus Support', type: 'checkbox', options: ['Included', 'Supported', 'Not Supported'] },
            { name: 'Touchscreen', type: 'checkbox', options: ['Yes', 'No'] }
        ],
        seo: {
            title: '2-in-1 Convertibles - Versatile Hybrid Laptops',
            description: 'Work and play your way with a 2-in-1 convertible laptop. Shop the latest Surface, Yoga, and Spectre models.',
            keywords: ['2-in-1 laptops', 'convertible laptops', 'touchscreen laptops', 'hybrid notebooks']
        }
    },
    // New Root Category: Laptop Accessories
    {
        name: 'Laptop Accessories',
        description: 'Essential gear to protect, enhance, and power your laptop.',
        filters: [
            { name: 'Brand', type: 'checkbox', options: ['Logitech', 'Razer', 'Dell', 'HP', 'Lenovo', 'Apple'] }
        ],
        seo: {
            title: 'Laptop Accessories - Cases, Chargers & Docks',
            description: 'Complete your setup with high-quality laptop accessories. Bags, chargers, docking stations, and more.',
            keywords: ['laptop accessories', 'laptop bags', 'laptop docking stations', 'chargers']
        },
        isFeatured: true
    },
    // Subcategories for Laptop Accessories
    {
        name: 'Bags & Sleeves',
        parentName: 'Laptop Accessories',
        description: 'Stylish and protective carrying solutions for your laptop.',
        filters: [
            { name: 'Size', type: 'checkbox', options: ['13-14"', '15-16"', '17"+'] },
            { name: 'Type', type: 'checkbox', options: ['Backpack', 'Messenger Bag', 'Sleeve', 'Briefcase'] }
        ],
        seo: {
            title: 'Laptop Bags & Sleeves - Stylish Protection',
            description: 'Keep your laptop safe on the go with our selection of backpacks, sleeves, and bags.',
            keywords: ['laptop bags', 'laptop sleeves', 'carrying cases', 'macbook sleeves']
        }
    },
    {
        name: 'Chargers & Adapters',
        parentName: 'Laptop Accessories',
        description: 'Original and universal power solutions for all major laptop brands.',
        filters: [
            { name: 'Wattage', type: 'checkbox', options: ['45W', '65W', '90W', '100W+', 'USB-C PD'] },
            { name: 'Compatibility', type: 'checkbox', options: ['Universal', 'Brand Direct'] }
        ],
        seo: {
            title: 'Laptop Chargers & Power Adapters',
            description: 'Never run out of power. Find replacement chargers and extra power adapters for your laptop.',
            keywords: ['laptop chargers', 'AC adapters', 'USB-C chargers', 'power supplies']
        }
    },
    {
        name: 'Docking Stations',
        parentName: 'Laptop Accessories',
        description: 'Transform your laptop into a full workstation with a single cable.',
        filters: [
            { name: 'Connection', type: 'checkbox', options: ['USB-C', 'Thunderbolt 3/4', 'Universal USB'] },
            { name: 'Dual Display Support', type: 'checkbox', options: ['Yes', 'No'] }
        ],
        seo: {
            title: 'Laptop Docking Stations - Expand Your Ports',
            description: 'Expand your laptop\'s connectivity with docking stations. Support for dual monitors, Ethernet, team more.',
            keywords: ['docking stations', 'usb-c docks', 'thunderbolt docks', 'port replicators']
        }
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await connectDb();
        console.log('✅ Connected to MongoDB');

        for (const catData of expandedLaptopCategories) {
            let parentId = null;
            if (catData.parentName) {
                const parent = await Category.findOne({ name: catData.parentName });
                if (parent) {
                    parentId = parent._id;
                } else {
                    console.warn(`⚠️ Parent category "${catData.parentName}" not found for "${catData.name}". Creating it as root if it doesn't exist? (Skipping nesting for this one)`);
                }
            }

            const slug = slugify(catData.name, { lower: true });
            
            const categoryUpdate = {
                name: catData.name,
                slug: slug,
                description: catData.description,
                parent: parentId,
                filters: catData.filters,
                seo: catData.seo,
                isFeatured: catData.isFeatured || false,
                status: {
                    isActive: true,
                    isDeleted: false,
                    isFeatured: catData.isFeatured || false,
                    isAvailable: true
                }
            };

            const result = await Category.findOneAndUpdate(
                { slug: slug },
                categoryUpdate,
                { upsert: true, new: true, runValidators: true }
            );
            
            console.log(`✅ ${result ? 'Updated/Created' : 'Failed to seed'} category: ${catData.name}`);
        }

        console.log('\n✨ Laptop-related expansion categories seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding expanded categories:', error);
    } finally {
        await closeDb();
        process.exit(0);
    }
}

seed();
