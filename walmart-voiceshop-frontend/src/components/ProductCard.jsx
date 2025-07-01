import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function ProductCard({ product }) {
  const { cart, setCart } = useContext(AppContext);

  const addToCart = () => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item => 
        item._id === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

    // Visual feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Added!';
    button.style.background = 'linear-gradient(135deg, #ffc220 0%, #ffab00 100%)';
    button.style.color = '#0071ce';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.style.color = '';
    }, 1500);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#ffc220' : '#e9ecef' }}>
        ★
      </span>
    ));
  };

  return (
    <div className="product-card">
      <img
        src={product.image}
        alt={product.name}
        className="product-image"
        loading="lazy"
      />
      
      <h3 className="product-title">{product.name}</h3>
      
      {product.rating && (
        <div className="product-rating">
          <div>{renderStars(Math.floor(product.rating))}</div>
          <span>({product.rating})</span>
        </div>
      )}
      
      <div className="product-price">
        <span>${product.price.toFixed(2)}</span>
        {product.onSale && (
          <>
            <span className="sale-badge">Sale!</span>
            {product.originalPrice && (
              <span style={{ 
                textDecoration: 'line-through', 
                fontSize: '16px', 
                color: '#6c757d',
                fontWeight: '400'
              }}>
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </>
        )}
      </div>
      
      <p className="product-description">{product.description}</p>
      
      {product.stock && (
        <div style={{ 
          fontSize: '14px', 
          color: product.stock > 10 ? '#28a745' : '#dc3545',
          marginBottom: '15px',
          fontWeight: '600'
        }}>
          {product.stock > 10 ? '✓ In Stock' : `⚠️ Only ${product.stock} left`}
        </div>
      )}
      
      <button 
        onClick={addToCart} 
        className="cart-button"
        aria-label={`Add ${product.name} to cart`}
      >
        <span>🛒</span> Add to Cart
      </button>
    </div>
  );
}
