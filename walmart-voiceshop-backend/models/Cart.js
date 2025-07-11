const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    category: String,
    description: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    selectedVariants: {
      size: String,
      shoeSize: String,
      ram: String,
      storage: String
    },
    variants: [{
      size: String,
      shoeSize: String,
      ram: String,
      storage: String,
      price: Number
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

cartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
