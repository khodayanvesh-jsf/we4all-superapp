import React, { useEffect, useState } from 'react';
import { fetchActiveMerchantsWithCatalog } from '../../core/backendBridge';

export default function CustomerMarketplace() {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (selectedMerchant) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <button onClick={() => setSelectedMerchant(null)} style={{ marginBottom: '16px', padding: '6px 12px', cursor: 'pointer' }}>
          ← Back to All Stores
        </button>
        <h2>{selectedMerchant.business_name}</h2>
        <p>Category: <strong>{selectedMerchant.category}</strong> | City: {selectedMerchant.city || 'Adilabad'}</p>
        <hr style={{ margin: '16px 0' }} />
        <h3>Available Products & Services</h3>
        {(!selectedMerchant.merchant_catalog || selectedMerchant.merchant_catalog.length === 0) ? (
          <p>This merchant hasn't added any items to their catalog yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {selectedMerchant.merchant_catalog.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{item.item_name}</h4>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745', margin: '0 0 12px 0' }}>₹{item.price}</p>
                <button 
                  onClick={() => alert(`Added ${item.item_name} to cart!`)}
                  style={{ width: '100%', padding: '8px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}
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
        <p>No verified merchants are currently active. Check back soon or approve some from the Admin Console (`#/admin-merchants`).</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {merchants.map((m) => (
            <div 
              key={m.id} 
              onClick={() => setSelectedMerchant(m)}
              style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', background: '#fafafa', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
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