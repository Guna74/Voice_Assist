import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Modal from './Modal';

export default function Orders() {
  const { orders } = useContext(AppContext);
  const [modalOrder, setModalOrder] = React.useState(null);

  return (
    <div>
      <h2>Your Orders</h2>
      {orders.length === 0 && <p>No orders yet.</p>}
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            <span>Order #{order.id} - {order.date} - ${order.total.toFixed(2)}</span>
            <button onClick={() => setModalOrder(order)}>View Details</button>
          </li>
        ))}
      </ul>

      {modalOrder && (
        <Modal onClose={() => setModalOrder(null)}>
          <h3>Order #{modalOrder.id}</h3>
          <p><strong>Date:</strong> {modalOrder.date}</p>
          <p><strong>Total:</strong> ${modalOrder.total.toFixed(2)}</p>
          <h4>Items:</h4>
          <ul>
            {modalOrder.items.map(item => (
              <li key={item._id}>
                {item.name} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
              </li>
            ))}
          </ul>
          <p><strong>Shipping to:</strong> {modalOrder.customer.name}, {modalOrder.customer.address}</p>
        </Modal>
      )}
    </div>
  );
}
