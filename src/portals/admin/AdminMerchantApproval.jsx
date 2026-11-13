import React, { useEffect, useState } from 'react';
import {
  fetchAllMerchantsForAdmin,
  updateMerchantApprovalStatus,
  fetchAllOrdersForAdmin,
  updateMerchantOrderStatus,
  subscribeToAllOrdersAdmin
} from '../../core/backendBridge';

export default function AdminMerchantApproval() {
  const [sectionTab, setSectionTab] = useState('merchants'); // 'merchants' | 'orders'

  // Merchant Approvals State
  const [merchants, setMerchants] = useState([]);
  const [merchantFilter, setMerchantFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'suspended'
  const [loadingMerchants, setLoadingMerchants] = useState(true);

  // Live Orders State
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'out_for_delivery' | 'completed' | 'cancelled'
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');

  const loadMerchants = async () => {
    setLoadingMerchants(true);
    setErrorMsg('');
    try {
      const data = await fetchAllMerchantsForAdmin();
      setMerchants(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load merchants. Ensure your account has role = admin in profiles.');
    } finally {
      setLoadingMerchants(false);
    }
  };

  const loadAllOrders = async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    try {
      const data = await fetchAllOrdersForAdmin();
      setOrders(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load live orders.');
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadMerchants();
    loadAllOrders();

    // Auto-refresh orders list whenever any customer places an order or a merchant updates status
    const unsubscribe = subscribeToAllOrdersAdmin(() => {
      loadAllOrders(true);
    });

    return () => unsubscribe();
  }, []);

  const handleMerchantStatusChange = async (merchantId, newStatus, verifyFlag) => {
    try {
      const updated = await updateMerchantApprovalStatus({
        merchantId,
        status: newStatus,
        isVerified: verifyFlag
      });
      setMerchants((prev) =>
        prev.map((m) => (m.id === merchantId ? { ...m, status: updated.status, is_verified: updated.is_verified } : m))
      );
    } catch (err) {
      alert('Error updating merchant status: ' + err.message);
    }
  };

  const handleAdminOrderOverride = async (orderId, newStatus) => {
    try {
      const updated = await updateMerchantOrderStatus({ orderId, status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
    } catch (err) {
      alert('Error updating order status: ' + err.message);
    }
  };

  const filteredMerchants = merchants.filter((m) => (merchantFilter === 'all' ? true : m.status === merchantFilter));
  const filteredOrders = orders.filter((o) => (orderFilter === 'all' ? true : o.status === orderFilter));

  const activeOrdersCount = orders.filter((o) => ['pending', 'accepted', 'out_for_delivery'].includes(o.status)).length;
  const completedRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header & Top Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0' }}>WE4ALL Admin Control Center</h2>
          <span style={{ fontSize: '12px', color: '#28a745', fontWeight: 'bold' }}>
            ● Live Realtime Sync Active
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSectionTab('merchants')}
            style={{
              padding: '10px 18px',
              background: sectionTab === 'merchants' ? '#0066ff' : '#f0f0f0',
              color: sectionTab === 'merchants' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Merchant Approvals ({merchants.length})
          </button>
          <button
            onClick={() => { setSectionTab('orders'); loadAllOrders(); }}
            style={{
              padding: '10px 18px',
              background: sectionTab === 'orders' ? '#0066ff' : '#f0f0f0',
              color: sectionTab === 'orders' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            All Live Orders ({orders.length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#ffeef0', color: '#d9534f', borderRadius: '6px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* TAB 1: MERCHANT APPROVALS */}
      {sectionTab === 'merchants' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'pending', 'active', 'suspended'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMerchantFilter(tab)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    background: merchantFilter === tab ? '#111827' : '#f8f9fa',
                    color: merchantFilter === tab ? '#fff' : '#333',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab} ({tab === 'all' ? merchants.length : merchants.filter((m) => m.status === tab).length})
                </button>
              ))}
            </div>
            <button onClick={loadMerchants} style={{ padding: '8px 14px', cursor: 'pointer' }}>
              Refresh Merchants
            </button>
          </div>

          {loadingMerchants ? (
            <p>Loading merchant registrations...</p>
          ) : filteredMerchants.length === 0 ? (
            <p>No merchants found in "{merchantFilter}" state.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f4f6f8', textAlign: 'left' }}>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Business Name</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Category & City</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Owner Contact</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{m.business_name}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {m.is_verified ? 'Verified Partner' : 'Unverified'}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>{m.category} ({m.city || 'Adilabad'})</td>
                    <td style={{ padding: '10px' }}>
                      <div>{m.profiles?.full_name || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: '#555' }}>{m.profiles?.phone || m.profiles?.email}</div>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      <span style={{ color: m.status === 'active' ? '#28a745' : m.status === 'pending' ? '#e67e22' : '#dc3545' }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                      {m.status !== 'active' && (
                        <button
                          onClick={() => handleMerchantStatusChange(m.id, 'active', true)}
                          style={{ padding: '6px 10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                      )}
                      {m.status !== 'suspended' && (
                        <button
                          onClick={() => handleMerchantStatusChange(m.id, 'suspended', false)}
                          style={{ padding: '6px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* TAB 2: ALL LIVE ORDERS MONITOR */
        <div>
          {/* Summary KPI Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Platform Orders</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{orders.length}</div>
            </div>
            <div style={{ padding: '16px', background: '#fff8e6', border: '1px solid #ffe58f', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#856404' }}>Live In-Progress Orders</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d48806' }}>{activeOrdersCount}</div>
            </div>
            <div style={{ padding: '16px', background: '#e6f7ed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#155724' }}>Completed Order Volume</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>₹{completedRevenue.toFixed(2)}</div>
            </div>
          </div>

          {/* Order Status Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'pending', 'accepted', 'out_for_delivery', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    background: orderFilter === st ? '#111827' : '#f8f9fa',
                    color: orderFilter === st ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textTransform: 'capitalize'
                  }}
                >
                  {st.replace(/_/g, ' ')} ({st === 'all' ? orders.length : orders.filter((o) => o.status === st).length})
                </button>
              ))}
            </div>
            <button onClick={() => loadAllOrders()} style={{ padding: '8px 14px', cursor: 'pointer' }}>
              Refresh Orders
            </button>
          </div>

          {loadingOrders ? (
            <p>Loading live orders across all stores...</p>
          ) : filteredOrders.length === 0 ? (
            <p>No orders found in "{orderFilter.replace(/_/g, ' ')}" status.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredOrders.map((order) => (
                <div key={order.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0066ff' }}>
                        {order.merchants?.business_name || 'Unknown Store'}
                      </span>{' '}
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        • Order #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <strong style={{ fontSize: '16px', marginRight: '12px' }}>₹{order.total_amount}</strong>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          background:
                            order.status === 'completed'
                              ? '#d4edda'
                              : order.status === 'cancelled'
                              ? '#f8d7da'
                              : '#fff3cd',
                          color:
                            order.status === 'completed'
                              ? '#155724'
                              : order.status === 'cancelled'
                              ? '#721c24'
                              : '#856404'
                        }}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Customer:</strong> {order.customer_name} ({order.customer_phone}) | <strong>Address:</strong> {order.delivery_address}
                  </p>

                  <div style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', margin: '10px 0', fontSize: '13px' }}>
                    <strong>Items:</strong>{' '}
                    {(order.items || []).map((item, idx) => (
                      <span key={idx}>
                        {item.item_name} x {item.qty} (₹{item.price * item.qty}){idx < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Admin Override Controls */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>Admin Override:</span>
                    <button onClick={() => handleAdminOrderOverride(order.id, 'accepted')} style={{ padding: '5px 10px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Accept
                    </button>
                    <button onClick={() => handleAdminOrderOverride(order.id, 'out_for_delivery')} style={{ padding: '5px 10px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Out for Delivery
                    </button>
                    <button onClick={() => handleAdminOrderOverride(order.id, 'completed')} style={{ padding: '5px 10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Complete
                    </button>
                    <button onClick={() => handleAdminOrderOverride(order.id, 'cancelled')} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}