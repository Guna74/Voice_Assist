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
  const Cart = require('./models/Cart');
  // ─────────────────────────────────────────────────────────────────────────────
  // Middleware
  // ─────────────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5000',
  'https://voiceassist1.netlify.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

  app.use(express.json()); // Parse JSON bodies

  // ─────────────────────────────────────────────────────────────────────────────
  // Data connection
  // ─────────────────────────────────────────────────────────────────────────────
  // Add better error handling for MongoDB connection
  mongoose
    .connect(process.env.MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    })
    .then(() => console.log('✓ Connected to MongoDB Atlas'))
    .catch(err => {
      console.error('✗ MongoDB connection error:', err);
      process.exit(1); // Exit if can't connect to data
    });

  // Handle connection errors after initial connection
  mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // In-memory session store (key = sessionId, value = {context:[], cart:[]} )
  // For production swap with Redis or DB.
  // ─────────────────────────────────────────────────────────────────────────────
  const sessions = new Map();

  // ─────────────────────────────────────────────────────────────────────────────
  // API routes - Clean route registrations
  // ─────────────────────────────────────────────────────────────────────────────
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));

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
  console.log(Product.name);
  if (!name || typeof name !== 'string') return null;

  // Normalize user input: lowercase, remove 's, apostrophes, extra spaces
  const normalize = str =>
    str
      .toLowerCase()
      .replace(/'s/g, '')        // remove possessive 's
      .replace(/'/g, '')         // remove other apostrophes
      .replace(/\s+/g, ' ')      // collapse multiple spaces
      .trim();

  const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalizedInput = normalize(name);

  try {
    // 1. Exact match ignoring apostrophes and 's
    const exactRegex = new RegExp(`^${escapeRegex(normalizedInput)}$`, 'i');
    let product = await Product.findOne({
      name: { $regex: exactRegex }
    });
    if (product) return product;

    // 2. Partial match
    const partialRegex = new RegExp(escapeRegex(normalizedInput), 'i');
    product = await Product.findOne({ name: partialRegex });
    if (product) return product;

    // 3. All words in any order (each word must appear somewhere)
    const words = normalizedInput.split(' ').filter(Boolean);
    if (words.length > 1) {
      const regexes = words.map(w => new RegExp(escapeRegex(w), 'i'));
      product = await Product.findOne({
        $and: regexes.map(r => ({ name: r }))
      });
      if (product) return product;
    }

    // 4. Fallback: first word match
    const firstWord = words[0];
    if (firstWord) {
      const firstWordRegex = new RegExp(escapeRegex(firstWord), 'i');
      product = await Product.findOne({ name: firstWordRegex });
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
    intent           (search|add_to_cart|show_cart|remove_from_cart|show_orders|show_category|show_sale_items|show_all_products|help)
    entities         { product, quantity, category, size, shoeSize, width, ram, storage } 
    action           { type}
    response         (plain text)
    followUpQuestions[ ]
  IMPORTANT:
  - entities must not be empty, always include at least "product" or "category".
  - For Clothing, if the user does not specify "size" (S, M, L, XL, etc.), DO NOT assume or fill in any default value. Instead, respond with a follow-up question asking for the size (e.g., "What size would you like for the shirt?") and set action: { type: "ask_variant", missing: ["size"] }.
  - For Footwear, if the user does not specify "shoeSize" (6-12), DO NOT assume or fill in any default value. Instead, respond with a follow-up question asking for the missing option(s) and set action: { type: "ask_variant", missing: ["shoeSize"] } as needed.
  - For Electronics, if the user does not specify "ram" (4GB, 8GB, 16GB) or "storage" (128GB, 256GB), DO NOT assume or fill in any default value. Instead, respond with a follow-up question asking for the missing option(s) and set action: { type: "ask_variant", missing: ["ram", "storage"] } as needed.
  - NEVER use a default or placeholder value for any required variant. Only use information explicitly provided by the user.
  - If any required variant is missing, do NOT proceed with the action. Always ask the user for the missing information first.
  - If all required variants are present, set action: { type: "add_to_cart" } and confirm the addition in the response.
  - Only return valid JSON, no extra text.
  - return size as only [S, M, L, XL] not small, medium, large, extra-large.
  - quantity is optional, default to 1 if not specified and is always an integer.
  - if the action type is not recognized, return action: { type: "none", data: {} } and a generic response.
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
  }
  If the user says "add size 8 mens sport sneakers to cart", return:
  {
    "intent": "add_to_cart",
    "entities": { "product": "mens sport sneakers", "shoeSize": "8" },
    "action": { "type": "add_to_cart" },
    "response": "Added 1 mens sport sneakers (size: 8) to cart.",
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
      : 'Sorry, I did not understand. Could you rephrase it?',
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
    console.log(ai);
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
    console.log(Product);
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
      // ai.response = lang === 'es'
      //   ? `Añadí ${item.quantity} ${prod.name} al carrito.`
      //   : `Added ${item.quantity} ${prod.name} to cart.`;
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
   let variantObj = prod.variants.find(v => {
    // Handle size matching (case-insensitive)
    const sizeMatch = !v.size || !size || v.size.toLowerCase() === size.toLowerCase();
  
    // Handle shoe size matching (convert to numbers)
    const shoeSizeMatch = !v.shoeSize || !shoeSize || Number(v.shoeSize) === Number(shoeSize);
  
    // Handle RAM matching (case-insensitive)
    const ramMatch = !v.ram || !ram || v.ram.toLowerCase() === ram.toLowerCase();
  
    // Handle storage matching (case-insensitive)
    const storageMatch = !v.storage || !storage || v.storage.toLowerCase() === storage.toLowerCase();
  
    return sizeMatch && shoeSizeMatch && ramMatch && storageMatch;
  });

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
      // ai.response = lang === 'es'
      //   ? `Añadí ${quantity} ${prod.name} al carrito.`
      //   : `Added ${quantity} ${prod.name} to cart.`;
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
    console.log(ai);
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
    console.log(ai);
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
    console.log(ai);

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
    console.log(ai);

    const cat = ai.entities.category;
    if(cat==='undefined' || !cat || !['Electronics', 'Clothing', 'Footwear', 'Home', 'Groceries'].includes(cat)) {
      ai.response = lang === 'es'
      ? `No entiendo tu solicitud.`
      : `I did not understand your request.`;
      ai.action = { type: 'none', data: {} };
      return ai;
    }
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
    console.log(ai);
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

/* SHOW_ORDERS */
handlers.show_orders = async (ai, session, lang) => {
  console.log(ai);  
  // 1. Figure-out whose orders we need
  const userId = session.userId;
  if (!userId) {
    ai.response = lang === 'es'
      ? 'Para ver tus pedidos necesito saber quién eres. Por favor inicia sesión primero.'
      : 'I need to know who you are to show orders – please sign-in first.';
    ai.action = { type: 'none', data: {} };
    ai.followUpQuestions = [
      lang === 'es' ? '¿Te gustaría iniciar sesión?' : 'Would you like to log-in?'
    ];
    return ai;
  }

  // 2. Fetch last 10 orders from MongoDB
  try {
    const Order = require('./models/Order');
    const orders = await Order.find({ userId })
                              .sort({ date: -1 })
                              .limit(10);

    ai.action = {
      type : 'show_orders',
      data : { orders, navigate : '/orders' }   // frontend can route to /orders
    };

    if (orders.length === 0) {
      ai.response = lang === 'es'
        ? 'Aún no tienes pedidos registrados.'
        : 'You do not have any orders yet.';
      ai.followUpQuestions = [
        lang === 'es' ? '¿Quieres empezar a comprar?' : 'Would you like to start shopping?'
      ];
    } else {
      ai.response = lang === 'es'
        ? `Tienes ${orders.length} pedido${orders.length > 1 ? 's' : ''} guardado${orders.length > 1 ? 's' : ''}.`
        : `You have ${orders.length} saved order${orders.length > 1 ? 's' : ''}.`;
      ai.followUpQuestions = [
        lang === 'es'
          ? '¿Deseas ver los detalles o volver a pedir algo?'
          : 'Would you like to view details or reorder anything?'
      ];
    }
    return ai;
  } catch (err) {
    console.error('SHOW_ORDERS handler error:', err);
    ai.response = lang === 'es'
      ? 'Hubo un problema al recuperar tus pedidos.'
      : 'There was a problem fetching your orders.';
    ai.action = { type: 'error', data: { error: err.message } };
    ai.followUpQuestions = [
      lang === 'es' ? '¿Intentar de nuevo?' : 'Would you like to try again?'
    ];
    return ai;
  }
};


// I did not understand your request.
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

  // Replace the existing chat endpoint section with this updated version:
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
        const userId = sessionId.split(':')[1]; // Format: "session:user123"
        if (userId) {
          session.userId = userId;
          try {
            const cartDoc = await Cart.findOne({ userId });
            if (cartDoc && cartDoc.items) {
              session.cart = cartDoc.items;
            }
          } catch (err) {
            console.error('Failed to load cart from DB:', err);
          }
        }
        sessions.set(sessionId, session);
      }

      // Update cart from frontend if provided
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
          model: 'meta-llama/llama-3.2-3b-instruct',
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
//find
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
      session.context.push(
        { role: 'user', message }, 
        { role: 'assistant', message: ai.response }
      );
      if (session.context.length > 10) session.context = session.context.slice(-10);

      sessions.set(sessionId, session);

      // Save cart to DB if userId is present
      if (session.userId) {
        try {
          await Cart.findOneAndUpdate(
            { userId: session.userId },
            { 
              items: session.cart,
              updatedAt: new Date()
            },
            { 
              upsert: true, // Create if doesn't exist
              new: true 
            }
          );
        } catch (err) {
          console.error('Failed to save cart to DB:', err);
        }
      }

      // Always attach cart
      ai.sessionCart = session.cart;

      return res.json(ai);
    } catch (err) {
      console.error(err);
      res.status(500).json({ intent: 'error', response: 'Server error', sessionCart: [] });
    }
  });

  app.post('/api/cart/add', async (req, res) => {
    try {
      const { productId, name, price, image, quantity = 1, selectedVariants = {}, userId } = req.body;
    
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId is required' 
        });
      }

      // Find or create cart for user
      let cart = await Cart.findOne({ userId });
    
      if (!cart) {
        cart = new Cart({
          userId,
          items: []
        });
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(item => 
        item._id.toString() === productId && 
        JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants)
      );

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        cart.items[existingItemIndex].quantity += parseInt(quantity);
      } else {
        // Add new item to cart
        cart.items.push({
          _id: productId,
          name,
          price: parseFloat(price),
          image,
          quantity: parseInt(quantity),
          selectedVariants
        });
      }

      await cart.save();

      // Also update in-memory session if exists
      const sessionId = `session:${userId}`;
      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.cart = cart.items;
        sessions.set(sessionId, session);
      }

      res.json({ 
        success: true, 
        message: 'Item added to cart',
        cart: cart.items,
        cartId: cart._id
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get cart items
  app.get('/api/cart/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const cart = await Cart.findOne({ userId });
    
      if (!cart) {
        return res.json([]);
      }
    
      res.json(cart.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ error: 'Failed to fetch cart' });
    }
  });
  
app.post('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { items } = req.body;
    
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { 
        items: items || [],
        updatedAt: new Date()
      },
      { 
        upsert: true,
        new: true 
      }
    );
    
    // Update in-memory session if exists
    const sessionId = `session:${userId}`;
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session.cart = cart.items;
      sessions.set(sessionId, session);
    }
    
    res.json({ success: true, cart: cart.items });
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});


  // Update cart item quantity
  app.put('/api/cart/update', async (req, res) => {
    try {
      const { userId, productId, quantity, selectedVariants = {} } = req.body;
    
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId is required' 
        });
      }

      const cart = await Cart.findOne({ userId });
    
      if (!cart) {
        return res.status(404).json({ 
          success: false, 
          error: 'Cart not found' 
        });
      }
    
      const itemIndex = cart.items.findIndex(item => 
        item._id.toString() === productId &&
        JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants)
      );
    
      if (itemIndex > -1) {
        if (parseInt(quantity) <= 0) {
          // Remove item if quantity is 0 or less
          cart.items.splice(itemIndex, 1);
        } else {
          cart.items[itemIndex].quantity = parseInt(quantity);
        }
      
        await cart.save();

        // Update in-memory session if exists
        const sessionId = `session:${userId}`;
        if (sessions.has(sessionId)) {
          const session = sessions.get(sessionId);
          session.cart = cart.items;
          sessions.set(sessionId, session);
        }

        res.json({ 
          success: true, 
          message: 'Cart updated', 
          cart: cart.items 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          error: 'Item not found in cart' 
        });
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Remove item from cart
  app.delete('/api/cart/remove', async (req, res) => {
    try {
      const { userId, productId, selectedVariants = {} } = req.body;
    
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId is required' 
        });
      }

      const cart = await Cart.findOne({ userId });
    
      if (!cart) {
        return res.status(404).json({ 
          success: false, 
          error: 'Cart not found' 
        });
      }
    
      cart.items = cart.items.filter(item => 
        !(item._id.toString() === productId && 
          JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants))
      );
    
      await cart.save();

      // Update in-memory session if exists
      const sessionId = `session:${userId}`;
      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.cart = cart.items;
        sessions.set(sessionId, session);
      }
    
      res.json({ 
        success: true, 
        message: 'Item removed from cart', 
        cart: cart.items 
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Clear cart
  app.delete('/api/cart/clear/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
    
      await Cart.findOneAndUpdate(
        { userId },
        { 
          items: [],
          updatedAt: new Date()
        },
        { upsert: true }
      );

      // Update in-memory session if exists
      const sessionId = `session:${userId}`;
      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.cart = [];
        sessions.set(sessionId, session);
      }
    
      res.json({ 
        success: true, 
        message: 'Cart cleared' 
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get cart summary (count and total)
  app.get('/api/cart/summary/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const cart = await Cart.findOne({ userId });
    
      if (!cart || !cart.items.length) {
        return res.json({ 
          itemCount: 0, 
          total: 0,
          cartId: null
        });
      }
    
      const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
      res.json({ 
        itemCount, 
        total: parseFloat(total.toFixed(2)),
        cartId: cart._id
      });
    } catch (error) {
      console.error('Error getting cart summary:', error);
      res.status(500).json({ error: 'Failed to get cart summary' });
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
