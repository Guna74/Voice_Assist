import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import './Orders.css';

export default function Orders({ onOrderClick }) {
  const { orders } = useContext(AppContext);
  const [modalOrder, setModalOrder] = useState(null);

  if (!orders || orders.length === 0) {
    return (
      <div className="orders-section">
        <div className="orders-empty">
          <div className="orders-empty-icon">📦</div>
          No orders yet.
        </div>
      </div>
    );
  }

  return (
    <div className="orders-section">
      <div className="orders-title">Your Orders</div>
      <div className="orders-list">
        {orders.map(order => (
          <div
            key={order.id}
            className="order-item"
            onClick={() => setModalOrder(order)}
            tabIndex={0}
            role="button"
            aria-label={`View order ${order.id} details`}
          >
            <div className="order-summary">
              <div className="order-id">Order #{order.id}</div>
              <div className="order-date">{order.date}</div>
              <div className="order-total">${order.total?.toFixed(2) ?? '0.00'}</div>
              <span className="order-status">{order.status || 'Completed'}</span>
            </div>
            <button
              className="order-details-btn"
              onClick={e => {
                e.stopPropagation();
                setModalOrder(order);
              }}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {modalOrder && (
        <div className="modal-overlay" onClick={() => setModalOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setModalOrder(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="modal-title">Order Details</h2>
            <div className="order-details">
              <div>
                <strong>Date:</strong> {modalOrder.date}
              </div>
              <div>
                <strong>Total:</strong> ${modalOrder.total?.toFixed(2) ?? '0.00'}
              </div>
              <div>
                <strong>Shipping to:</strong> {modalOrder.customer?.name}, {modalOrder.customer?.address}
              </div>
              <div className="order-items" style={{ marginTop: '18px' }}>
                <h3 style={{ color: '#0071ce', marginBottom: '8px' }}>Items:</h3>
                {modalOrder.items.map((item, i) => (
                  <div key={i} className="order-item" style={{ background: 'none', border: 'none', boxShadow: 'none', cursor: 'default', padding: 0, gap: 10 }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', marginRight: 10 }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333' }}>{item.name}</div>
                      <div style={{ fontSize: 14, color: '#6c757d' }}>Qty: {item.quantity}</div>
                      <div style={{ fontSize: 14, color: '#0071ce' }}>${item.price?.toFixed(2) ?? '0.00'} each</div>
                      {/* Display selected variants if present */}
                      {item.selectedVariants && (
                        <div style={{ fontSize: '0.95em', color: '#0071ce', marginTop: 2 }}>
                          {Object.entries(item.selectedVariants).map(([key, value]) => (
                            <span key={key} style={{ marginRight: 8 }}>
                              {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={() => setModalOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
