// Base URL without duplicated '/api'
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Token helpers
const getToken = () => localStorage.getItem('authToken');
const setToken = (token) => localStorage.setItem('authToken', token);
const removeToken = () => localStorage.removeItem('authToken');

// Build headers including Authorization if present
const createHeaders = (additional = {}) => {
  const headers = { 'Content-Type': 'application/json', ...additional };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// Generic fetch wrapper with auth and error handling
const apiRequest = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: createHeaders(options.headers)
  });
  if (res.status === 401) {
    // Redirect to auth on token expiry
    removeToken();
    window.location.href = '/auth';
    throw new Error('Authentication expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
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

export async function fetchProducts({ search = '', category = '', size = '', shoeSize = '', ram = '', storage = '', limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (size) params.append('size', size);
  if (shoeSize) params.append('shoeSize', shoeSize);
  if (ram) params.append('ram', ram);
  if (storage) params.append('storage', storage);
  params.append('limit', limit);
  return apiRequest(`/api/products?${params.toString()}`);
}

export async function fetchProductById(id) {
  return apiRequest(`/api/products/${id}`);
}

export async function fetchSaleItems() {
  return apiRequest('/api/products/sale/items');
}

// --- Authentication APIs ---
export async function signup(userData) {
  return apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}
export const saveCart = (userId, items) =>
  apiRequest(`/api/cart/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
export async function login(credentials) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    removeToken();
  }
}

export async function getProfile() {
  return apiRequest('/api/auth/me');
}

// --- Wishlist & Orders APIs ---
export async function getWishlist() {
  return apiRequest('/api/auth/wishlist');
}

export async function addToWishlist(id) {
  return apiRequest('/api/auth/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId: id })
  });
}

export async function removeFromWishlist(id) {
  return apiRequest(`/api/auth/wishlist/${id}`, { method: 'DELETE' });
}

export async function getOrderHistory() {
  return apiRequest('/api/auth/orders');
}

export async function createOrder(orderData) {
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

export async function getOrderById(orderId) {
  return apiRequest(`/api/orders/${orderId}`);
}

// --- Utility ---
export const auth = {
  isAuthenticated: () => !!getToken(),
  setToken,
  getToken,
  removeToken
};

// Add this to your existing API functions
export async function addToCart(cartItem) {
  return apiRequest('/api/cart/add', {
    method: 'POST',
    body: JSON.stringify(cartItem)
  });
}

// Optional: Get cart items from backend
export async function getCart() {
  return apiRequest('/api/cart');
}

// Optional: Update cart item quantity
export async function updateCartItem(itemId, quantity) {
  return apiRequest(`/api/cart/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity })
  });
}

