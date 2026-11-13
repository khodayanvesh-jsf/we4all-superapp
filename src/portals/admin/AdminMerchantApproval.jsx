import React, { useEffect, useState } from 'react';
import { fetchAllMerchantsForAdmin, updateMerchantApprovalStatus } from '../../core/backendBridge';

export default function AdminMerchantApproval() {
  const [merchants, setMerchants] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'suspended'
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadMerchants = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchAllMerchantsForAdmin();
      setMerchants(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load merchants. Ensure your account has role = admin in profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  const handleStatusChange = async (merchantId, newStatus, verifyFlag) => {
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
      alert('Error updating status: ' + err.message);
    }
  };

  const filteredList = merchants.filter((m) => (filter === 'all' ? true : m.status === filter));

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>WE4ALL Admin — Merchant Approvals & Stores</h2>
        <button onClick={loadMerchants} style={{ padding: '8px 14px', cursor: 'pointer' }}>Refresh List</button>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#ffeef0', color: '#d9534f', borderRadius: '6px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'pending', 'active', 'suspended'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: filter === tab ? '#0066ff' : '#f8f9fa',
              color: filter === tab ? '#fff' : '#333',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab} ({tab === 'all' ? merchants.length : merchants.filter((m) => m.status === tab).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading merchant registrations...</p>
      ) : filteredList.length === 0 ? (
        <p>No merchants found in "{filter}" state.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
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
            {filteredList.map((m) => (
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
                  <span style={{
                    color: m.status === 'active' ? '#28a745' : m.status === 'pending' ? '#e67e22' : '#dc3545'
                  }}>
                    {m.status}
                  </span>
                </td>
                <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                  {m.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange(m.id, 'active', true)}
                      style={{ padding: '6px 10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                  )}
                  {m.status !== 'suspended' && (
                    <button
                      onClick={() => handleStatusChange(m.id, 'suspended', false)}
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
  );
}
