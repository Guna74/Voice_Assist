// src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from './context/AppContext';
import VoiceControl from './components/VoiceControl';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import Orders from './components/Orders';
import SearchBar from './components/SearchBar';
import Categories from './components/Categories';
import { callChatAPI, fetchProducts, fetchSaleItems } from './services/api';
import VoiceAssistantDraggable from './components/VoiceAssistantDraggable';
import './components/VoiceAssistantDraggable.css';

export default function App() {
  const {
    cart,
    setCart,
    orders,
    messages,
    addMessage,
    currentLanguage,
    sessionId
  } = useAppContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('Featured Products');
  const [view, setView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCartPage, setShowCartPage] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(true);

  // Ref for auto‐scrolling the chat
  const chatEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
      setTitle('Featured Products');
    } finally {
      setLoading(false);
    }
  };

  const speakResponse = (text) => {
    return new Promise(resolve => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage;
        utterance.rate = 0.9;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  const handleCommand = async (message) => {
    addMessage('user', message);
    setLoading(true);

    let result;
    try {
      result = await callChatAPI(message, sessionId, currentLanguage);
    } catch {
      result = { response: 'Sorry, something went wrong.' };
    }

    // Sync cart from server if provided
    if (result.sessionCart) {
      setCart(result.sessionCart);
    }

    const { response, intent, entities, action, followUpQuestions } = result;

    if (response) {
      await speakResponse(response);
      addMessage('assistant', response);
    }

    // Close cart view on new searches or categories
    switch (intent) {
      case 'search':
        setShowCartPage(false);
        setTitle(`Search Results: ${entities?.product || message}`);
        setProducts(action?.data?.results || []);
        break;

      case 'show_category':
        setShowCartPage(false);
        setTitle(`${entities.category} Products`);
        setProducts(action?.data?.products || []);
        break;

      case 'show_all_products':
        setShowCartPage(false);
        setTitle('All Products');
        setProducts(action?.data?.products || []);
        break;

      case 'add_to_cart':
      case 'remove_from_cart':
      case 'show_cart':
        // cart is already synced above
        break;

      case 'navigate':
        if (action?.url === '/cart') setShowCartPage(true);
        if (action?.url === '/orders') setView('orders');
        break;

      case 'show_sale_items':
        setShowCartPage(false);
        setTitle('🔥 Sale Items');
        setProducts(action?.data?.products || []);
        break;

      default:
        break;
    }

    // Speak follow-ups if any
    if (followUpQuestions && followUpQuestions.length) {
      await speakResponse(followUpQuestions[0]);
      addMessage('assistant', followUpQuestions[0]);
    }

    setLoading(false);
  };

  const handleSearch = async (query) => {
    setShowCartPage(false);
    setLoading(true);
    setTitle(`Search Results: ${query}`);
    const results = await fetchProducts({ search: query });
    setProducts(results);
    addMessage('user', query);
    const reply = results.length
      ? `I found ${results.length} results for "${query}".`
      : `No results found for "${query}".`;
    await speakResponse(reply);
    addMessage('assistant', reply);
    setLoading(false);
  };

  const handleCategorySelect = async (categoryId) => {
    setShowCartPage(false);
    setLoading(true);
    setSelectedCategory(categoryId);
    if (!categoryId) {
      setTitle('All Products');
      const all = await fetchProducts();
      setProducts(all);
      await speakResponse(`Showing all products: ${all.length} items.`);
    } else {
      setTitle(`${categoryId} Products`);
      const catProducts = await fetchProducts({ category: categoryId });
      setProducts(catProducts);
      await speakResponse(`Showing ${categoryId}: ${catProducts.length} items.`);
    }
    setLoading(false);
  };

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const backToApp = () => setShowCartPage(false);

  const closeModal = () => setShowOrderModal(false);
  const openOrder = (order) => {
    setCurrentOrder(order);
    setShowOrderModal(true);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <span className="highlight">Walmart</span> VoiceShop
          </h1>
          <nav className="main-nav">
            <button onClick={() => { setView('home'); setShowCartPage(false); }}
              className={`nav-button ${view==='home' && !showCartPage? 'active':''}`}>
              Home
            </button>
            <button onClick={() => setShowCartPage(true)}
              className={`nav-button ${showCartPage ? 'active':''}`}>
              Cart {cartItemCount>0? `(${cartItemCount})`:''}
            </button>
            <button onClick={() => { setView('orders'); setShowCartPage(false); }}
              className={`nav-button ${view==='orders' && !showCartPage? 'active':''}`}>
              Orders
            </button>
          </nav>
        </div>
      </header>

      {/* Draggable Voice Assistant Box */}
      <VoiceAssistantDraggable>
        <VoiceControl
          onCommand={handleCommand}
          isOpen={isVoiceAssistantOpen}
          onToggle={() => setIsVoiceAssistantOpen(o => !o)}
        />
      </VoiceAssistantDraggable>
      
      
      {/* Main Content or Cart Page */}
      {showCartPage ? (
        <div className="container full-page-cart">
          <button className="back-button" onClick={backToApp}>
            ← Back to Store
          </button>
          <Cart />
        </div>
      ) : (
        <div className="container">
          <main className="main-content">
            {/* Chat Window */}
            <section className="chat-window">
              <div className="chat-header">
                <h2>Conversation</h2>
              </div>
              <div className="chat-messages">
                {messages.map((msg,i) => (
                  <div key={i}
                       className={`chat-message ${msg.role==='user'? 'user-msg':'assistant-msg'}`}>
                    <span className="chat-role">
                      {msg.role==='user'? 'You': 'Assistant'}:
                    </span>
                    <span className="chat-text">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </section>

            {/* Product or Orders View */}
            <div className="page-content">
              {view==='home' && (
                <>
                  <SearchBar onSearch={handleSearch} />
                  <Categories onSelect={handleCategorySelect}
                              selectedCategory={selectedCategory} />
                  {loading
                    ? <div className="loading">
                        <div className="spinner"></div>Loading...
                      </div>
                    : <ProductList products={products} title={title} />
                  }
                </>
              )}
              {view==='orders' && (
                <Orders onOrderClick={openOrder} />
              )}
            </div>
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="walmart-footer">
        <div className="footer-content">
          © 2025 Walmart VoiceShop • Powered by Voice AI
        </div>
      </footer>

      {/* Order Details Modal */}
      {showOrderModal && currentOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={closeModal} aria-label="Close">
              ×
            </button>
            <h2 className="modal-title">Order Details</h2>
            <div className="order-details">
              <p>Order ID: {currentOrder.id}</p>
              <p>Date: {currentOrder.date}</p>
              <p>Customer: {currentOrder.customer.name}</p>
              <p>Address: {currentOrder.customer.address}</p>
              <div className="order-items">
                <h3>Items:</h3>
                {currentOrder.items.map((item,i) => (
                  <div key={i} className="order-item">
                    <img src={item.image} alt={item.name} />
                    <div>
                      <p>{item.name}</p>
                      <p>Qty: {item.quantity}</p>
                      <p>${item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="order-total">
                Total: $
                {currentOrder.items
                  .reduce((sum,i) => sum + i.price*i.quantity, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
