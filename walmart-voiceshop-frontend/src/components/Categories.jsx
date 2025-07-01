import React from 'react';

export default function Categories({ onSelect, selectedCategory = '' }) {
  const categories = [
    { id: '', name: 'All Products', icon: '🛍️' },
    { id: 'Electronics', name: 'Electronics', icon: '📱' },
    { id: 'Clothing', name: 'Clothing', icon: '👕' },
    { id: 'Home', name: 'Home', icon: '🏠' },
    { id: 'Groceries', name: 'Groceries', icon: '🛒' }
  ];

  return (
    <div className="categories">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
          aria-label={`Filter by ${category.name}`}
        >
          <span style={{ marginRight: '8px' }}>{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}
