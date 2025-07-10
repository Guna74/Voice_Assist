const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: String,
  items: [Object], // same structure as cart items
  total: Number,
  customer: {
    name: String,
    address: String
  },
  status: { type: String, default: 'Completed' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
