const BASE_URL = 'http://localhost:3001';

export async function callChatAPI(message, sessionId, language) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, language })
  });
  if (!res.ok) throw new Error('Chat API request failed');
  const result = await res.json();
  
  // Log the response for debugging
  console.log('API Response:', result);
  
  return result;
}

export async function fetchProducts({ search = '', category = '', limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (limit) params.append('limit', limit);
  const res = await fetch(`${BASE_URL}/api/products?${params.toString()}`);
  if (!res.ok) throw new Error('Products fetch failed');
  return res.json();
}

export async function fetchSaleItems() {
  const res = await fetch(`${BASE_URL}/api/products/sale/items`);
  if (!res.ok) throw new Error('Sale items fetch failed');
  return res.json();
}
