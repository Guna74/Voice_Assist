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
    image: "https://images.unsplash.com/photo-1700805732158-6f1169780ca7?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    image: "https://images.unsplash.com/photo-1706372124821-952b522c8961?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    image: "https://images.unsplash.com/photo-1710905219584-8521769e3678?q=80&w=1255&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    image: "https://plus.unsplash.com/premium_photo-1679513691485-711d030f7e94?q=80&w=1113&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    image: "https://plus.unsplash.com/premium_photo-1671656349240-c2dac4acfc2d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    rating: 4.3,
    onSale: false,
    variants: [
      { size: "S", price: 19.99, stock: 100 },
      { size: "M", price: 19.99, stock: 120 },
      { size: "L", price: 19.99, stock: 110 },
      { size: "XL", price: 19.99, stock: 80 }
    ],
    sizeChart: "https://sportsqvest.com/cdn/shop/products/SQVMen_sTeesSizeChart-NewGraphic_CottonTees_8a75f4a5-d0c8-449e-9fae-8473bb63c2ac_1200x.jpg?v=1611217835"
  },
  {
    name: "Women's Running Leggings",
    category: "Clothing",
    description: "High-waist workout leggings",
    image: "https://contents.mediadecathlon.com/p2606625/718f24594fb800bdfed538605c1dff2e/p2606625.jpg",
    rating: 4.6,
    onSale: true,
    originalPrice: 49.99,
    variants: [
      { size: "XS", price: 39.99, stock: 60 },
      { size: "S", price: 39.99, stock: 80 },
      { size: "M", price: 39.99, stock: 90 },
      { size: "L", price: 39.99, stock: 50 }
    ],
    sizeChart: "https://sportsqvest.com/cdn/shop/products/SQVMen_sTeesSizeChart-NewGraphic_CottonTees_8a75f4a5-d0c8-449e-9fae-8473bb63c2ac_1200x.jpg?v=1611217835"
  },
  {
    name: "Men's Hoodie",
    category: "Clothing",
    description: "Pullover hoodie with pouch pocket",
    image: 'https://plus.unsplash.com/premium_photo-1689327920663-406abecf9805?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    rating: 4.4,
    onSale: false,
    variants: [
      { size: "M", price: 49.99, stock: 40 },
      { size: "L", price: 49.99, stock: 50 }
    ],
    sizeChart: "https://sportsqvest.com/cdn/shop/products/SQVMen_sTeesSizeChart-NewGraphic_CottonTees_8a75f4a5-d0c8-449e-9fae-8473bb63c2ac_1200x.jpg?v=1611217835"
  },
  {
    name: "Women's Blouse",
    category: "Clothing",
    description: "Elegant office blouse",
    image: "https://m.media-amazon.com/images/I/61-CpunxVsL._SX679_.jpg",
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
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    image: "https://media.istockphoto.com/id/1432332350/photo/slip-ons-of-dark-blue-color-on-female-legs-bright-blue-rubber-running-track.webp?a=1&b=1&s=612x612&w=0&k=20&c=D-oryaHSWIdwd3F8uPZhacHh7r9BNnrkkhu98ym3o6w=",
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
    image: "https://media.istockphoto.com/id/2182301569/photo/nuggets-cooked-in-an-air-fryer-cooking-in-an-air-fryer.jpg?s=2048x2048&w=is&k=20&c=fLGE94wkbEI9wJbFJiUel8Ts_vR5kG1IyDI6jXeDAU8=",
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
    image: "https://media.istockphoto.com/id/1604033990/photo/coffee-maker-corner.webp?a=1&b=1&s=612x612&w=0&k=20&c=h5AuYB8bksCO81SJrpTbgvJJQbEMzif9uIgBb14QieM=",
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
    image: "https://images.unsplash.com/photo-1576186726188-c9d70843790f?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
