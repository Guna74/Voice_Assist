import React, { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      setIsSearching(true);
      try {
        await onSearch(query.trim());
        setQuery('');
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="🔍 Search for products... (e.g., 'iPhone', 'groceries', 'sale items')"
          className="search-bar"
          disabled={isSearching}
          aria-label="Search for products"
          autoComplete="off"
        />
        <button 
          type="submit" 
          className="search-button"
          disabled={!query.trim() || isSearching}
          aria-label="Search"
        >
          {isSearching ? '⏳' : '🔍'}
        </button>
      </form>
      
      {/* Search suggestions */}
      <div className="search-suggestions" style={{ 
        fontSize: '12px', 
        color: '#6c757d', 
        textAlign: 'center', 
        marginTop: '8px' 
      }}>
        Try: "iPhone", "clothing", "groceries", or "show sale items"
      </div>
    </div>
  );
}
