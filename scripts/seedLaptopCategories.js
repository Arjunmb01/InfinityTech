import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/categorySchema.js';
import { connectDb, closeDb } from '../config/db.js';
import slugify from 'slugify';

dotenv.config();

const laptopCategories = [
    {
        name: 'Laptops',
        description: 'Explore our wide range of laptops, from high-performance machines to everyday ultra-portables.',
        filters: [
            { name: 'Processor', type: 'checkbox', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1', 'Apple M2', 'Apple M3'] },
            { name: 'RAM', type: 'checkbox', options: ['8GB', '16GB', '32GB', '64GB'] },
            { name: 'Storage', type: 'checkbox', options: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'] },
            { name: 'Screen Size', type: 'checkbox', options: ['13"', '14"', '15"', '16"', '17"'] },
            { name: 'Brand', type: 'checkbox', options: ['Apple', 'ASUS', 'Dell', 'HP', 'Lenovo', 'MSI', 'Acer'] }
        ],
        seo: {
            title: 'Laptops - High Performance & Everyday Notebooks',
            description: 'Buy the latest laptops online at InfinityTech. Find the best deals on Apple, Dell, HP, Lenovo, and more.',
            keywords: ['laptops', 'notebooks', 'gaming laptops', 'business laptops', 'buy laptops online']
        }
    },
    {
        name: 'Gaming Laptops',
        parentName: 'Laptops',
        description: 'Dominate the competition with high-refresh rate displays and powerful dedicated GPUs.',
        filters: [
            { name: 'GPU', type: 'checkbox', options: ['NVIDIA RTX 4050', 'NVIDIA RTX 4060', 'NVIDIA RTX 4070', 'NVIDIA RTX 4080', 'NVIDIA RTX 4090'] },
            { name: 'Refresh Rate', type: 'checkbox', options: ['144Hz', '165Hz', '240Hz', '360Hz'] }
        ],
        seo: {
            title: 'Gaming Laptops - Ultimate Performance for Gamers',
            description: 'Level up with the most powerful gaming laptops. Featuring NVIDIA RTX graphics and high refresh rate screens.',
            keywords: ['gaming laptops', 'RTX laptops', 'gaming notebooks', 'high performance laptops']
        },
        isFeatured: true
    },
    {
        name: 'Business Laptops',
        parentName: 'Laptops',
        description: 'Secure, reliable, and portable laptops designed for the modern professional.',
        filters: [
            { name: 'Security Features', type: 'checkbox', options: ['Fingerprint Reader', 'TPM 2.0', 'Webcam Shutter'] }
        ],
        seo: {
            title: 'Business Laptops - Professional & Secure Notebooks',
            description: 'Boost productivity with our range of business laptops. Built for security, reliability, and long battery life.',
            keywords: ['business laptops', 'professional laptops', 'work notebooks', 'thinkpad', 'latitude']
        }
    },
    {
        name: 'Thin & Light',
        parentName: 'Laptops',
        description: 'Feather-weight laptops that don\'t compromise on power, perfect for life on the go.',
        filters: [
            { name: 'Weight', type: 'checkbox', options: ['Under 1kg', '1kg - 1.5kg', 'Over 1.5kg'] }
        ],
        seo: {
            title: 'Thin & Light Laptops - Ultraportable Notebooks',
            description: 'Travel light without sacrificing performance. Discover our selection of ultra-portable thin and light laptops.',
            keywords: ['thin and light laptops', 'ultrabooks', 'portable laptops', 'lightweight notebooks']
        }
    },
    {
        name: 'Workstations',
        parentName: 'Laptops',
        description: 'Desktop-class performance in a portable form factor for creative and technical professionals.',
        filters: [
            { name: 'Professional GPU', type: 'checkbox', options: ['NVIDIA RTX A-series', 'AMD Radeon Pro'] },
            { name: 'ECC Memory', type: 'checkbox', options: ['Supported', 'Not Supported'] }
        ],
        seo: {
            title: 'Mobile Workstations - Powerful Laptops for Professionals',
            description: 'High-end mobile workstations for 3D rendering, video editing, and complex engineering tasks.',
            keywords: ['mobile workstations', 'professional laptops', 'rendering laptops', 'precision', 'zbook']
        }
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await connectDb();
        console.log('✅ Connected to MongoDB');

        for (const catData of laptopCategories) {
            let parentId = null;
            if (catData.parentName) {
                const parent = await Category.findOne({ name: catData.parentName });
                if (parent) {
                    parentId = parent._id;
                } else {
                    console.warn(`⚠️ Parent category "${catData.parentName}" not found for "${catData.name}".`);
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

        console.log('\n✨ Laptop categories seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
    } finally {
        await closeDb();
        process.exit(0);
    }
}

seed();
