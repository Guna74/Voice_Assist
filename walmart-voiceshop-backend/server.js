/*******************************************************************************
* Walmart Voice-Shop Backend
* ─────────────────────────
* • Express + MongoDB API that powers the React "Voice-Shop" front-end
* • Uses OpenRouter (LLM as a service) to parse natural-language requests
* • Keeps a per-session shopping-cart in RAM (Map) for demo simplicity
*
* CHANGES in this version
* ───────────────────────
* 1. Replaced the long if/else intent chain with a **handler table**.
* 2. Fixed remove_from_cart logic (case-insensitive / partial matches,
*    quantity subtraction, row deletion when qty ≤ 0).
* 3. Added cart and order persistence with MongoDB
* 4. Nothing else in the public API or JSON contract has changed.
******************************************************************************/

// ─────────────────────────────────────────────────────────────────────────────
// Imports & Initial setup
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB model
// ─────────────────────────────────────────────────────────────────────────────
const Product = require('./models/Product'); // Mongoose schema (name, price …)

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000', // Allow requests from the frontend
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies

// ─────────────────────────────────────────────────────────────────────────────
// Database connection
// ─────────────────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✓ Connected to MongoDB Atlas'))
  .catch(err => console.error('✗ MongoDB connection error:', err));

// ─────────────────────────────────────────────────────────────────────────────
// In-memory session store (key = sessionId, value = {context:[], cart:[]} )
// For production swap with Redis or DB.
// ─────────────────────────────────────────────────────────────────────────────
const sessions = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// API routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));

const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Environment variables
// ─────────────────────────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/* Find products by search term / category */
const findProducts = async (searchTerm, category = null, limit = 8) => {
  try {
    const q = {};
    if (searchTerm) {
      const re = new RegExp(searchTerm, 'i');
      q.$or = [{ name: re }, { description: re }, { category: re }];
    }
    if (category && category !== 'All Categories') q.category = category;
    return await Product.find(q).limit(limit);
  } catch (e) {
    console.error('findProducts error:', e);
    return [];
  }
};

/* Find ONE product by name (fuzzy) */
const findProductByName = async (name) => {
  if (!name || typeof name !== 'string') return null;
  const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    // 1. Exact match
    let product = await Product.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    });
    if (product) return product;
    
    // 2. Partial match
    product = await Product.findOne({
      name: { $regex: escapeRegex(name), $options: 'i' }
    });
    if (product) return product;
    
    // 3. All words in any order
    const words = name.split(' ').filter(Boolean);
    if (words.length > 1) {
      const regexes = words.map(w => new RegExp(escapeRegex(w), 'i'));
      product = await Product.findOne({ $and: regexes.map(r => ({ name: r })) });
      if (product) return product;
    }
    
    // 4. Fallback: first word
    const firstWord = words[0];
    if (firstWord) {
      product = await Product.findOne({
        name: new RegExp(escapeRegex(firstWord), 'i')
      });
      if (product) return product;
    }
    
    return null;
  } catch (e) {
    console.error('findProductByName error:', e);
    return null;
  }
};

/* Build system-prompt for the LLM */
const buildPrompt = (msg, ctx, lang = 'en') => {
  const schemaEn = `
You are a Walmart voice-commerce assistant.
Return ONLY valid JSON with keys:
  intent           (search|add_to_cart|show_cart|remove_from_cart|show_category|show_sale_items|show_all_products|help)
  entities         { product, quantity, category, size, shoeSize, width, ram, storage }
  action           { type, data }
  response         (plain text)
  followUpQuestions[ ]
IMPORTANT:
- For Clothing, if the user does not specify "size" (S, M, L, XL, etc.), DO NOT assume or fill in any default value. Instead, respond with a follow-up question asking for the size (e.g., "What size would you like for the shirt?") and set action: { type: "ask_variant", missing: ["size"] }.
- For Footwear, if the user does not specify "shoeSize" (6-12) or "width" (N, W), DO NOT assume or fill in any default value. Instead, respond with a follow-up question asking for the missing option(s) and set action: { type: "ask_variant", missing: ["shoeSize", "width"] } as needed.
- For Electronics, if the user does not specify "ram" (4GB, 8GB, 16GB) or "storage" (128GB, 256GB), DO NOT assume or fill in any default value. Instead, respond with a follow-up question asking for the missing option(s) and set action: { type: "ask_variant", missing: ["ram", "storage"] } as needed.
- NEVER use a default or placeholder value for any required variant. Only use information explicitly provided by the user.
- If any required variant is missing, do NOT proceed with the action. Always ask the user for the missing information first.
- If all required variants are present, set action: { type: "add_to_cart" } and confirm the addition in the response.
- Only return valid JSON, no extra text.
Products: iPhone, Samsung Galaxy, MacBook, AirPods, shirts, shoes, jackets, jeans, coffee maker, vacuum, table, bedding, bananas, milk, bread, chicken.
Categories: Electronics, Clothing, Footwear, Home, Groceries.
EXAMPLES:
If the user says "add t-shirt to cart" and does not specify a size, return:
{
  "intent": "add_to_cart",
  "entities": { "product": "t-shirt" },
  "action": { "type": "ask_variant", "missing": ["size"] },
  "response": "What size would you like for the t-shirt?",
  "followUpQuestions": []
}
If the user says "add large t-shirt to cart", return:
{
  "intent": "add_to_cart",
  "entities": { "product": "t-shirt", "size": "L" },
  "action": { "type": "add_to_cart" },
  "response": "Added 1 t-shirt (size: L) to cart.",
  "followUpQuestions": []
}
If the user says "add iPhone 15 Pro to cart", return:
{
  "intent": "add_to_cart",
  "entities": { "product": "iPhone 15 Pro" },
  "action": { "type": "ask_variant", "missing": ["ram", "storage"] },
  "response": "What RAM and storage would you like for iPhone 15 Pro?",
  "followUpQuestions": []
}
If the user says "add iPhone 15 Pro 8GB 256GB to cart", return:
{
  "intent": "add_to_cart",
  "entities": { "product": "iPhone 15 Pro", "ram": "8GB", "storage": "256GB" },
  "action": { "type": "add_to_cart" },
  "response": "Added 1 iPhone 15 Pro (8GB, 256GB) to cart.",
  "followUpQuestions": []
}`;

  // Spanish version of the schema
  const schemaEs = schemaEn.replace('You are', 'Eres')
    .replace('voice-commerce assistant.', 'un asistente de voz para compras.')
    .replace('Return', 'Devuelve')
    .replace('plain text', 'texto');

  const history = ctx.slice(-4).map(c => `${c.role}: "${c.message}"`).join(' | ');
  const preamble = lang === 'es' ? schemaEs : schemaEn;
  return `${preamble}\nConversation: ${history}\nUser message: "${msg}"\nJSON:`;
};

/* Fallback if LLM fails */
const fallback = async (msg, session, lang) => ({
  intent: 'ask_question',
  entities: {},
  action: { type: 'none', data: {} },
  response: lang.startsWith('es')
    ? 'Lo siento, no entendí. ¿Puedes reformular?'
    : 'Sorry, I did not understand. Could you rephrase?',
  followUpQuestions: lang.startsWith('es')
    ? ['¿Te muestro productos populares?']
    : ['Would you like to see popular products?']
});

// ─────────────────────────────────────────────────────────────────────────────
// Intent handlers (each returns updated aiResponse object)
// ─────────────────────────────────────────────────────────────────────────────
const handlers = {};

/* SEARCH */
handlers.search = async (ai, session, lang) => {
  const term = ai.entities.product;
  const items = await findProducts(term);
  ai.action = { type: 'search', data: { query: term, results: items } };
  ai.response = items.length
    ? (lang === 'es'
      ? `Encontré ${items.length} resultados para "${term}".`
      : `I found ${items.length} results for "${term}".`)
    : (lang === 'es'
      ? `No encontré resultados para "${term}".`
      : `No results found for "${term}".`);
  ai.followUpQuestions = lang === 'es'
    ? ['¿Quieres añadir algo al carrito?']
    : ['Would you like to add any to your cart?'];
  return ai;
};

/* ADD_TO_CART */
handlers.add_to_cart = async (ai, session, lang) => {
  console.log(ai);
  const { product, size, shoeSize, ram, storage, quantity } = ai.entities || {};
  const actionType = ai.action?.type;

  // If user is answering a variant prompt and we have a pending product
  if (session.pendingProduct && actionType === 'add_to_cart') {
    // Merge previous and new entities
    const mergedEntities = { ...session.pendingProduct, ...ai.entities };
    // Find the product
    const prod = await findProductByName(mergedEntities.product);
    if (!prod) {
      ai.response = lang === 'es'
        ? `No encontré "${mergedEntities.product}".`
        : `Could not find "${mergedEntities.product}".`;
      ai.action = { type: 'none', data: {} };
      session.pendingProduct = null;
      return ai;
    }
    // Find the correct variant
    let variantObj = prod.variants.find(v =>
      (!v.size || v.size === mergedEntities.size) &&
      (!v.shoeSize || v.shoeSize == mergedEntities.shoeSize) &&
      (!v.ram || v.ram === mergedEntities.ram) &&
      (!v.storage || v.storage === mergedEntities.storage)
    );
    if (!variantObj) {
      ai.response = lang === 'es'
        ? `Esa combinación no está disponible para ${prod.name}.`
        : `That combination is not available for ${prod.name}.`;
      ai.action = { type: 'none', data: {} };
      session.pendingProduct = null;
      return ai;
    }
    // Add to cart
    const item = {
      ...prod.toObject(),
      quantity: mergedEntities.quantity || 1,
      selectedVariants: {
        size: mergedEntities.size,
        shoeSize: mergedEntities.shoeSize,
        ram: mergedEntities.ram,
        storage: mergedEntities.storage
      },
      price: variantObj.price
    };
    session.cart.push(item);
    ai.action = { type: 'add_to_cart', data: { cart: session.cart } };
    ai.response = lang === 'es'
      ? `Añadí 1 ${prod.name} al carrito.`
      : `Added 1 ${prod.name} to cart.`;
    ai.followUpQuestions = [
      lang === 'es' ? '¿Deseas ver tu carrito?' : 'Do you want to view your cart?'
    ];
    session.pendingProduct = null;
    return ai;
  }

  // If action is ask_variant, prompt the user for the missing variant(s)
  if (actionType === 'ask_variant' || actionType === 'variant_required') {
    session.pendingProduct = ai.entities; // Store product and any provided variants
    ai.response = ai.response || (lang === 'es'
      ? 'Por favor, especifica la opción requerida.'
      : 'Please specify the required option.');
    ai.action = { type: 'variant_required', data: ai.action?.missing || [] };
    ai.followUpQuestions = [];
    return ai;
  }

  // If action is add_to_cart and all required variants are present, add to cart
  if (actionType === 'add_to_cart') {
    const prod = await findProductByName(product);
    if (!prod) {
      ai.response = lang === 'es'
        ? `No encontré "${product}".`
        : `Could not find "${product}".`;
      ai.action = { type: 'none', data: {} };
      return ai;
    }
    let variantObj = prod.variants.find(v =>
      (!v.size || v.size === size) &&
      (!v.shoeSize || v.shoeSize == shoeSize) &&
      (!v.ram || v.ram === ram) &&
      (!v.storage || v.storage === storage)
    );
    if (!variantObj) {
      ai.response = lang === 'es'
        ? `Esa combinación no está disponible para ${prod.name}.`
        : `That combination is not available for ${prod.name}.`;
      ai.action = { type: 'none', data: {} };
      return ai;
    }
    const item = {
      ...prod.toObject(),
      quantity: quantity || 1,
      selectedVariants: { size, shoeSize, ram, storage },
      price: variantObj.price
    };
    session.cart.push(item);
    ai.action = { type: 'add_to_cart', data: { cart: session.cart } };
    ai.response = lang === 'es'
      ? `Añadí 1 ${prod.name} al carrito.`
      : `Added 1 ${prod.name} to cart.`;
    ai.followUpQuestions = [
      lang === 'es' ? '¿Deseas ver tu carrito?' : 'Do you want to view your cart?'
    ];
    session.pendingProduct = null;
    return ai;
  }

  // Fallback: if action is not recognized
  ai.response = lang === 'es'
    ? 'No entendí tu solicitud. ¿Puedes reformular?'
    : 'I did not understand your request. Could you rephrase?';
  ai.action = { type: 'none', data: {} };
  return ai;
};

/* SHOW_CART */
handlers.show_cart = async (ai, session, lang) => {
  const count = session.cart.reduce((s, i) => s + i.quantity, 0);
  const total = session.cart.reduce((s, i) => s + i.quantity * i.price, 0).toFixed(2);
  ai.action = { type: 'show_cart', data: { cart: session.cart } };
  ai.response = count
    ? (lang === 'es'
      ? `Tienes ${count} artículos por $${total}.`
      : `You have ${count} items totaling $${total}.`)
    : (lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.');
  ai.followUpQuestions = lang === 'es'
    ? ['¿Listo para pagar?']
    : ['Ready to checkout?'];
  return ai;
};

/* REMOVE_FROM_CART */
handlers.remove_from_cart = async (ai, session, lang) => {
  const name = (ai.entities.product || '').toLowerCase().trim();
  const qty = ai.entities.quantity || 1;
  const idx = session.cart.findIndex(
    item => item.name.toLowerCase().includes(name)
  );
  if (idx === -1) {
    ai.response = lang === 'es'
      ? `No encontré "${ai.entities.product}" en tu carrito.`
      : `Could not find "${ai.entities.product}" in your cart.`;
    ai.action = { type: 'none', data: {} };
    return ai;
  }
  // Update or remove line
  if (qty >= session.cart[idx].quantity) session.cart.splice(idx, 1);
  else session.cart[idx].quantity -= qty;
  ai.action = { type: 'remove_from_cart', data: { cart: session.cart } };
  ai.response = lang === 'es'
    ? 'Hecho, actualicé tu carrito.'
    : 'Done, I updated your cart.';
  ai.followUpQuestions = lang === 'es'
    ? ['¿Quieres eliminar algo más?']
    : ['Would you like to remove anything else?'];
  return ai;
};

/* SHOW_ALL_PRODUCTS */
handlers.show_all_products = async (ai, session, lang) => {
  // Fetch all products (no search term, no category)
  const items = await findProducts('', null, 50); // 50 or any reasonable limit
  ai.action = { type: 'show_all_products', data: { products: items } };
  ai.response = lang === 'es'
    ? `Mostrando todos los productos (${items.length}).`
    : `Showing all products (${items.length}).`;
  ai.followUpQuestions = lang === 'es'
    ? ['¿Quieres filtrar por categoría?', '¿Agregar algo al carrito?']
    : ['Would you like to filter by category?'];
  return ai;
};

/* SHOW_CATEGORY */
handlers.show_category = async (ai, session, lang) => {
  const cat = ai.entities.category;
  const items = await findProducts('', cat);
  ai.action = { type: 'show_category', data: { category: cat, products: items } };
  ai.response = lang === 'es'
    ? `Mostrando categoría ${cat}.`
    : `Showing ${cat} category.`;
  ai.followUpQuestions = lang === 'es'
    ? ['¿Quieres añadir algo al carrito?']
    : ['Do you want to add anything to the cart?'];
  return ai;
};

/* SHOW_SALE_ITEMS */
handlers.show_sale_items = async (ai, session, lang) => {
  const items = await Product.find({ onSale: true });
  ai.action = { type: 'show_sale_items', data: { products: items } };
  ai.response = lang === 'es'
    ? `Aquí están los artículos en oferta (${items.length}).`
    : `Here are the sale items (${items.length}).`;
  ai.followUpQuestions = lang === 'es'
    ? ['¿Quieres añadir alguno?']
    : ['Would you like to add any?'];
  return ai;
};

// ─────────────────────────────────────────────────────────────────────────────
// Generic intent router
// ─────────────────────────────────────────────────────────────────────────────
const processIntent = async (ai, session, lang) => {
  const handler = handlers[ai.intent];
  if (!handler) return ai; // unknown intent, return as-is
  return await handler(ai, session, lang);
};

// ─────────────────────────────────────────────────────────────────────────────
// REST API routes
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, limit = 20 } = req.query;
    res.json(await findProducts(search, category, +limit));
  } catch (e) { res.status(500).json({ error: 'DB error' }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: 'DB error' }); }
});

app.get('/api/products/sale/items', async (_req, res) => {
  try { res.json(await Product.find({ onSale: true })); }
  catch (e) { res.status(500).json({ error: 'DB error' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAT endpoint → talks to OpenRouter
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, language = 'en-US', currentCart } = req.body;
    if (!message || !sessionId)
      return res.status(400).json({ intent: 'error', response: 'Missing fields', sessionCart: [] });
    if (!OPENROUTER_API_KEY)
      return res.status(500).json({ intent: 'error', response: 'API key missing', sessionCart: [] });

    // Get / init session
let session = sessions.get(sessionId);
if (!session) {
  session = { context: [], cart: [] };

  // Try loading cart if sessionId includes userId
  const userId = sessionId.split(':')[1];  // Format: "session:user123"
  if (userId) {
    session.userId = userId;
    try {
      const res = await fetch(`http://localhost:${PORT}/api/cart/${userId}`);
      const items = await res.json();
      session.cart = Array.isArray(items) ? items : [];
    } catch (err) {
      console.error('Failed to load cart from DB:', err);
    }
  }
}


    if (Array.isArray(currentCart)) {
      session.cart = currentCart;
    }
    const lang = language.startsWith('es') ? 'es' : 'en';
    const prompt = buildPrompt(message, session.context, lang);

    // Call OpenRouter
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Walmart VoiceShop'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    });

    const orJson = await orRes.json();
    const aiRaw = orJson.choices?.[0]?.message?.content || '';

    // Parse JSON from model
    let ai;
    try {
      ai = JSON.parse(aiRaw.match(/\{[\s\S]*\}/)[0]);
      if (!ai.intent) throw new Error('intent missing');
    } catch {
      ai = await fallback(message, session, lang);
    }

    // Process intent
    ai.rawMessage = message;
    ai = await processIntent(ai, session, lang);

    // Save conversation context (last 10 turns)
    session.context.push({ role: 'user', message }, { role: 'assistant', message: ai.response });
    if (session.context.length > 10) session.context = session.context.slice(-10);
    sessions.set(sessionId, session);

    // Always attach cart
    // Save cart to DB if userId is present
if (session.userId) {
  try {
    await fetch(`http://localhost:${PORT}/api/cart/${session.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: session.cart })
    });
  } catch (err) {
    console.error('Failed to save cart to DB:', err);
  }
}
ai.sessionCart = session.cart;

    return res.json(ai);
  } catch (err) {
    console.error(err);
    res.status(500).json({ intent: 'error', response: 'Server error', sessionCart: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Health-check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({
  status: 'OK',
  db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  openrouter: !!OPENROUTER_API_KEY
}));

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
