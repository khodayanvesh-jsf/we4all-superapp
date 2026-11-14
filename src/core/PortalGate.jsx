import React, { useState, useEffect } from 'react';
import App from '../App';
import MerchantPortal from '../portals/merchant/MerchantPortal';
import AdminMerchantApproval from '../portals/admin/AdminMerchantApproval';
import CustomerMarketplace from '../portals/customer/CustomerMarketplace';
import CustomerAuth from '../portals/customer/CustomerAuth';
import { getCurrentCustomerProfile } from './backendBridge';
export default function PortalGate() {
  const [currentUrl, setCurrentUrl] = useState(window.location.pathname + window.location.hash);
  const [minimized, setMinimized] = useState(false);
  useEffect(() => {
    const syncUrl = () => setCurrentUrl(window.location.pathname + window.location.hash);
    window.addEventListener('popstate', syncUrl);
    window.addEventListener('hashchange', syncUrl);
    getCurrentCustomerProfile().then((res) => {
      const role = res?.profile?.role;
      if (!window.location.hash || window.location.hash === '#/') {
        if (role === 'merchant') window.location.hash = '#/merchant';
        else if (role === 'admin') window.location.hash = '#/admin-merchants';
      }
    }).catch(() => {});
    return () => { window.removeEventListener('popstate', syncUrl); window.removeEventListener('hashchange', syncUrl); };
  }, []);
  const switchPortal = (h) => { window.location.hash = h; setCurrentUrl(window.location.pathname + window.location.hash); };
  const hash = window.location.hash || '#/';
  let activeKey = 'main';
  let activeView = <App />;
  if (hash.startsWith('#/customer-auth')) { activeKey = 'customer-auth'; activeView = <CustomerAuth onAuthSuccess={(p) => switchPortal(p?.role === 'merchant' ? '#/merchant' : p?.role === 'admin' ? '#/admin-merchants' : '#/customer')} />; }
  else if (hash.startsWith('#/customer')) { activeKey = 'customer'; activeView = <CustomerMarketplace />; }
  else if (hash.startsWith('#/merchant')) { activeKey = 'merchant'; activeView = <MerchantPortal />; }
  else if (hash.startsWith('#/admin-merchants')) { activeKey = 'admin-merchants'; activeView = <AdminMerchantApproval />; }
  const navItems = [
    { key: 'main', label: 'Main App', hash: '#/' },
    { key: 'customer-auth', label: 'Customer Login', hash: '#/customer-auth' },
    { key: 'customer', label: 'Marketplace', hash: '#/customer' },
    { key: 'merchant', label: 'Merchant Login', hash: '#/merchant' },
    { key: 'admin-merchants', label: 'Admin Console', hash: '#/admin-merchants' }
  ];
  return (
    <>
      {activeView}
      <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 99999, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(17,24,39,0.92)', padding: minimized ? '6px 10px' : '8px 12px', borderRadius: '999px', boxShadow: '0 8px 24px rgba(0,0,0,0.28)', fontFamily: 'sans-serif', fontSize: '12px' }}>
        {minimized ? (
          <button onClick={() => setMinimized(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', padding: '2px 6px' }}>⚡ Portals</button>
        ) : (
          <>
            {navItems.map((item) => (
              <button key={item.key} onClick={() => switchPortal(item.hash)} style={{ padding: '6px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', background: activeKey === item.key ? '#0066ff' : 'transparent', color: activeKey === item.key ? '#fff' : '#d1d5db' }}>{item.label}</button>
            ))}
            <button onClick={() => setMinimized(true)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#9ca3af', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', marginLeft: '4px' }}>–</button>
          </>
        )}
      </div>
    </>
  );
}
