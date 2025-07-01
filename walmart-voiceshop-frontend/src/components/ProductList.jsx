import React, { useContext } from 'react';
import { useAppContext } from '../context/AppContext';
import ProductCard from './ProductCard';

export default function ProductList({ products, title }) {
  const { addMessage } = useAppContext();
  return (
    <div className="product-list">
      <h2 className="section-title">{title}</h2>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
