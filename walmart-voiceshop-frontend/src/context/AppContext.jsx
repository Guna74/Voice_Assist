import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { cartAPI, auth } from '../services/api';
import axios from 'axios';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Generate sessionId that includes userId
  const [sessionId] = useState(() => {
    const userId = auth.getUserId(); // Get the userId first
    return `session:${userId}`; // Format: "session:user_timestamp_randomstring"
  });

  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load cart from database on app initialization
  useEffect(() => {
    loadCartFromDB();
  }, []);

  // Load orders from database on app initialization
  useEffect(() => {
    loadOrdersFromDB();
  }, []);

  const loadCartFromDB = async () => {
    try {
      setIsLoading(true);
      const cartItems = await cartAPI.getCart();
      const items = Array.isArray(cartItems) ? cartItems :
        cartItems.items ? cartItems.items :
        cartItems.cart ? cartItems.cart : [];
      setCart(items);
      setError(null);
    } catch (error) {
      console.error('Failed to load cart from database:', error);
      setError('Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrdersFromDB = async () => {
    try {
      const userId = auth.getUserId();
      const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
      const response = await axios.get(`${BASE_URL}/api/orders/${userId}`);
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load orders from database:', error);
      setOrders([]);
    }
  };

  const updateCart = async (newCart) => {
    try {
      setCart(newCart);
      await cartAPI.saveCart(newCart);
    } catch (error) {
      console.error('Failed to save cart to database:', error);
    }
  };

  const addToCart = async (product, quantity = 1, selectedVariants = {}) => {
    try {
      const response = await cartAPI.addToCart(
        product._id,
        product.name,
        product.price,
        product.image,
        quantity,
        selectedVariants
      );

      if (response.success || response.cartId) {
        const existingIndex = cart.findIndex(item =>
          item._id === product._id &&
          JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
        );

        if (existingIndex > -1) {
          const updatedCart = [...cart];
          updatedCart[existingIndex].quantity += quantity;
          setCart(updatedCart);
        } else {
          const newItem = {
            ...product,
            quantity,
            selectedVariants,
            price: product.price
          };
          setCart([...cart, newItem]);
        }
        return { success: true };
      } else {
        throw new Error(response.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = async (productId, selectedVariants = {}) => {
    try {
      await cartAPI.removeFromCart(productId, selectedVariants);
      const updatedCart = cart.filter(item =>
        !(item._id === productId &&
          JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants))
      );
      setCart(updatedCart);
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  const updateCartItemQuantity = async (productId, quantity, selectedVariants = {}) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId, selectedVariants);
        return;
      }
      await cartAPI.updateCartItem(productId, quantity, selectedVariants);
      const updatedCart = cart.map(item =>
        item._id === productId &&
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
          ? { ...item, quantity }
          : item
      );
      setCart(updatedCart);
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clearCart();
      setCart([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const getCartSummary = () => {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return {
      itemCount,
      total: parseFloat(total.toFixed(2))
    };
  };

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  const createOrder = async (orderData) => {
    try {
      const userId = auth.getUserId();
      const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';
      const response = await axios.post(`${BASE_URL}/api/orders/${userId}`, orderData);
      setOrders(prev => [response.data, ...prev]);
      await cartAPI.clearCart();
      setCart([]);
      return { success: true, order: response.data };
    } catch (error) {
      console.error('Failed to create order:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    sessionId,
    currentLanguage,
    setCurrentLanguage,
    cart,
    setCart: updateCart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    getCartSummary,
    loadCartFromDB,
    isLoading,
    error,
    orders,
    setOrders,
    createOrder,
    messages,
    addMessage
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {

  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
