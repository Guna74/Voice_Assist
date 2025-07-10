// src/components/VariantSelector.jsx

import React from 'react';
import PropTypes from 'prop-types';
import './VariantSelector.css';

export default function VariantSelector({ 
  label, 
  options, 
  selectedValue, 
  onSelect 
}) {
  return (
    <div className="variant-selector">
      <span className="variant-label">{label}</span>
      <div className="variant-buttons">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`variant-button${opt.value === selectedValue ? ' selected' : ''}`}
            onClick={() => onSelect(opt.value)}
          >
            {opt.display || opt.value}
          </button>
        ))}
      </div>
    </div>
  );
}

VariantSelector.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      display: PropTypes.string
    })
  ).isRequired,
  selectedValue: PropTypes.string,
  onSelect: PropTypes.func.isRequired
};
