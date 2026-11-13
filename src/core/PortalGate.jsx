import React, { useState, useEffect } from 'react';
import App from '../App';
import MerchantPortal from '../portals/merchant/MerchantPortal';
import AdminMerchantApproval from '../portals/admin/AdminMerchantApproval';
import CustomerMarketplace from '../portals/customer/CustomerMarketplace';

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

  const isLockedMerchantApk = import.meta.env.VITE_APP_PORTAL === 'merchant';

  const isCustomerPortal =
    window.location.pathname.startsWith('/customer') ||
    window.location.hash.startsWith('#/customer');

  const isAdminMerchants =
    window.location.pathname.startsWith('/admin-merchants') ||
    window.location.hash.startsWith('#/admin-merchants');

  const isMerchantPortal =
    window.location.pathname.startsWith('/merchant') ||
    window.location.hash.startsWith('#/merchant') ||
    isLockedMerchantApk;

  const activeKey = isCustomerPortal
    ? 'customer'
    : isAdminMerchants
    ? 'admin-merchants'
    : isMerchantPortal
    ? 'merchant'
    : 'main';

  let activeView = <App />;
  if (isCustomerPortal) {
    activeView = <CustomerMarketplace />;
  } else if (isAdminMerchants) {
    activeView = <AdminMerchantApproval />;
  } else if (isMerchantPortal) {
    activeView = <MerchantPortal />;
  }

  return (
    <>
      {activeView}

      {/* Floating Portal Switcher (Hidden inside standalone locked Merchant APK) */}
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
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: '2px 6px'
              }}
              title="Expand Portal Switcher"
            >
              ⚡ Portals
            </button>
          ) : (
            <>
              {[
                { key: 'main', label: 'Main App', hash: '#/' },
                { key: 'customer', label: 'Customer', hash: '#/customer' },
                { key: 'merchant', label: 'Merchant', hash: '#/merchant' },
                { key: 'admin-merchants', label: 'Admin Approvals', hash: '#/admin-merchants' }
              ].map((item) => (
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
                    color: activeKey === item.key ? '#fff' : '#d1d5db',
                    transition: 'all 0.2s'
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
                  marginLeft: '4px',
                  lineHeight: '20px'
                }}
                title="Minimize Switcher"
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