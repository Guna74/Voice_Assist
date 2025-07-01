import React, { createContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [sessionId] = useState(() => uuidv4());
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! How can I help you today?' }
  ]);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  return (
    <AppContext.Provider value={{
      sessionId,
      currentLanguage,
      setCurrentLanguage,
      cart,
      setCart,
      orders,
      setOrders,
      messages,
      addMessage
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
