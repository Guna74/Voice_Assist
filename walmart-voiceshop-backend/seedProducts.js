const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const products = [
  {
    name: "iPhone 15 Pro",
    category: "Electronics",
    price: 999.99,
    description: "Latest iPhone with advanced camera system",
    image: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-family-hero",
    rating: 4.8,
    stock: 25,
    onSale: false
  },
  {
    name: "Samsung Galaxy S24",
    category: "Electronics",
    price: 899.99,
    description: "Flagship Android phone with AI features",
    image: "https://images.samsung.com/is/image/samsung/p6pim/in/sm-s911ezgdinu/gallery/in-galaxy-s24-s911-534349-sm-s911ezgdinu-534349-1.jpg",
    rating: 4.7,
    stock: 30,
    onSale: true,
    originalPrice: 999.99
  },
  {
    name: "MacBook Air M3",
    category: "Electronics",
    price: 1199.99,
    description: "Ultra-thin laptop with M3 chip",
    image: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/macbook-air-m3-hero",
    rating: 4.9,
    stock: 15,
    onSale: false
  },
  {
    name: "AirPods Pro",
    category: "Electronics",
    price: 249.99,
    description: "Wireless earbuds with noise cancellation",
    image: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/airpods-pro-2nd-gen",
    rating: 4.6,
    stock: 50,
    onSale: true,
    originalPrice: 299.99
  },
  {
    name: "Men's Casual Shirt",
    category: "Clothing",
    price: 24.99,
    description: "Comfortable cotton casual shirt",
    image: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=1000",
    rating: 4.3,
    stock: 100,
    onSale: false
  },
  {
    name: "Women's Running Shoes",
    category: "Clothing",
    price: 79.99,
    description: "Lightweight athletic shoes for running",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000",
    rating: 4.5,
    stock: 75,
    onSale: true,
    originalPrice: 99.99
  },
  {
    name: "Winter Jacket",
    category: "Clothing",
    price: 89.99,
    description: "Warm winter jacket with hood",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000",
    rating: 4.4,
    stock: 40,
    onSale: false
  },
  {
    name: "Jeans",
    category: "Clothing",
    price: 49.99,
    description: "Classic blue denim jeans",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1000",
    rating: 4.2,
    stock: 120,
    onSale: false
  },
  {
    name: "Coffee Maker",
    category: "Home",
    price: 129.99,
    description: "Programmable coffee maker with timer",
    image: "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?q=80&w=1000",
    rating: 4.6,
    stock: 35,
    onSale: true,
    originalPrice: 159.99
  },
  {
    name: "Vacuum Cleaner",
    category: "Home",
    price: 199.99,
    description: "Bagless upright vacuum cleaner",
    image: "https://images.unsplash.com/photo-1595526117664-9d9f3368cda8?q=80&w=1000",
    rating: 4.4,
    stock: 20,
    onSale: false
  },
  {
    name: "Dining Table",
    category: "Home",
    price: 399.99,
    description: "Wooden dining table for 6 people",
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6354f?q=80&w=1000",
    rating: 4.7,
    stock: 10,
    onSale: false
  },
  {
    name: "Bedding Set",
    category: "Home",
    price: 79.99,
    description: "Queen size bedding set with pillowcases",
    image: "https://images.unsplash.com/photo-1616627981435-4c40d6489d3d?q=80&w=1000",
    rating: 4.3,
    stock: 60,
    onSale: true,
    originalPrice: 99.99
  },
  {
    name: "Organic Bananas",
    category: "Groceries",
    price: 2.99,
    description: "Fresh organic bananas, per bunch",
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=1000",
    rating: 4.5,
    stock: 200,
    onSale: false
  },
  {
    name: "Whole Milk",
    category: "Groceries",
    price: 3.49,
    description: "Fresh whole milk, 1 gallon",
    image: "https://images.unsplash.com/photo-1561350111-7daa4f284bc6?q=80&w=1000",
    rating: 4.4,
    stock: 150,
    onSale: false
  },
  {
    name: "Bread",
    category: "Groceries",
    price: 2.49,
    description: "Whole wheat bread loaf",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000",
    rating: 4.2,
    stock: 80,
    onSale: true,
    originalPrice: 2.99
  },
  {
    name: "Chicken Breast",
    category: "Groceries",
    price: 8.99,
    description: "Fresh chicken breast, per pound",
    image: "https://images.unsplash.com/photo-1606921231201-3847d2cda807?q=80&w=1000",
    rating: 4.6,
    stock: 45,
    onSale: false
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    await Product.deleteMany({});
    console.log('Cleared existing products');

    await Product.insertMany(products);
    console.log('Seeded products successfully');

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
