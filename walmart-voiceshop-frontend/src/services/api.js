// Base URL configuration
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3001';

// Token management
const getToken = () => localStorage.getItem('authToken');
const setToken = (token) => localStorage.setItem('authToken', token);
const removeToken = () => localStorage.removeItem('authToken');

// User ID management for cart functionality
const getUserId = () => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
  }
  return userId;
};

// Build headers with authentication
const createHeaders = (additional = {}) => {
  const headers = { 'Content-Type': 'application/json', ...additional };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// Unified API request handler
const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: createHeaders(options.headers)
    });

    // Handle authentication errors
    if (response.status === 401) {
      removeToken();
      window.location.href = '/auth';
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle cart responses with proper ID mapping
    if (data.cartId || data.cart) {
      return {
        ...data,
        cartId: data.cartId || data._id || data.cart?._id || 'temp_cart_id'
      };
    }
    
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// --- Chat & Product APIs ---
export async function callChatAPI(message, sessionId, language, currentCart = []) {
  return apiRequest('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      sessionId,
      language,
      currentCart
    })
  });
}

export async function fetchProducts({ 
  search = '', 
  category = '', 
  size = '', 
  shoeSize = '', 
  ram = '', 
  storage = '', 
  limit = 20 
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (size) params.append('size', size);
  if (shoeSize) params.append('shoeSize', shoeSize);
  if (ram) params.append('ram', ram);
  if (storage) params.append('storage', storage);
  params.append('limit', limit.toString());
  
  return apiRequest(`/api/products?${params.toString()}`);
}

export async function fetchProductById(id) {
  if (!id) throw new Error('Product ID is required');
  return apiRequest(`/api/products/${id}`);
}

export async function fetchSaleItems() {
  return apiRequest('/api/products/sale/items');
}

// --- Authentication APIs ---
export async function signup(userData) {
  if (!userData.email || !userData.password) {
    throw new Error('Email and password are required');
  }
  return apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function login(credentials) {
  if (!credentials.email || !credentials.password) {
    throw new Error('Email and password are required');
  }
  
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  
  if (data.token) {
    setToken(data.token);
  }
  
  return data;
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    removeToken();
    localStorage.removeItem('userId'); // Clear user ID on logout
  }
}

export async function getProfile() {
  return apiRequest('/api/auth/me');
}

// --- Wishlist APIs ---
export async function getWishlist() {
  return apiRequest('/api/auth/wishlist');
}

export async function addToWishlist(productId) {
  if (!productId) throw new Error('Product ID is required');
  return apiRequest('/api/auth/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId })
  });
}

export async function removeFromWishlist(productId) {
  if (!productId) throw new Error('Product ID is required');
  return apiRequest(`/api/auth/wishlist/${productId}`, { 
    method: 'DELETE' 
  });
}

// --- Order APIs ---
export async function getOrderHistory() {
  return apiRequest('/api/auth/orders');
}

export async function createOrder(orderData) {
  if (!orderData) throw new Error('Order data is required');
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

export async function getOrderById(orderId) {
  if (!orderId) throw new Error('Order ID is required');
  return apiRequest(`/api/orders/${orderId}`);
}

// --- Cart APIs ---
export const cartAPI = {
  addToCart: async (productId, name, price, image, quantity = 1, selectedVariants = {}) => {
    if (!productId || !name || price === undefined) {
      throw new Error('Product ID, name, and price are required');
    }
    
    const userId = getUserId();
    return apiRequest('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        name,
        price: Number(price),
        image,
        quantity: Number(quantity),
        selectedVariants,
        userId
      })
    });
  },

  getCart: async () => {
    const userId = getUserId();
    return apiRequest(`/api/cart/${userId}`);
  },

  updateCartItem: async (productId, quantity, selectedVariants = {}) => {
    if (!productId || quantity === undefined) {
      throw new Error('Product ID and quantity are required');
    }
    
    const userId = getUserId();
    return apiRequest('/api/cart/update', {
      method: 'PUT',
      body: JSON.stringify({
        userId,
        productId,
        quantity: Number(quantity),
        selectedVariants
      })
    });
  },

  removeFromCart: async (productId, selectedVariants = {}) => {
    if (!productId) throw new Error('Product ID is required');
    
    const userId = getUserId();
    return apiRequest('/api/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({
        userId,
        productId,
        selectedVariants
      })
    });
  },

  clearCart: async () => {
    const userId = getUserId();
    return apiRequest(`/api/cart/clear/${userId}`, {
      method: 'DELETE'
    });
  },

  getCartSummary: async () => {
    const userId = getUserId();
    return apiRequest(`/api/cart/summary/${userId}`);
  },

  // Legacy cart functions for backward compatibility
  saveCart: async (items) => {
    const userId = getUserId();
    return apiRequest(`/api/cart/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  }
};

// --- Authentication utilities ---
export const auth = {
  isAuthenticated: () => !!getToken(),
  setToken,
  getToken,
  removeToken,
  getUserId
};

// Legacy exports for backward compatibility
export const addToCart = cartAPI.addToCart;
export const getCart = cartAPI.getCart;
export const updateCartItem = cartAPI.updateCartItem;
export const saveCart = cartAPI.saveCart;

export default apiRequest;
