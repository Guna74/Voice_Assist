let cart = [];
let userId = null; // You'll need to set this based on your user authentication

// Initialize userId (you might get this from authentication or generate a unique ID)
function initializeUserId() {
  // If you have user authentication, get the user ID from there
  // Otherwise, generate or retrieve a persistent session ID
  userId = localStorage.getItem('userId') || 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('userId', userId);
}

// Load cart from database when page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeUserId();
  loadCartFromDatabase();
});

// Load cart items from database
async function loadCartFromDatabase() {
  if (!userId) return;
  
  try {
    const response = await fetch(`/api/cart/${userId}`);
    const items = await response.json();
    
    if (Array.isArray(items)) {
      cart = items.map(item => ({
        id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        selectedVariants: item.selectedVariants || {},
        category: item.category,
        description: item.description
      }));
      updateCartDisplay();
    }
  } catch (error) {
    console.error('Error loading cart:', error);
  }
}

// Save cart to database
async function saveCartToDatabase() {
  if (!userId) return;
  
  try {
    const response = await fetch(`/api/cart/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: cart.map(item => ({
          _id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          selectedVariants: item.selectedVariants || {},
          category: item.category,
          description: item.description
        }))
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      console.error('Failed to save cart:', data.error);
    }
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

// Add item to cart (updated to save to database)
async function addToCart(id, name, price, image, selectedVariants = {}) {
  try {
    // Update local cart
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ 
        id, 
        name, 
        price, 
        image, 
        quantity: 1,
        selectedVariants
      });
    }
    
    // Save to database
    await saveCartToDatabase();
    
    updateCartDisplay();
    showNotification('Item added to cart!');
  } catch (error) {
    console.error('Error adding to cart:', error);
    showNotification('Error adding item to cart', 'error');
  }
}

// Remove item from cart (updated to save to database)
async function removeFromCart(id) {
  try {
    // Update local cart
    cart = cart.filter(item => item.id !== id);
    
    // Save to database
    await saveCartToDatabase();
    
    updateCartDisplay();
    showNotification('Item removed from cart!');
  } catch (error) {
    console.error('Error removing from cart:', error);
  }
}

// Update cart item quantity
async function updateCartQuantity(id, quantity) {
  try {
    // Update local cart
    const item = cart.find(item => item.id === id);
    if (item) {
      if (quantity <= 0) {
        cart = cart.filter(item => item.id !== id);
      } else {
        item.quantity = quantity;
      }
    }
    
    // Save to database
    await saveCartToDatabase();
    
    updateCartDisplay();
  } catch (error) {
    console.error('Error updating cart:', error);
  }
}

// Clear entire cart
async function clearCart() {
  try {
    const response = await fetch(`/api/cart/${userId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      cart = [];
      updateCartDisplay();
      showNotification('Cart cleared!');
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
}

// Update cart display
function updateCartDisplay() {
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  
  // Update cart count
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'inline' : 'none';
  }
  
  // Update cart items display
  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-image">
          <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p class="cart-item-price">$${item.price.toFixed(2)}</p>
            <div class="quantity-controls">
              <button onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})" class="quantity-btn">-</button>
              <span class="quantity">${item.quantity}</span>
              <button onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})" class="quantity-btn">+</button>
            </div>
          </div>
          <button onclick="removeFromCart('${item.id}')" class="remove-btn">×</button>
        </div>
      `).join('');
    }
  }
  
  // Update cart total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  if (cartTotal) {
    cartTotal.textContent = `$${total.toFixed(2)}`;
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f44336' : '#4CAF50'};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Toggle cart visibility
function toggleCart() {
  const cartSidebar = document.getElementById('cart-sidebar');
  if (cartSidebar) {
    cartSidebar.classList.toggle('open');
  }
}

// Close cart
function closeCart() {
  const cartSidebar = document.getElementById('cart-sidebar');
  if (cartSidebar) {
    cartSidebar.classList.remove('open');
  }
}
