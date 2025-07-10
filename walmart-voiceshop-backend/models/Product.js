const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  // For clothing
  size: String,
  // For footwear
  shoeSize: Number,
  width: String,
  // For electronics
  ram: String,
  storage: String,
  // For all
  stock: { type: Number, default: 0 },
  price: Number
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Electronics', 'Clothing', 'Footwear', 'Home', 'Groceries'] 
  },
  price:    { type: Number, required: false, min: 0 },
  description: { type: String, required: true },
  image: { type: String, default: '' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  stock: { type: Number, required: false, min: 0 },
  onSale: { type: Boolean, default: false },
  originalPrice: { type: Number, min: 0 },
  // New fields
  variants: [variantSchema],
  sizeChart: String // For clothing
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
// This schema supports:
// - Multiple variants for clothing and footwear (size, shoe size, width)
// - Variants for electronics (RAM, storage)