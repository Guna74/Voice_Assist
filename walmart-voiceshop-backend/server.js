/*******************************************************************************
 * Walmart Voice-Shop Backend
 * ─────────────────────────
 * • Express + MongoDB API that powers the React “Voice-Shop” front-end
 * • Uses  OpenRouter  (LLM as a service) to parse natural-language requests
 * • Keeps a per-session shopping-cart in RAM (Map) for demo simplicity
 *
 *  CHANGES in this version
 *  ───────────────────────
 *  1.  Replaced the long  if/else  intent chain with a **handler table**.
 *  2.  Fixed  remove_from_cart  logic (case-insensitive / partial matches,
 *      quantity subtraction, row deletion when qty ≤ 0).
 *  3.  Nothing else in the public API or JSON contract has changed.
 ******************************************************************************/

// ─────────────────────────────────────────────────────────────────────────────
//  Imports & Initial setup
// ─────────────────────────────────────────────────────────────────────────────
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const fetch    = require('node-fetch');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────────────────────
//  MongoDB model
// ─────────────────────────────────────────────────────────────────────────────
const Product = require('./models/Product');   // Mongoose schema (name, price …)

// ─────────────────────────────────────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());                        // Parse JSON bodies

// ─────────────────────────────────────────────────────────────────────────────
//  Database connection
// ─────────────────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser:true, useUnifiedTopology:true })
  .then(() => console.log('✓ Connected to MongoDB Atlas'))
  .catch(err =>  console.error('✗ MongoDB connection error:', err));

// ─────────────────────────────────────────────────────────────────────────────
//  In-memory session store  (key = sessionId, value = {context:[], cart:[]} )
//  For production swap with Redis or DB.
// ─────────────────────────────────────────────────────────────────────────────
const sessions = new Map();

// ─────────────────────────────────────────────────────────────────────────────
//  Environment variables
// ─────────────────────────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
//  Helper utilities
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
  try {
    const re = new RegExp(name.split(' ')[0], 'i');
    return await Product.findOne({ name: re });
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
  entities         { product, quantity, category }
  action           { type, data }
  response         (plain text)
  followUpQuestions[ ]
IMPORTANT: Include 1 follow-up question.
Products: iPhone, Samsung Galaxy, MacBook, AirPods, shirts, shoes, jackets,
          jeans, coffee maker, vacuum, table, bedding, bananas, milk, bread, chicken.
Categories: Electronics, Clothing, Home, Groceries.
`;
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
  action: { type:'none', data:{} },
  response: lang.startsWith('es')
    ? 'Lo siento, no entendí. ¿Puedes reformular?'
    : 'Sorry, I did not understand. Could you rephrase?',
  followUpQuestions: lang.startsWith('es')
    ? ['¿Te muestro productos populares?']
    : ['Would you like to see popular products?']
});

// ─────────────────────────────────────────────────────────────────────────────
//  Intent handlers  (each returns updated aiResponse object)
// ─────────────────────────────────────────────────────────────────────────────
const handlers = {};

/* SEARCH */
handlers.search = async (ai, session, lang) => {
  const term = ai.entities.product;
  const items = await findProducts(term);
  ai.action   = { type:'search', data:{ query:term, results:items } };
  ai.response = items.length
    ? (lang==='es'
        ? `Encontré ${items.length} resultados para "${term}".`
        : `I found ${items.length} results for "${term}".`)
    : (lang==='es'
        ? `No encontré resultados para "${term}".`
        : `No results found for "${term}".`);
  ai.followUpQuestions = lang==='es'
    ? ['¿Quieres añadir algo al carrito?']
    : ['Would you like to add any to your cart?'];
  return ai;
};

/* ADD_TO_CART */
handlers.add_to_cart = async (ai, session, lang) => {
  const qty = ai.entities.quantity || 1;
  const prod = await findProductByName(ai.entities.product);
  if (!prod) {
    ai.response = lang==='es'
      ? `No encontré "${ai.entities.product}".`
      : `Could not find "${ai.entities.product}".`;
    ai.action = { type:'none', data:{} };
    return ai;
  }
  const idx = session.cart.findIndex(i => i._id.toString() === prod._id.toString());
  if (idx > -1) session.cart[idx].quantity += qty;
  else session.cart.push({ ...prod.toObject(), quantity: qty });

  ai.action = { type:'add_to_cart', data:{ cart:session.cart, product:prod, quantity:qty } };
  const total = session.cart.reduce((s,i)=>s+i.quantity,0);
  ai.response = lang==='es'
    ? `Añadí ${qty} ${prod.name}. Total artículos: ${total}.`
    : `Added ${qty} ${prod.name}. Total items: ${total}.`;
  ai.followUpQuestions = lang==='es'
    ? ['¿Quieres ver tu carrito?']
    : ['Do you want to see your cart?'];
  return ai;
};

/* SHOW_CART */
handlers.show_cart = async (ai, session, lang) => {
  const count = session.cart.reduce((s,i)=>s+i.quantity,0);
  const total = session.cart.reduce((s,i)=>s+i.quantity*i.price,0).toFixed(2);
  ai.action   = { type:'show_cart', data:{ cart:session.cart } };
  ai.response = count
    ? (lang==='es'
        ? `Tienes ${count} artículos por $${total}.`
        : `You have ${count} items totaling $${total}.`)
    : (lang==='es' ? 'Tu carrito está vacío.' : 'Your cart is empty.');
  ai.followUpQuestions = lang==='es'
    ? ['¿Listo para pagar?']
    : ['Ready to checkout?'];
  return ai;
};

/* REMOVE_FROM_CART */
handlers.remove_from_cart = async (ai, session, lang) => {
  const name = (ai.entities.product || '').toLowerCase().trim();
  const qty  = ai.entities.quantity || 1;

  const idx = session.cart.findIndex(
    item => item.name.toLowerCase().includes(name)
  );
  if (idx === -1) {
    ai.response = lang==='es'
      ? `No encontré "${ai.entities.product}" en tu carrito.`
      : `Could not find "${ai.entities.product}" in your cart.`;
    ai.action = { type:'none', data:{} };
    return ai;
  }

  // Update or remove line
  if (qty >= session.cart[idx].quantity) session.cart.splice(idx,1);
  else session.cart[idx].quantity -= qty;

  ai.action = { type:'remove_from_cart', data:{ cart:session.cart } };
  ai.response = lang==='es'
    ? 'Hecho, actualicé tu carrito.'
    : 'Done, I updated your cart.';
  ai.followUpQuestions = lang==='es'
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
  const cat   = ai.entities.category;
  const items = await findProducts('', cat);
  ai.action   = { type:'show_category', data:{ category:cat, products:items } };
  ai.response = lang==='es'
    ? `Mostrando categoría ${cat}.`
    : `Showing ${cat} category.`;
  ai.followUpQuestions = lang==='es'
    ? ['¿Quieres añadir algo al carrito?']
    : ['Do you want to add anything to the cart?'];
  return ai;
};

/* SHOW_SALE_ITEMS */
handlers.show_sale_items = async (ai, session, lang) => {
  const items = await Product.find({ onSale:true });
  ai.action   = { type:'show_sale_items', data:{ products:items } };
  ai.response = lang==='es'
    ? `Aquí están los artículos en oferta (${items.length}).`
    : `Here are the sale items (${items.length}).`;
  ai.followUpQuestions = lang==='es'
    ? ['¿Quieres añadir alguno?']
    : ['Would you like to add any?'];
  return ai;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Generic intent router
// ─────────────────────────────────────────────────────────────────────────────
const processIntent = async (ai, session, lang) => {
  const handler = handlers[ai.intent];
  if (!handler) return ai;                     // unknown intent, return as-is
  return await handler(ai, session, lang);
};

// ─────────────────────────────────────────────────────────────────────────────
//  REST  API routes
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/products', async (req,res)=>{
  try {
    const { category, search, limit=20 } = req.query;
    res.json(await findProducts(search, category, +limit));
  } catch(e){ res.status(500).json({error:'DB error'}); }
});

app.get('/api/products/:id', async (req,res)=>{
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({error:'Not found'});
    res.json(p);
  } catch(e){ res.status(500).json({error:'DB error'}); }
});

app.get('/api/products/sale/items', async (_req,res)=>{
  try { res.json(await Product.find({ onSale:true })); }
  catch(e){ res.status(500).json({error:'DB error'}); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CHAT endpoint  → talks to OpenRouter
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req,res)=>{
  try {
    const { message, sessionId, language='en-US' } = req.body;

    if (!message || !sessionId)
      return res.status(400).json({ intent:'error', response:'Missing fields', sessionCart:[] });
    if (!OPENROUTER_API_KEY)
      return res.status(500).json({ intent:'error', response:'API key missing', sessionCart:[] });

    // Get / init session
    const session = sessions.get(sessionId) || { context:[], cart:[] };
    const lang = language.startsWith('es') ? 'es' : 'en';
    const prompt = buildPrompt(message, session.context, lang);

    // Call OpenRouter
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method :'POST',
      headers:{
        'Authorization':`Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type' :'application/json',
        'X-Title'      :'Walmart VoiceShop'
      },
      body: JSON.stringify({
        model   :'meta-llama/llama-3-8b-instruct',
        messages:[
          { role:'system', content:prompt },
          { role:'user',   content:message }
        ],
        max_tokens : 300,
        temperature: 0.1
      })
    });
    const orJson = await orRes.json();
    const aiRaw  = orJson.choices?.[0]?.message?.content || '';

    // Parse JSON from model
    let ai;
    try {
      ai = JSON.parse(aiRaw.match(/\{[\s\S]*\}/)[0]);
      if (!ai.intent) throw new Error('intent missing');
    } catch {
      ai = await fallback(message, session, lang);
    }

    //  Process intent
    ai = await processIntent(ai, session, lang);

    //  Save conversation context (last 10 turns)
    session.context.push({role:'user',message},{role:'assistant',message:ai.response});
    if (session.context.length>10) session.context = session.context.slice(-10);
    sessions.set(sessionId, session);

    //  Always attach cart
    ai.sessionCart = session.cart;
    return res.json(ai);

  } catch(err) {
    console.error(err);
    res.status(500).json({ intent:'error', response:'Server error', sessionCart:[] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Health-check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req,res)=>res.json({
  status : 'OK',
  db     : mongoose.connection.readyState===1 ? 'Connected':'Disconnected',
  openrouter : !!OPENROUTER_API_KEY
}));

// ─────────────────────────────────────────────────────────────────────────────
//  Start server
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, ()=> {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`Health:  http://localhost:${PORT}/api/health`);
});
