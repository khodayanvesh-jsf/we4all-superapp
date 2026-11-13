import React, { useState } from 'react';
import { registerPortalUser, loginToPortal, getMerchantDashboardData, addMerchantCatalogItem } from '../../core/backendBridge';

export default function MerchantPortal() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', businessName: '', category: 'grocery' });
  const [merchantData, setMerchantData] = useState(null);
  const [newItem, setNewItem] = useState({ itemName: '', price: '' });
  const [statusMsg, setStatusMsg] = useState('');

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

  if (mode === 'dashboard' && merchantData) {
    return (
      <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <h2>{merchantData.business_name} — Merchant Portal</h2>
        <p>Status: <strong>{merchantData.status.toUpperCase()}</strong> | Category: {merchantData.category}</p>
        <hr />
        <h3>Add Catalog Item / Service</h3>
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input placeholder="Item Name" value={newItem.itemName} onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })} required />
          <input type="number" placeholder="Price (INR)" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} required />
          <button type="submit">Add Item</button>
        </form>
        <h3>Your Active Catalog</h3>
        <ul>
          {(merchantData.merchant_catalog || []).map((item) => (
            <li key={item.id}>{item.item_name} — ₹{item.price}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '40px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>WE4ALL Merchant {mode === 'login' ? 'Login' : 'Registration'}</h2>
      {statusMsg && <p style={{ color: '#d9534f' }}>{statusMsg}</p>}
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="email" placeholder="Merchant Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {mode === 'register' && (
          <>
            <input placeholder="Owner Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input placeholder="Business / Shop Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="grocery">Grocery & Mart</option>
              <option value="food">Restaurant & Food</option>
              <option value="services">Local Services</option>
              <option value="pharmacy">Pharmacy</option>
            </select>
          </>
        )}
        <button type="submit" style={{ padding: '10px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px' }}>
          {mode === 'login' ? 'Login to Merchant Portal' : 'Register Merchant Store'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer' }}>
        {mode === 'login' ? 'New merchant? Register your store' : 'Already registered? Login here'}
      </button>
    </div>
  );
}
