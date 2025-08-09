// ✅ MainApp.jsx - with persistent cart & orders integration

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import VoiceControl from './VoiceControl';
import ProductList from './ProductList';
import Cart from './Cart';
import Orders from './Orders';
import SearchBar from './SearchBar';
import Categories from './Categories';
import VoiceAssistantDraggable from './VoiceAssistantDraggable';
import { callChatAPI, fetchProducts, fetchSaleItems } from '../services/api';

const getItemPrice = (item) => {
  if (item.price != null) return item.price;
  if (item.variants?.length > 0 && item.variants[0].price != null) {
    return item.variants[0].price;
  }
  return 0;
};

const MainApp = () => {
  const { user, logout } = useAuth();
  const {
    cart,
    setCart,
    orders,
    setOrders,
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

  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadCart = async () => {
      if (user?.id) {
        try {
          const res = await fetch(`/api/cart/${user.id}`);
          const data = await res.json();
          if (Array.isArray(data)) setCart(data);
        } catch (e) {
          console.error('Error loading cart:', e);
        }
      }
    };
    loadCart();
  }, [user]);

  useEffect(() => {
    const loadOrders = async () => {
      if (user?.id) {
        try {
          const res = await fetch(`/api/orders/${user.id}`);
          const data = await res.json();
          if (Array.isArray(data)) setOrders(data);
        } catch (e) {
          console.error('Error loading orders:', e);
        }
      }
    };
    loadOrders();
  }, [user]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
        const utterance = new window.SpeechSynthesisUtterance(text);
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
      const sid = user?.id ? `session:${user.id}` : sessionId;
      result = await callChatAPI(message, sid, currentLanguage, cart);

    } catch {
      result = { response: 'Sorry, something went wrong.' };
    }

    if (result.sessionCart) setCart(result.sessionCart);

    const { response, intent, entities, action, followUpQuestions } = result;

    if (response) {
      await speakResponse(response);
      addMessage('assistant', response);
    }

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

      case 'show_orders':
        startTransition(() => {
          setView('orders');
          setShowCartPage(false);
        });
        break;

      case 'show_all_products':
        setShowCartPage(false);
        setTitle('All Products');
        setProducts(action?.data?.products || []);
        break;
      case 'show_cart':
        startTransition(() => setShowCartPage(true));
        break;
      case 'navigate':
        if (action?.url === '/cart') setShowCartPage(true);
        if (action?.url === '/orders') setView('orders');
        break;
      case 'show_sale_items':
        startTransition(async () => {
          setShowCartPage(false);
          setTitle('🔥 Sale Items');
          const sale = action?.data?.products || await fetchSaleItems();
          setProducts(sale);
        });
        break;
      default:
        break;
    }

    if (followUpQuestions?.length) {
      const followText = typeof followUpQuestions[0] === 'string'
        ? followUpQuestions[0]
        : followUpQuestions[0].question || JSON.stringify(followUpQuestions[0]);
      await speakResponse(followText);
      addMessage('assistant', followText);
    }

    setLoading(false);
  };

  const handleSearch = async (query) => {
    startTransition(() => setShowCartPage(false));
    setLoading(true);
    setTitle(`Search Results: ${query}`);
    const results = await fetchProducts({ search: query });
    startTransition(() => setProducts(results));
    addMessage('user', query);
    const reply = results.length
      ? `I found ${results.length} results for "${query}".`
      : `No results found for "${query}".`;
    await speakResponse(reply);
    addMessage('assistant', reply);
    setLoading(false);
  };

  const handleCategorySelect = async (categoryId) => {
    startTransition(() => setShowCartPage(false));
    setLoading(true);
    setSelectedCategory(categoryId);
    if (!categoryId) {
      const all = await fetchProducts();
      setProducts(all);
      setTitle('All Products');
      await speakResponse('Showing all products.');
    } else {
      const catProducts = await fetchProducts({ category: categoryId });
      setProducts(catProducts);
      setTitle(`${categoryId} Products`);
      await speakResponse(`Showing ${categoryId} products.`);
    }
    setLoading(false);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const backToApp = () => setShowCartPage(false);
  const closeModal = () => setShowOrderModal(false);
  const openOrder = (order) => { setCurrentOrder(order); setShowOrderModal(true); };
  const handleLogout = () => { logout(); window.location.reload(); };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo"><span className="highlight">VoiceShop</span> </h1>
          <nav className="main-nav">
            <button onClick={() => { setView('home'); setShowCartPage(false); }}
              className={`nav-button ${view==='home' && !showCartPage? 'active':''}`}>Home</button>
            <button onClick={() => setShowCartPage(true)}
              className={`nav-button ${showCartPage ? 'active':''}`}>
              Cart {cartItemCount>0? `(${cartItemCount})`:''}
            </button>
            <button onClick={() => { setView('orders'); setShowCartPage(false); }}
              className={`nav-button ${view==='orders' && !showCartPage? 'active':''}`}>Orders</button>
            <div className="user-menu">
              <span className="user-welcome">Welcome, {user?.name}</span>
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>
          </nav>
        </div>
      </header>

      <VoiceAssistantDraggable>
        <VoiceControl
          onCommand={handleCommand}
          isOpen={isVoiceAssistantOpen}
          onToggle={() => setIsVoiceAssistantOpen(o => !o)}
        />
      </VoiceAssistantDraggable>

      {showCartPage ? (
        <div className="container full-page-cart">
          <button className="back-button" onClick={backToApp}>← Back to Store</button>
          <Cart />
        </div>
      ) : (
        <div className="container">
          <main className="main-content">
            <section className="chat-window">
              <div className="chat-header"><h2>Conversation</h2></div>
              <div className="chat-messages">
                {messages.map((msg,i) => (
                  <div key={i} className={`chat-message ${msg.role==='user'? 'user-msg':'assistant-msg'}`}>
                    <span className="chat-role">{msg.role==='user'? 'You': 'Assistant'}:</span>
                    <span className="chat-text">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </section>
            <div className="page-content">
              {view==='home' && (
                <>
                  <SearchBar onSearch={handleSearch} />
                  <Categories onSelect={handleCategorySelect} selectedCategory={selectedCategory} />
                  {loading
                    ? <div className="loading"><div className="spinner"></div>Loading...</div>
                    : <ProductList products={products} title={title} />
                  }
                </>
              )}
              {view==='orders' && <Orders onOrderClick={openOrder} />}
            </div>
          </main>
        </div>
      )}

      <footer className="walmart-footer">
        <div className="footer-content">© 2025 VoiceShop • Powered by Voice AI</div>
      </footer>

      {showOrderModal && currentOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
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
                      <p>${getItemPrice(item).toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="order-total">
                Total: ${currentOrder.items.reduce((sum,i) => sum + getItemPrice(i)*i.quantity, 0).toFixed(2)}
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainApp;
