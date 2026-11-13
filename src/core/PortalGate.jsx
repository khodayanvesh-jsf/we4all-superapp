import React, { useState, useEffect } from 'react';
import App from '../App';
import MerchantPortal from '../portals/merchant/MerchantPortal';
import AdminMerchantApproval from '../portals/admin/AdminMerchantApproval';
import CustomerMarketplace from '../portals/customer/CustomerMarketplace';
import CustomerAuth from '../portals/customer/CustomerAuth';

export default function PortalGate() {
  const [currentUrl, setCurrentUrl] = useState(window.location.pathname + window.location.hash);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const syncUrl = () => setCurrentUrl(window.location.pathname + window.location.hash);
    window.addEventListener('popstate', syncUrl);
    window.addEventListener('hashchange', syncUrl);
    return () => {
      window.removeEventListener('popstate', syncUrl);
      window.removeEventListener('hashchange', syncUrl);
    };
  }, []);

  const switchPortal = (hashTarget) => {
    window.location.hash = hashTarget;
    setCurrentUrl(window.location.pathname + window.location.hash);
  };

  const portalMode = import.meta.env.VITE_APP_PORTAL;
  const isLockedMerchantApk = portalMode === 'merchant';
  const isLockedCustomerApk = portalMode === 'customer';

  const isCustomerAuth =
    window.location.pathname.startsWith('/customer-auth') ||
    window.location.hash.startsWith('#/customer-auth');

  const isCustomerPortal =
    !isCustomerAuth &&
    (window.location.pathname.startsWith('/customer') ||
      window.location.hash.startsWith('#/customer') ||
      isLockedCustomerApk);

  const isAdminMerchants =
    !isLockedCustomerApk &&
    !isLockedMerchantApk &&
    (window.location.pathname.startsWith('/admin-merchants') ||
      window.location.hash.startsWith('#/admin-merchants'));

  const isMerchantPortal =
    !isLockedCustomerApk &&
    (window.location.pathname.startsWith('/merchant') ||
      window.location.hash.startsWith('#/merchant') ||
      isLockedMerchantApk);

  const activeKey = isCustomerAuth
    ? 'customer-auth'
    : isCustomerPortal
    ? 'customer'
    : isAdminMerchants
    ? 'admin-merchants'
    : isMerchantPortal
    ? 'merchant'
    : 'main';

  let activeView = <App />;
  if (isLockedMerchantApk) {
    activeView = <MerchantPortal />;
  } else if (isLockedCustomerApk) {
    activeView = isCustomerAuth ? (
      <CustomerAuth onAuthSuccess={() => switchPortal('#/customer')} />
    ) : (
      <CustomerMarketplace />
    );
  } else if (isCustomerAuth) {
    activeView = <CustomerAuth onAuthSuccess={() => switchPortal('#/customer')} />;
  } else if (isCustomerPortal) {
    activeView = <CustomerMarketplace />;
  } else if (isAdminMerchants) {
    activeView = <AdminMerchantApproval />;
  } else if (isMerchantPortal) {
    activeView = <MerchantPortal />;
  }

  // Inside standalone Customer APK, show only Customer Marketplace & Customer Account tabs
  const navItems = isLockedCustomerApk
    ? [
        { key: 'customer', label: 'Marketplace', hash: '#/customer' },
        { key: 'customer-auth', label: 'My Account / OTP', hash: '#/customer-auth' }
      ]
    : [
        { key: 'main', label: 'Main App', hash: '#/' },
        { key: 'customer-auth', label: 'Customer Login', hash: '#/customer-auth' },
        { key: 'customer', label: 'Marketplace', hash: '#/customer' },
        { key: 'merchant', label: 'Merchant', hash: '#/merchant' },
        { key: 'admin-merchants', label: 'Admin Approvals', hash: '#/admin-merchants' }
      ];

  return (
    <>
      {activeView}

      {!isLockedMerchantApk && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(17, 24, 39, 0.92)',
            padding: minimized ? '6px 10px' : '8px 12px',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            backdropFilter: 'blur(6px)'
          }}
        >
          {minimized ? (
            <button
              onClick={() => setMinimized(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', padding: '2px 6px' }}
            >
              {isLockedCustomerApk ? '👤 Menu' : '⚡ Portals'}
            </button>
          ) : (
            <>
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => switchPortal(item.hash)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    background: activeKey === item.key ? '#0066ff' : 'transparent',
                    color: activeKey === item.key ? '#fff' : '#d1d5db'
                  }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => setMinimized(true)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#9ca3af',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                –
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}