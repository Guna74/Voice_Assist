const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

// Helper function to get or create session ID
const getSessionId = (req) => {
    // Check if userId is provided in request body or params
    const userId = req.body?.userId || req.params?.userId || req.query?.userId;
  
    if (userId) {
      return userId;
    }
  
    // If no userId provided, generate a temporary session ID
    // In a real app, you'd get this from authentication middleware
    const sessionId = req.sessionID || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return sessionId;
};

// Add item to cart
router.post('/add', async (req, res) => {
    try {
      const { productId, name, price, image, quantity = 1, selectedVariants = {} } = req.body;
      const userId = getSessionId(req);
    
      console.log('Adding to cart:', { productId, name, price, userId }); // Debug log
    
      if (!productId || !name || !price) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: productId, name, price' 
        });
      }

      // Find or create cart for user
      let cart = await Cart.findOne({ userId });
    
      if (!cart) {
        cart = new Cart({
          userId,
          items: []
        });
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(item => 
        item._id.toString() === productId &&
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
      );

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        cart.items[existingItemIndex].quantity += parseInt(quantity);
      } else {
        // Add new item to cart
        cart.items.push({
          _id: productId,
          name,
          price: parseFloat(price),
          image,
          quantity: parseInt(quantity),
          selectedVariants
        });
      }

      await cart.save();

      res.json({ 
        success: true, 
        message: 'Item added to cart',
        cart: cart.items,
        cartId: cart._id.toString(),
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
});

// Get cart items
router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const cart = await Cart.findOne({ userId });
    
      if (!cart) {
        return res.json({
          success: true,
          items: [],
          cartId: null,
          itemCount: 0,
          total: 0
        });
      }
    
      const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
      res.json({
        success: true,
        items: cart.items,
        cartId: cart._id.toString(),
        itemCount,
        total: parseFloat(total.toFixed(2))
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch cart' 
      });
    }
});

// Update cart item quantity
router.put('/update', async (req, res) => {
    try {
      const { productId, quantity, selectedVariants = {} } = req.body;
      const userId = getSessionId(req);
    
      if (!productId) {
        return res.status(400).json({ 
          success: false, 
          error: 'productId is required' 
        });
      }

      const cart = await Cart.findOne({ userId });
    
      if (!cart) {
        return res.status(404).json({ 
          success: false, 
          error: 'Cart not found' 
        });
      }
    
      const itemIndex = cart.items.findIndex(item => 
        item._id.toString() === productId &&
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
      );
    
      if (itemIndex > -1) {
        if (parseInt(quantity) <= 0) {
          // Remove item if quantity is 0 or less
          cart.items.splice(itemIndex, 1);
        } else {
          cart.items[itemIndex].quantity = parseInt(quantity);
        }
      
        await cart.save();
        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.json({ 
          success: true, 
          message: 'Cart updated', 
          cart: cart.items,
          cartId: cart._id.toString(),
          itemCount,
          total: parseFloat(total.toFixed(2))
        });
      } else {
        res.status(404).json({ 
          success: false, 
          error: 'Item not found in cart' 
        });
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
});

// Remove item from cart
router.delete('/remove', async (req, res) => {
    try {
      const { productId, selectedVariants = {} } = req.body;
      const userId = getSessionId(req);
    
      if (!productId) {
        return res.status(400).json({ 
          success: false, 
          error: 'productId is required' 
        });
      }

      const cart = await Cart.findOne({ userId });
    
      if (!cart) {
        return res.status(404).json({ 
          success: false, 
          error: 'Cart not found' 
        });
      }
    
      cart.items = cart.items.filter(item => 
        !(item._id.toString() === productId &&
          JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants))
      );
    
      await cart.save();
      const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
      res.json({ 
        success: true, 
        message: 'Item removed from cart', 
        cart: cart.items,
        cartId: cart._id.toString(),
        itemCount,
        total: parseFloat(total.toFixed(2))
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
});

// Clear cart
router.delete('/clear/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
    
      const cart = await Cart.findOneAndUpdate(
        { userId },
        { 
          items: [],
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    
      res.json({ 
        success: true, 
        message: 'Cart cleared',
        cartId: cart._id.toString(),
        itemCount: 0,
        total: 0
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
});

// Get cart summary (count and total)
router.get('/summary/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const cart = await Cart.findOne({ userId });
    
      if (!cart || !cart.items.length) {
        return res.json({ 
          success: true,
          itemCount: 0, 
          total: 0,
          cartId: null
        });
      }
    
      const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
      res.json({ 
        success: true,
        itemCount, 
        total: parseFloat(total.toFixed(2)),
        cartId: cart._id.toString()
      });
    } catch (error) {
      console.error('Error getting cart summary:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get cart summary' 
      });
    }
});

// Legacy route for backward compatibility - Get cart items (session-based)
router.get('/items', async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const cart = await Cart.findOne({ sessionId });
    
      if (!cart) {
        return res.json({ success: true, items: [] });
      }
    
      res.json({ success: true, items: cart.items, cart });
    } catch (error) {
      console.error('Error getting cart items:', error);
      res.status(500).json({ success: false, error: error.message });
    }
});

// Legacy route for backward compatibility - Remove item by productId param
router.delete('/remove/:productId', async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const { productId } = req.params;
    
      const cart = await Cart.findOne({ sessionId });
    
      if (!cart) {
        return res.status(404).json({ success: false, error: 'Cart not found' });
      }
    
      cart.items = cart.items.filter(item => item.productId !== productId);
      await cart.save();
    
      res.json({ success: true, message: 'Item removed from cart', cart });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ success: false, error: error.message });
    }
});

// Legacy route for backward compatibility - Clear cart (session-based)
router.delete('/clear', async (req, res) => {
    try {
      const sessionId = getSessionId(req);
    
      await Cart.findOneAndDelete({ sessionId });
    
      res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
