// src/components/Cart.jsx

import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import './Cart.css';

export default function Cart() {
  const { cart, setCart, orders, setOrders } = useContext(AppContext);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Helper to get a valid price, falling back to first variant or zero
  const getItemPrice = (item) => {
    if (item.price != null) return item.price;
    if (item.variants?.length > 0 && item.variants[0].price != null) {
      return item.variants[0].price;
    }
    return 0;
  };

  const total = cart.reduce((sum, item) => {
    const price = getItemPrice(item);
    const qty = item.quantity || 0;
    return sum + price * qty;
  }, 0);

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      setCart(cart.map(item =>
        item._id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item._id !== id));
  };

  const checkout = () => {
    if (!name.trim() || !address.trim()) {
      alert('Please enter your name and address to checkout.');
      return;
    }

    setIsCheckingOut(true);

    setTimeout(() => {
      const order = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        items: [...cart],
        total: Number(total.toFixed(2)),
        customer: { name: name.trim(), address: address.trim() },
        status: 'Completed'
      };

      setOrders([...orders, order]);
      setCart([]);
      setName('');
      setAddress('');
      setIsCheckingOut(false);
      alert('🎉 Order placed successfully! Thank you for shopping with Walmart VoiceShop!');
    }, 2000);
  };

  if (cart.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>
          Start shopping to add items to your cart. You can use voice commands or browse our products!
        </p>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h2 className="cart-title">
        🛒 Shopping Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
      </h2>

      <div className="cart-items">
        {cart.map(item => {
          const price = getItemPrice(item);
          const qty = item.quantity || 0;
          return (
            <div key={item._id} className="cart-item">
              <div className="cart-item-info">
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item-image"
                />
                <div className="cart-item-meta">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <p className="cart-item-unit-price">
                    ${price.toFixed(2)} each
                  </p>
                  {/* Show selected variants if present */}
                  {item.selectedVariants && (
                    <div style={{ fontSize: '0.95em', color: '#0071ce', marginTop: 2 }}>
                      {Object.entries(item.selectedVariants).map(([key, value]) => (
                        <span key={key} style={{ marginRight: 8 }}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="cart-item-controls">
                <div className="quantity-controls">
                  <button
                    onClick={() => updateQuantity(item._id, qty - 1)}
                    className="qty-btn decrement"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="qty-display">{qty}</span>
                  <button
                    onClick={() => updateQuantity(item._id, qty + 1)}
                    className="qty-btn increment"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="cart-item-subtotal">
                  ${(price * qty).toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem(item._id)}
                  className="remove-item-btn"
                  aria-label={`Remove ${item.name} from cart`}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cart-total">
        <span className="total-label">Total:</span>
        <span className="total-value">${total.toFixed(2)}</span>
      </div>

      <form
        className="checkout-form"
        onSubmit={e => {
          e.preventDefault();
          checkout();
        }}
      >
        <h3 className="checkout-title">📦 Checkout Information</h3>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full Name"
          className="checkout-input"
          required
          disabled={isCheckingOut}
        />

        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Delivery Address"
          className="checkout-input"
          rows="3"
          required
          disabled={isCheckingOut}
        />

        <button
          type="submit"
          className="checkout-button"
          disabled={isCheckingOut || !name.trim() || !address.trim()}
        >
          {isCheckingOut ? (
            <span className="checkout-loading">
              <span className="spinner"></span> Processing...
            </span>
          ) : (
            <>💳 Place Order - ${total.toFixed(2)}</>
          )}
        </button>
      </form>
    </div>
  );
}
