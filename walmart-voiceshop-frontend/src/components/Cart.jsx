import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export default function Cart() {
  const { cart, setCart, orders, setOrders } = useContext(AppContext);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

  const checkout = async () => {
    if (!name.trim() || !address.trim()) {
      alert('Please enter your name and address to checkout.');
      return;
    }

    setIsCheckingOut(true);

    // Simulate checkout process
    setTimeout(() => {
      const order = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        items: [...cart],
        total,
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
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛒</div>
        <h3>Your cart is empty</h3>
        <p>Start shopping to add items to your cart. You can use voice commands or browse our products!</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '30px', borderRadius: '20px', margin: '20px 0' }}>
      <h2 style={{ color: '#0071ce', marginBottom: '25px', fontSize: '28px', fontWeight: '700' }}>
        🛒 Shopping Cart ({cart.length} items)
      </h2>
      
      <div style={{ marginBottom: '30px' }}>
        {cart.map(item => (
          <div key={item._id} className="cart-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
              <img 
                src={item.image} 
                alt={item.name}
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  objectFit: 'cover', 
                  borderRadius: '10px' 
                }}
              />
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{item.name}</h4>
                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                  ${item.price.toFixed(2)} each
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  style={{
                    background: '#e9ecef',
                    border: 'none',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span style={{ 
                  minWidth: '30px', 
                  textAlign: 'center', 
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  style={{
                    background: '#0071ce',
                    color: 'white',
                    border: 'none',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              
              <div style={{ 
                fontWeight: '700', 
                color: '#0071ce', 
                fontSize: '18px',
                minWidth: '80px',
                textAlign: 'right'
              }}>
                ${(item.price * item.quantity).toFixed(2)}
              </div>
              
              <button
                onClick={() => removeItem(item._id)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
                aria-label={`Remove ${item.name} from cart`}
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '2px solid #e7f4ff',
          paddingTop: '20px'
        }}>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#495057' }}>
            Total:
          </span>
          <span style={{ fontSize: '32px', fontWeight: '800', color: '#0071ce' }}>
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      <form className="checkout-form" onSubmit={(e) => { e.preventDefault(); checkout(); }}>
        <h3 style={{ color: '#0071ce', marginBottom: '15px' }}>📦 Checkout Information</h3>
        
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          className="checkout-input"
          required
          disabled={isCheckingOut}
        />
        
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery Address"
          className="checkout-input"
          rows="3"
          required
          disabled={isCheckingOut}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
        
        <button 
          type="submit" 
          className="checkout-button"
          disabled={isCheckingOut || !name.trim() || !address.trim()}
          style={{ 
            opacity: isCheckingOut ? 0.7 : 1,
            cursor: isCheckingOut ? 'not-allowed' : 'pointer'
          }}
        >
          {isCheckingOut ? (
            <>
              <div className="spinner" style={{ 
                width: '20px', 
                height: '20px', 
                marginRight: '10px',
                borderWidth: '2px'
              }}></div>
              Processing...
            </>
          ) : (
            <>💳 Place Order - ${total.toFixed(2)}</>
          )}
        </button>
      </form>
    </div>
  );
}
