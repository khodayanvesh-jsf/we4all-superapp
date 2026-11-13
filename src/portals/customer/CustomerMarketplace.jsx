import React, { useEffect, useState } from 'react';
import { fetchActiveMerchantsWithCatalog, placeCustomerOrder } from '../../core/backendBridge';

export default function CustomerMarketplace() {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    paymentMethod: 'UPI / Cash on Delivery'
  });
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadMarketplace = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchActiveMerchantsWithCatalog();
      setMerchants(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load active merchants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, []);

  const addToCart = (item) => {
    setOrderSuccess(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: item.id, item_name: item.item_name, price: Number(item.price), qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const createdOrder = await placeCustomerOrder({
        merchantId: selectedMerchant.id,
        customerName: customerForm.customerName,
        customerPhone: customerForm.customerPhone,
        deliveryAddress: customerForm.deliveryAddress,
        paymentMethod: customerForm.paymentMethod,
        items: cart,
        totalAmount: cartTotal
      });
      setCart([]);
      setOrderSuccess(createdOrder);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedMerchant) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <button
          onClick={() => { setSelectedMerchant(null); setCart([]); setOrderSuccess(null); }}
          style={{ marginBottom: '16px', padding: '6px 12px', cursor: 'pointer' }}
        >
          ← Back to All Stores
        </button>

        <h2>{selectedMerchant.business_name}</h2>
        <p>Category: <strong>{selectedMerchant.category}</strong> | City: {selectedMerchant.city || 'Adilabad'}</p>
        <hr style={{ margin: '16px 0' }} />

        {orderSuccess && (
          <div style={{ padding: '16px', background: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Order Placed Successfully!</strong> Order ID: {orderSuccess.id.slice(0, 8)} — Total: ₹{orderSuccess.total_amount}. The merchant has received your order.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          <div>
            <h3>Available Products & Services</h3>
            {(!selectedMerchant.merchant_catalog || selectedMerchant.merchant_catalog.length === 0) ? (
              <p>This merchant has not added any items yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {selectedMerchant.merchant_catalog.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>{item.item_name}</h4>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745', margin: '0 0 12px 0' }}>₹{item.price}</p>
                    <button
                      onClick={() => addToCart(item)}
                      style={{ width: '100%', padding: '8px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0 }}>Your Order Cart</h3>
            {cart.length === 0 ? (
              <p style={{ color: '#666' }}>Your cart is empty. Add items from the catalog.</p>
            ) : (
              <>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
                  {cart.map((c) => (
                    <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                      <span>{c.item_name} x {c.qty}</span>
                      <span>
                        ₹{c.price * c.qty}{' '}
                        <button onClick={() => removeFromCart(c.id)} style={{ marginLeft: '6px', color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '16px' }}>
                  Total: ₹{cartTotal.toFixed(2)}
                </div>

                <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    placeholder="Your Full Name"
                    value={customerForm.customerName}
                    onChange={(e) => setCustomerForm({ ...customerForm, customerName: e.target.value })}
                    required
                    style={{ padding: '8px' }}
                  />
                  <input
                    placeholder="10-Digit Mobile Number"
                    value={customerForm.customerPhone}
                    onChange={(e) => setCustomerForm({ ...customerForm, customerPhone: e.target.value })}
                    required
                    style={{ padding: '8px' }}
                  />
                  <textarea
                    placeholder="Full Delivery Address / Landmark"
                    value={customerForm.deliveryAddress}
                    onChange={(e) => setCustomerForm({ ...customerForm, deliveryAddress: e.target.value })}
                    required
                    rows={3}
                    style={{ padding: '8px' }}
                  />
                  <select
                    value={customerForm.paymentMethod}
                    onChange={(e) => setCustomerForm({ ...customerForm, paymentMethod: e.target.value })}
                    style={{ padding: '8px' }}
                  >
                    <option value="UPI / Cash on Delivery">UPI / Cash on Delivery</option>
                    <option value="Store Pickup">Store Pickup</option>
                  </select>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {submitting ? 'Placing Order...' : `Place Order (₹${cartTotal.toFixed(2)})`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>WE4ALL Marketplace — Verified Local Stores</h2>
        <button onClick={loadMarketplace} style={{ padding: '8px 14px', cursor: 'pointer' }}>Refresh Stores</button>
      </div>

      {errorMsg && <div style={{ padding: '12px', background: '#ffeef0', color: '#d9534f', borderRadius: '6px', marginBottom: '16px' }}>{errorMsg}</div>}

      {loading ? (
        <p>Finding approved merchants near you...</p>
      ) : merchants.length === 0 ? (
        <p>No verified merchants are currently active. Approve merchants from #/admin-merchants first.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {merchants.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMerchant(m)}
              style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', background: '#fafafa', cursor: 'pointer' }}
            >
              <h3 style={{ margin: '0 0 6px 0', color: '#0066ff' }}>{m.business_name}</h3>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555', textTransform: 'capitalize' }}>
                {m.category} • {m.city || 'Adilabad'}
              </p>
              <span style={{ display: 'inline-block', padding: '4px 8px', background: '#e2f0d9', color: '#385723', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                Verified Partner ✓
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}