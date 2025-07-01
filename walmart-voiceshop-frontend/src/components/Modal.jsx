import React from 'react';

export default function Modal({ children, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        {children}
        <button onClick={onClose} className="modal-close" aria-label="Close">&times;</button>
      </div>
    </div>
  );
}
