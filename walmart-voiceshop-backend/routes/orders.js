const express = require('express');
const Order   = require('../models/Order');
const router  = express.Router();

/* ───────────── GET  /api/orders/:userId ───────────── */
router.get('/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
                              .sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Orders GET error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/* ───────────── POST /api/orders/:userId ─────────────
   Creates a new order from the current cart          */
router.post('/:userId', async (req, res) => {
  try {
    const { items = [], total = 0, customer = {} } = req.body;

    const order = await Order.create({
      userId:   req.params.userId,
      items,
      total,
      customer,
      status:   'Completed',
      date:     new Date()
    });

    res.json(order);
  } catch (err) {
    console.error('Orders POST error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;
