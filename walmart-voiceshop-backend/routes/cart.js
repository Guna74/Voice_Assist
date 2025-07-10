const express = require('express');
const Cart    = require('../models/Cart');
const router  = express.Router();

/* ───────────── GET  /api/cart/:userId ───────────── */
router.get('/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    res.json(cart ? cart.items : []);
  } catch (err) {
    console.error('Cart GET error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

/* ───────────── POST /api/cart/:userId ─────────────
   Replaces or updates the whole cart for this user  */
router.post('/:userId', async (req, res) => {
  try {
    const { items = [] } = req.body;               // always an array
    let cart = await Cart.findOne({ userId: req.params.userId });

    if (cart) {                                    // update
      cart.items     = items;
      cart.updatedAt = new Date();
      await cart.save();
    } else {                                       // create
      cart = await Cart.create({ userId: req.params.userId, items });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Cart POST error:', err);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

module.exports = router;
