import React, { useState, useEffect } from 'react';
import { fetchProductById } from '../services/api';
import VariantSelector from './VariantSelector';

export default function ProductDetail({ productId }) {
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState({ size: '', shoeSize: '', ram: '', storage: '' });

  useEffect(() => {
    fetchProductById(productId).then(({ data }) => {
      setProduct(data);
      // initialize with first available options if desired:
      const init = {};
      if (data.variants?.length) {
        const v = data.variants[0];
        ['size','shoeSize','ram','storage'].forEach(k => {
          if (v[k] !== undefined) init[k] = String(v[k]);
        });
      }
      setVariant(init);
    });
  }, [productId]);

  if (!product) return <div>Loading...</div>;

  // derive unique options
  const sizes     = [...new Set(product.variants.map(v => v.size)).values()].filter(Boolean);
  const shoeSizes = [...new Set(product.variants.map(v => v.shoeSize)).values()].filter(Boolean).map(String);
  const rams      = [...new Set(product.variants.map(v => v.ram)).values()].filter(Boolean);
  const storages  = [...new Set(product.variants.map(v => v.storage)).values()].filter(Boolean);

  return (
    <div>
      <h2>{product.name}</h2>
      <img src={product.image} alt={product.name} width={200} />
      <p>{product.description}</p>

      {sizes.length > 0 && (
        <VariantSelector
          label="Size"
          options={sizes.map(s => ({ value: s }))}
          selectedValue={variant.size}
          onSelect={val => setVariant(v => ({ ...v, size: val }))}
        />
      )}

      {shoeSizes.length > 0 && (
        <VariantSelector
          label="Shoe Size"
          options={shoeSizes.map(s => ({ value: s }))}
          selectedValue={variant.shoeSize}
          onSelect={val => setVariant(v => ({ ...v, shoeSize: val }))}
        />
      )}

      {rams.length > 0 && (
        <VariantSelector
          label="RAM"
          options={rams.map(r => ({ value: r }))}
          selectedValue={variant.ram}
          onSelect={val => setVariant(v => ({ ...v, ram: val }))}
        />
      )}

      {storages.length > 0 && (
        <VariantSelector
          label="Storage"
          options={storages.map(st => ({ value: st }))}
          selectedValue={variant.storage}
          onSelect={val => setVariant(v => ({ ...v, storage: val }))}
        />
      )}

      {product.sizeChart && (
        <a 
          href={product.sizeChart} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="size-chart-link"
        >
          View Size Chart
        </a>
      )}

      {/* Add to Cart button... */}
    </div>
  );
}
