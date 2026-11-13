import React, { useEffect, useState } from 'react';
import {
  fetchActiveMerchantsWithCatalog,
  placeCustomerOrder,
  fetchCustomerOrders,
  subscribeToOrderStatusChanges
} from '../../core/backendBridge';

const STATUS_STEPS = ['pending', 'accepted', 'out_for_delivery', 'completed'];
const STATUS_LABELS = {
  pending: 'Order Placed',
  accepted: 'Accepted by Store',
  out_for_delivery: 'Out for Delivery',
  completed: 'Delivered',
  cancelled: 'Cancelled'
};

export default function CustomerMarketplace() {
  const [viewMode, setViewMode] = useState('stores'); // 'stores' | 'track'
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    customerName: localStorage.getItem('we4all_cust_name') || '',
    customerPhone: localStorage.getItem('we4all_cust_phone') || '',
    deliveryAddress: localStorage.getItem('we4all_cust_addr') || '',
    paymentMethod: 'UPI / Cash on Delivery'
  });

  const [trackPhone, setTrackPhone] = useState(localStorage.getItem('we4all_cust_phone') || '');
  const [myOrders, setMyOrders] = useState([]);
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

  const loadCustomerOrders = async (phoneOverride) => {
    const savedIds = JSON.parse(localStorage.getItem('we4all_order_ids') || '[]');
    const phoneToUse = phoneOverride !== undefined ? phoneOverride : trackPhone;
    try {
      const data = await fetchCustomerOrders({ customerPhone: phoneToUse, orderIds: savedIds });
      setMyOrders(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Could not fetch order status.');
    }
  };

  useEffect(() => {
    loadMarketplace();
    loadCustomerOrders();

    // Subscribe to live status updates from Merchant Portal
    const unsubscribe = subscribeToOrderStatusChanges((updatedOrder) => {
      setMyOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o))
      );
    });

    return () => unsubscribe();
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

      // Save customer details & order ID locally for instant tracking
      localStorage.setItem('we4all_cust_name', customerForm.customerName);
      localStorage.setItem('we4all_cust_phone', customerForm.customerPhone);
      localStorage.setItem('we4all_cust_addr', customerForm.deliveryAddress);
      const savedIds = JSON.parse(localStorage.getItem('we4all_order_ids') || '[]');
      const updatedIds = [createdOrder.id, ...savedIds].slice(0, 20);
      localStorage.setItem('we4all_order_ids', JSON.stringify(updatedIds));

      setTrackPhone(customerForm.customerPhone);
      setCart([]);
      setOrderSuccess(createdOrder);
      await loadCustomerOrders(customerForm.customerPhone);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusStepper = (currentStatus) => {
    if (currentStatus === 'cancelled') {
      return (
        <div style={{ padding: '10px', background: '#ffeef0', color: '#dc3545', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px' }}>
          ✕ Order Cancelled by Store
        </div>
      );
    }

    const currentIndex = STATUS_STEPS.indexOf(currentStatus);

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', gap: '8px' }}>
        {STATUS_STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          return (
            <div
              key={step}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 6px',
                borderRadius: '6px',
                background: isDone ? '#28a745' : '#e9ecef',
                color: isDone ? '#fff' : '#6c757d',
                fontSize: '12px',
                fontWeight: isDone ? 'bold' : 'normal',
                transition: 'all 0.3s'
              }}
            >
              {isDone ? '✓ ' : `${idx + 1}. `}
              {STATUS_LABELS[step]}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>WE4ALL Customer Marketplace</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setViewMode('stores'); setSelectedMerchant(null); }}
            style={{
              padding: '8px 16px',
              background: viewMode === 'stores' ? '#0066ff' : '#f0f0f0',
              color: viewMode === 'stores' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Browse Stores
          </button>
          <button
            onClick={() => { setViewMode('track'); loadCustomerOrders(); }}
            style={{
              padding: '8px 16px',
              background: viewMode === 'track' ? '#0066ff' : '#f0f0f0',
              color: viewMode === 'track' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Track My Orders ({myOrders.length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#ffeef0', color: '#d9534f', borderRadius: '6px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* VIEW 1: LIVE ORDER TRACKING */}
      {viewMode === 'track' ? (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder="Enter 10-Digit Mobile Number to Track Orders"
              value={trackPhone}
              onChange={(e) => setTrackPhone(e.target.value)}
              style={{ padding: '10px', width: '280px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <button
              onClick={() => loadCustomerOrders(trackPhone)}
              style={{ padding: '10px 18px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Find / Refresh Orders
            </button>
          </div>

          {myOrders.length === 0 ? (
            <p style={{ color: '#555' }}>No orders found. Place an order from a store or enter your registered mobile number above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myOrders.map((order) => (
                <div key={order.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '18px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', color: '#0066ff' }}>
                        {order.merchants?.business_name || 'Local Store'}
                      </h3>
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        Order #{order.id.slice(0, 8)} • Placed on {new Date(order.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                      Total: ₹{order.total_amount}
                    </div>
                  </div>

                  {/* Visual Progress Stepper */}
                  {renderStatusStepper(order.status)}

                  <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginTop: '12px', fontSize: '14px' }}>
                    <strong>Items:</strong>{' '}
                    {(order.items || []).map((i, idx) => (
                      <span key={idx}>
                        {i.item_name} x {i.qty} (₹{i.price * i.qty}){idx < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                    <div style={{ marginTop: '6px', color: '#555' }}>
                      <strong>Delivery To:</strong> {order.delivery_address} ({order.payment_method})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : selectedMerchant ? (
        /* VIEW 2: SELECTED STORE CATALOG & CART */
        <div>
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
            <div style={{ padding: '16px', background: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong>Order Placed!</strong> Order #{orderSuccess.id.slice(0, 8)} (₹{orderSuccess.total_amount}) sent to store.
              </span>
              <button
                onClick={() => setViewMode('track')}
                style={{ padding: '8px 14px', background: '#155724', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Track Live Status →
              </button>
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
      ) : (
        /* VIEW 3: STORE DIRECTORY */
        <div>
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
      )}
    </div>
  );
}