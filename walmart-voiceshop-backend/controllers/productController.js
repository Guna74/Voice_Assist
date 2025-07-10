const Product = require('../models/Product');

exports.getProducts = async (req, res) => {
  try {
    const { category, search, size, shoeSize, ram, storage } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    // Variant filtering
    if (size) query['variants.size'] = size;
    if (shoeSize) query['variants.shoeSize'] = Number(shoeSize);
    if (ram) query['variants.ram'] = ram;
    if (storage) query['variants.storage'] = storage;

    const products = await Product.find(query);
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Not found' });
    res.json(prod);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};
