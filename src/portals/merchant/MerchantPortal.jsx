import React, { useState } from 'react';
import {
  registerPortalUser,
  loginToPortal,
  getMerchantDashboardData,
  addMerchantCatalogItem,
  fetchMerchantOrders,
  updateMerchantOrderStatus
} from '../../core/backendBridge';

export default function MerchantPortal() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'catalog'
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', businessName: '', category: 'grocery' });
  const [merchantData, setMerchantData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [newItem, setNewItem] = useState({ itemName: '', price: '' });
  const [statusMsg, setStatusMsg] = useState('');

  const loadOrders = async (merchantId) => {
    try {
      const orderList = await fetchMerchantOrders(merchantId);
      setOrders(orderList || []);
    } catch (err) {
      setStatusMsg(err.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setStatusMsg('Processing...');
    try {
      if (mode === 'register') {
        await registerPortalUser({ ...form, role: 'merchant' });
        setStatusMsg('Registration complete! Logging into Merchant Portal...');
      }
      const { user } = await loginToPortal({ email: form.email, password: form.password, requiredRole: 'merchant' });
      const store = await getMerchantDashboardData(user.id);
      setMerchantData(store);
      await loadOrders(store.id);
      setMode('dashboard');
      setStatusMsg('');
    } catch (err) {
      setStatusMsg(err.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.itemName || !newItem.price) return;
    try {
      const created = await addMerchantCatalogItem({
        merchantId: merchantData.id,
        itemName: newItem.itemName,
        price: newItem.price
      });
      setMerchantData({
        ...merchantData,
        merchant_catalog: [...(merchantData.merchant_catalog || []), created]
      });
      setNewItem({ itemName: '', price: '' });
    } catch (err) {
      setStatusMsg(err.message);
    }
  };

  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      const updated = await updateMerchantOrderStatus({ orderId, status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
    } catch (err) {
      alert('Failed to update order status: ' + err.message);
    }
  };

  if (mode === 'dashboard' && merchantData) {
    return (
      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0' }}>{merchantData.business_name} — Merchant Portal</h2>
            <p style={{ margin: 0 }}>Status: <strong>{merchantData.status.toUpperCase()}</strong> | Category: {merchantData.category}</p>
          </div>
          <button onClick={() => loadOrders(merchantData.id)} style={{ padding: '8px 14px', cursor: 'pointer' }}>
            Refresh Orders
          </button>
        </div>

        <hr style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'orders' ? '#0066ff' : '#f0f0f0',
              color: activeTab === 'orders' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Incoming Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'catalog' ? '#0066ff' : '#f0f0f0',
              color: activeTab === 'catalog' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Manage Catalog ({(merchantData.merchant_catalog || []).length})
          </button>
        </div>

        {activeTab === 'orders' ? (
          <div>
            <h3>Customer Orders</h3>
            {orders.length === 0 ? (
              <p>No customer orders yet. Orders placed in the Customer Marketplace will appear here.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {orders.map((order) => (
                  <div key={order.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Order #{order.id.slice(0, 8)} — ₹{order.total_amount}</strong>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#0066ff' }}>{order.status}</span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Customer:</strong> {order.customer_name} ({order.customer_phone})
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Delivery Address:</strong> {order.delivery_address} | <strong>Payment:</strong> {order.payment_method}
                    </p>
                    <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', margin: '10px 0' }}>
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} style={{ fontSize: '14px' }}>
                          • {item.item_name} x {item.qty} (₹{item.price * item.qty})
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleOrderStatus(order.id, 'accepted')} style={{ padding: '6px 12px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Accept Order
                      </button>
                      <button onClick={() => handleOrderStatus(order.id, 'out_for_delivery')} style={{ padding: '6px 12px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Out for Delivery
                      </button>
                      <button onClick={() => handleOrderStatus(order.id, 'completed')} style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Mark Completed
                      </button>
                      <button onClick={() => handleOrderStatus(order.id, 'cancelled')} style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3>Add Catalog Item / Service</h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input placeholder="Item Name" value={newItem.itemName} onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })} required style={{ padding: '8px' }} />
              <input type="number" placeholder="Price (INR)" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} required style={{ padding: '8px' }} />
              <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Item</button>
            </form>
            <h3>Your Active Catalog</h3>
            <ul>
              {(merchantData.merchant_catalog || []).map((item) => (
                <li key={item.id} style={{ marginBottom: '6px' }}>{item.item_name} — ₹{item.price}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '40px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>WE4ALL Merchant {mode === 'login' ? 'Login' : 'Registration'}</h2>
      {statusMsg && <p style={{ color: '#d9534f' }}>{statusMsg}</p>}
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="email" placeholder="Merchant Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={{ padding: '8px' }} />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={{ padding: '8px' }} />
        {mode === 'register' && (
          <>
            <input placeholder="Owner Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required style={{ padding: '8px' }} />
            <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required style={{ padding: '8px' }} />
            <input placeholder="Business / Shop Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required style={{ padding: '8px' }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ padding: '8px' }}>
              <option value="grocery">Grocery & Mart</option>
              <option value="food">Restaurant & Food</option>
              <option value="services">Local Services</option>
              <option value="pharmacy">Pharmacy</option>
            </select>
          </>
        )}
        <button type="submit" style={{ padding: '10px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {mode === 'login' ? 'Login to Merchant Portal' : 'Register Merchant Store'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer' }}>
        {mode === 'login' ? 'New merchant? Register your store' : 'Already registered? Login here'}
      </button>
    </div>
  );
}