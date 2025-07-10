// src/components/ProductCard.jsx

import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import VariantSelector from './VariantSelector';
import './ProductCard.css';
import { addToCart as addToCartAPI } from '../services/api'; // Adjust path as needed 

export default function ProductCard({ product }) {
  const { cart, setCart } = useContext(AppContext);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [validationError, setValidationError] = useState('');

  // Get unique variant options
  const sizes = [...new Set(product.variants?.map(v => v.size).filter(Boolean))] || [];
  const shoeSizes = [...new Set(product.variants?.map(v => v.shoeSize).filter(Boolean))] || [];
  const rams = [...new Set(product.variants?.map(v => v.ram).filter(Boolean))] || [];
  const storages = [...new Set(product.variants?.map(v => v.storage).filter(Boolean))] || [];

  // Check if product requires variant selection
  const requiresVariants = sizes.length > 0 || shoeSizes.length > 0 || rams.length > 0 || storages.length > 0;

  // Get display price based on selected variant or default
  const getDisplayPrice = () => {
    if (requiresVariants && Object.keys(selectedVariants).length > 0) {
      const matchingVariant = product.variants?.find(v => {
        return (!sizes.length || v.size === selectedVariants.size) &&
               (!shoeSizes.length || v.shoeSize === parseInt(selectedVariants.shoeSize)) &&
               (!rams.length || v.ram === selectedVariants.ram) &&
               (!storages.length || v.storage === selectedVariants.storage);
      });
      if (matchingVariant) return matchingVariant.price;
    }
    
    if (product.price != null) return product.price;
    if (product.variants?.[0]?.price != null) return product.variants[0].price;
    return 0;
  };

  const price = getDisplayPrice();
  const originalPrice = product.originalPrice != null ? Number(product.originalPrice) : null;

  // Get stock for selected variant
  const getStock = () => {
    if (requiresVariants && Object.keys(selectedVariants).length > 0) {
      const matchingVariant = product.variants?.find(v => {
        return (!sizes.length || v.size === selectedVariants.size) &&
               (!shoeSizes.length || v.shoeSize === parseInt(selectedVariants.shoeSize)) &&
               (!rams.length || v.ram === selectedVariants.ram) &&
               (!storages.length || v.storage === selectedVariants.storage);
      });
      if (matchingVariant) return matchingVariant.stock;
    }
    
    if (product.stock != null) return product.stock;
    if (product.variants?.[0]?.stock != null) return product.variants[0].stock;
    return 0;
  };

  const stock = getStock();
  const isOutOfStock = stock === 0;

  // Validate required variants before adding to cart
  const validateVariants = () => {
    const missing = [];
    if (sizes.length > 0 && !selectedVariants.size) missing.push('Size');
    if (shoeSizes.length > 0 && !selectedVariants.shoeSize) missing.push('Shoe Size');
    if (rams.length > 0 && !selectedVariants.ram) missing.push('RAM');
    if (storages.length > 0 && !selectedVariants.storage) missing.push('Storage');
    
    return missing;
  };

  // const addToCart = (e) => {
  //   e.stopPropagation();
  //   if (isOutOfStock) return;
    
  //   // Check if variants are required but not selected
  //   if (requiresVariants) {
  //     const missingVariants = validateVariants();
  //     if (missingVariants.length > 0) {
  //       setValidationError(`Please select: ${missingVariants.join(', ')}`);
  //       setShowDetails(true); // Open modal to show variant selectors
  //       return;
  //     }
  //   }
    
  //   setValidationError('');
    
  //   const existing = cart.find(item => 
  //     item._id === product._id && 
  //     JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
  //   );
    
  //   if (existing) {
  //     setCart(cart.map(item =>
  //       item._id === product._id && 
  //       JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
  //         ? { ...item, quantity: item.quantity + 1 }
  //         : item
  //     ));
  //   } else {
  //     setCart([...cart, { 
  //       ...product, 
  //       price: price,
  //       selectedVariants: selectedVariants,
  //       quantity: 1 
  //     }]);
  //   }

  //   // Visual feedback
  //   const btn = e.currentTarget;
  //   const originalText = btn.textContent;
  //   btn.textContent = '✓ Added!';
  //   btn.classList.add('cart-button-added');
  //   setTimeout(() => {
  //     btn.textContent = originalText;
  //     btn.classList.remove('cart-button-added');
  //   }, 1500);
  // };
// import { addToCart as addToCartAPI } from './path/to/your/api'; // Adjust path as needed

const addToCart = async (e) => {
  e.stopPropagation();
  if (isOutOfStock) return;

  // Check if variants are required but not selected
  if (requiresVariants) {
    const missingVariants = validateVariants();
    if (missingVariants.length > 0) {
      setValidationError(`Please select: ${missingVariants.join(', ')}`);
      setShowDetails(true); // Open modal to show variant selectors
      return;
    }
  }

  setValidationError('');

  // Prepare cart item data for backend
  const cartItemData = {
    productId: product._id,
    selectedVariants: selectedVariants,
    quantity: 1,
    price: price
  };

  // Get button reference for UI feedback
  const btn = e.currentTarget;
  const originalText = btn.textContent;

  try {
    // Show loading state
    btn.textContent = 'Adding...';
    btn.disabled = true;

    // Send to backend
    const response = await addToCartAPI(cartItemData);

    // Update local cart state only after successful backend response
    const existing = cart.find(item =>
      item._id === product._id &&
      JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
    );

    if (existing) {
      setCart(cart.map(item =>
        item._id === product._id &&
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(selectedVariants)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        price: price,
        selectedVariants: selectedVariants,
        quantity: 1
      }]);
    }

    // Success feedback
    btn.textContent = '✓ Added!';
    btn.classList.add('cart-button-added');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('cart-button-added');
      btn.disabled = false;
    }, 1500);

  } catch (error) {
    console.error('Error adding to cart:', error);
    
    // Error feedback
    btn.textContent = '✗ Failed!';
    btn.classList.add('cart-button-error');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('cart-button-error');
      btn.disabled = false;
    }, 1500);
    
    // Show user-friendly error message
    if (error.message === 'Authentication expired') {
      setValidationError('Please log in to add items to cart');
    } else {
      setValidationError('Failed to add item to cart. Please try again.');
    }
  }
};

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'star-filled' : 'star-empty'}>
        ★
      </span>
    ));

  const handleVariantChange = (type, value) => {
    setSelectedVariants(prev => ({
      ...prev,
      [type]: value
    }));
    setValidationError(''); // Clear error when user selects variant
  };

  const getVariantDisplay = () => {
    const selected = [];
    if (selectedVariants.size) selected.push(`Size: ${selectedVariants.size}`);
    if (selectedVariants.shoeSize) selected.push(`Size: ${selectedVariants.shoeSize}`);
    if (selectedVariants.ram) selected.push(`RAM: ${selectedVariants.ram}`);
    if (selectedVariants.storage) selected.push(`Storage: ${selectedVariants.storage}`);
    return selected.length > 0 ? selected.join(', ') : '';
  };

  return (
    <>
      <div className="product-card" onClick={() => setShowDetails(true)}>
        {product.onSale && <span className="sale-badge">Sale!</span>}

        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />

        <h3 className="product-title">{product.name}</h3>

        {product.rating != null && (
          <div className="product-rating">
            <div className="stars">{renderStars(product.rating)}</div>
            <span className="rating-number">({product.rating.toFixed(1)})</span>
          </div>
        )}

        <div className="product-price">
          <span className="current-price">${price.toFixed(2)}</span>
          {originalPrice && (
            <span className="original-price">${originalPrice.toFixed(2)}</span>
          )}
        </div>

        <p className="product-description">{product.description}</p>

        {/* Show selected variants if any */}
        {requiresVariants && getVariantDisplay() && (
          <div className="selected-variants">
            <small>{getVariantDisplay()}</small>
          </div>
        )}

        {/* Show requirement notice for variant products */}
        {requiresVariants && !getVariantDisplay() && (
          <div className="variant-required">
            <small>⚠️ Click to select options</small>
          </div>
        )}

        {stock != null && (
          <div className={`stock-indicator ${stock > 10 ? 'in-stock' : 'low-stock'}`}>
            {stock > 10
              ? '✓ In Stock'
              : stock === 0
              ? 'Out of Stock'
              : `⚠️ Only ${stock} left`}
          </div>
        )}

        <button
          onClick={addToCart}
          className="cart-button"
          disabled={isOutOfStock}
          aria-label={`Add ${product.name} to cart`}
        >
          🛒 Add to Cart
        </button>

        {validationError && (
          <div className="validation-error">
            {validationError}
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal product-modal" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowDetails(false)}
              aria-label="Close"
            >
              ×
            </button>
            
            <div className="product-detail-content">
              <div className="product-detail-left">
                <img src={product.image} alt={product.name} className="product-detail-image" />
              </div>
              
              <div className="product-detail-right">
                <h2 className="product-detail-title">{product.name}</h2>
                
                {product.rating && (
                  <div className="product-rating">
                    {renderStars(product.rating)}
                    <span>({product.rating.toFixed(1)})</span>
                  </div>
                )}

                <div className="product-detail-price">
                  <span className="current-price">${price.toFixed(2)}</span>
                  {originalPrice && (
                    <span className="original-price">${originalPrice.toFixed(2)}</span>
                  )}
                </div>

                <p className="product-detail-description">{product.description}</p>

                {/* Variant Selectors */}
                {requiresVariants && (
                  <div className="variant-selectors">
                    <h4>Please select your options:</h4>
                    
                    {sizes.length > 0 && (
                      <VariantSelector
                        label="Size *"
                        options={sizes.map(s => ({ value: s }))}
                        selectedValue={selectedVariants.size || ''}
                        onSelect={(val) => handleVariantChange('size', val)}
                      />
                    )}

                    {shoeSizes.length > 0 && (
                      <VariantSelector
                        label="Shoe Size *"
                        options={shoeSizes.map(s => ({ value: s.toString() }))}
                        selectedValue={selectedVariants.shoeSize || ''}
                        onSelect={(val) => handleVariantChange('shoeSize', val)}
                      />
                    )}

                    {rams.length > 0 && (
                      <VariantSelector
                        label="RAM *"
                        options={rams.map(r => ({ value: r }))}
                        selectedValue={selectedVariants.ram || ''}
                        onSelect={(val) => handleVariantChange('ram', val)}
                      />
                    )}

                    {storages.length > 0 && (
                      <VariantSelector
                        label="Storage *"
                        options={storages.map(st => ({ value: st }))}
                        selectedValue={selectedVariants.storage || ''}
                        onSelect={(val) => handleVariantChange('storage', val)}
                      />
                    )}

                    {validationError && (
                      <div className="validation-error-modal">
                        {validationError}
                      </div>
                    )}
                  </div>
                )}

                {product.sizeChart && (
                  <a 
                    href={product.sizeChart} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="size-chart-link"
                  >
                    📏 View Size Chart
                  </a>
                )}

                <div className="stock-info">
                  {stock > 10 ? (
                    <span className="in-stock">✓ In Stock</span>
                  ) : stock > 0 ? (
                    <span className="low-stock">⚠️ Only {stock} left</span>
                  ) : (
                    <span className="out-of-stock">❌ Out of Stock</span>
                  )}
                </div>

                <button
                  onClick={addToCart}
                  className="add-to-cart-detail"
                  disabled={isOutOfStock}
                >
                  🛒 Add to Cart - ${price.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
