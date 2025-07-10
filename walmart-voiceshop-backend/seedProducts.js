// walmart-voiceshop-backend/seedProducts.js

const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const products = [
  // --- Electronics ---
  {
    name: "iPhone 15 Pro",
    category: "Electronics",
    description: "Latest iPhone with advanced camera system",
    image: "https://images.unsplash.com/photo-1711642789083-6f9a1f449db1?q=80&w=800",
    rating: 4.8,
    onSale: false,
    variants: [
      { ram: "8GB", storage: "128GB", price: 999.99, stock: 25 },
      { ram: "8GB", storage: "256GB", price: 1099.99, stock: 20 },
      { ram: "16GB", storage: "256GB", price: 1199.99, stock: 15 }
    ]
  },
  {
    name: "Samsung Galaxy S24",
    category: "Electronics",
    description: "Flagship Android phone with AI features",
    image: "https://images.unsplash.com/photo-1603415526960-f7e0328b78ab?q=80&w=800",
    rating: 4.7,
    onSale: true,
    originalPrice: 999.99,
    variants: [
      { ram: "8GB", storage: "128GB", price: 899.99, stock: 30 },
      { ram: "12GB", storage: "256GB", price: 999.99, stock: 25 }
    ]
  },
  {
    name: "MacBook Air M3",
    category: "Electronics",
    description: "Ultra-thin laptop with M3 chip",
    image: "https://images.unsplash.com/photo-1555617117-08fda9b8fdb4?q=80&w=800",
    rating: 4.9,
    onSale: false,
    variants: [
      { ram: "8GB", storage: "256GB", price: 1199.99, stock: 15 },
      { ram: "16GB", storage: "512GB", price: 1499.99, stock: 10 }
    ]
  },
  {
    name: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    description: "Noise canceling wireless headphones",
    image: "https://images.unsplash.com/photo-1585386959984-a4155220bec9?q=80&w=800",
    rating: 4.9,
    onSale: false,
    variants: [
      { ram: "", storage: "", price: 349.99, stock: 40 }
    ]
  },

  // --- Clothing ---
  {
    name: "Men's Casual T-Shirt",
    category: "Clothing",
    description: "100% cotton tee available in multiple sizes",
    image: "https://images.unsplash.com/photo-1585079547124-1467d63c23a0?q=80&w=800",
    rating: 4.3,
    onSale: false,
    variants: [
      { size: "S", price: 19.99, stock: 100 },
      { size: "M", price: 19.99, stock: 120 },
      { size: "L", price: 19.99, stock: 110 },
      { size: "XL", price: 19.99, stock: 80 }
    ],
    sizeChart: "https://example.com/sizechart/tshirt-chart.png"
  },
  {
    name: "Women's Running Leggings",
    category: "Clothing",
    description: "High-waist workout leggings",
    image: "https://images.unsplash.com/photo-1595950657519-08e0ac61c713?q=80&w=800",
    rating: 4.6,
    onSale: true,
    originalPrice: 49.99,
    variants: [
      { size: "XS", price: 39.99, stock: 60 },
      { size: "S", price: 39.99, stock: 80 },
      { size: "M", price: 39.99, stock: 90 },
      { size: "L", price: 39.99, stock: 50 }
    ],
    sizeChart: "https://example.com/sizechart/leggings-chart.png"
  },
  {
    name: "Men's Hoodie",
    category: "Clothing",
    description: "Pullover hoodie with pouch pocket",
    image: "https://images.unsplash.com/photo-1600374175538-40f71262f3aa?q=80&w=800",
    rating: 4.4,
    onSale: false,
    variants: [
      { size: "M", price: 49.99, stock: 40 },
      { size: "L", price: 49.99, stock: 50 }
    ],
    sizeChart: "https://example.com/sizechart/hoodie-chart.png"
  },
  {
    name: "Women's Blouse",
    category: "Clothing",
    description: "Elegant office blouse",
    image: "https://images.unsplash.com/photo-1555529771-7f5991988e14?q=80&w=800",
    rating: 4.3,
    onSale: true,
    originalPrice: 39.99,
    variants: [
      { size: "S", price: 34.99, stock: 50 },
      { size: "M", price: 34.99, stock: 60 },
      { size: "L", price: 34.99, stock: 40 }
    ],
    sizeChart: "https://example.com/sizechart/blouse-chart.png"
  },

  // --- Footwear ---
  {
    name: "Men's Sport Sneakers",
    category: "Footwear",
    description: "Running shoes with arch support",
    image: "https://images.unsplash.com/photo-1580974912829-e4a8bde1b909?q=80&w=800",
    rating: 4.4,
    onSale: false,
    variants: [
      { shoeSize: 8, width: "M", price: 69.99, stock: 50 },
      { shoeSize: 9, width: "M", price: 69.99, stock: 60 },
      { shoeSize: 10, width: "W", price: 69.99, stock: 40 }
    ],
    sizeChart: "https://example.com/sizechart/shoe-chart.png"
  },
  {
    name: "Women's Casual Slip-Ons",
    category: "Footwear",
    description: "Everyday slip-on shoes",
    image: "https://images.unsplash.com/photo-1539159363746-bc97a5e4069d?q=80&w=800",
    rating: 4.2,
    onSale: true,
    originalPrice: 39.99,
    variants: [
      { shoeSize: 6, width: "N", price: 29.99, stock: 70 },
      { shoeSize: 7, width: "N", price: 29.99, stock: 80 },
      { shoeSize: 8, width: "W", price: 29.99, stock: 50 }
    ],
    sizeChart: "https://example.com/sizechart/slip-on-chart.png"
  },

  // --- Home ---
  {
    name: "Instant Vortex Air Fryer",
    category: "Home",
    description: "6‑quart 6‑in‑1 air fryer",
    image: "https://images.unsplash.com/photo-1599423300746-b62533397364?q=80&w=800",
    rating: 4.6,
    onSale: true,
    originalPrice: 99.99,
    variants: [
      { price: 79.99, stock: 25 }
    ]
  },
  {
    name: "Cuisinart 12-Cup Coffee Maker",
    category: "Home",
    description: "Programmable drip coffee maker",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e17b?q=80&w=800",
    rating: 4.5,
    onSale: false,
    variants: [
      { price: 49.99, stock: 40 }
    ]
  },

  // --- Groceries ---
  {
    name: "Organic Bananas (Bunch)",
    category: "Groceries",
    description: "Fresh organic bananas, per bunch",
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=800",
    rating: 4.5,
    onSale: false,
    variants: [
      { price: 2.99, stock: 200 }
    ]
  },
  {
    name: "Whole Milk (1 Gallon)",
    category: "Groceries",
    description: "Fresh whole milk, 1 gallon",
    image: "https://images.unsplash.com/photo-1561350111-7daa4f284bc6?q=80&w=800",
    rating: 4.4,
    onSale: false,
    variants: [
      { price: 3.49, stock: 150 }
    ]
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    await Product.deleteMany({});
    console.log(`Removed all products`);

    await Product.insertMany(products);
    console.log(`Inserted ${products.length} products`);

    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedDatabase();
