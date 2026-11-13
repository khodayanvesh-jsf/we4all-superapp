import React, { useState, useEffect } from 'react';
import App from '../App';
import MerchantPortal from '../portals/merchant/MerchantPortal';
import AdminMerchantApproval from '../portals/admin/AdminMerchantApproval';

export default function PortalGate() {
  const [currentUrl, setCurrentUrl] = useState(window.location.pathname + window.location.hash);

  useEffect(() => {
    const syncUrl = () => setCurrentUrl(window.location.pathname + window.location.hash);
    window.addEventListener('popstate', syncUrl);
    window.addEventListener('hashchange', syncUrl);
    return () => {
      window.removeEventListener('popstate', syncUrl);
      window.removeEventListener('hashchange', syncUrl);
    };
  }, []);

  const isAdminMerchants =
    window.location.pathname.startsWith('/admin-merchants') ||
    window.location.hash.startsWith('#/admin-merchants');

  if (isAdminMerchants) {
    return <AdminMerchantApproval />;
  }

  const isMerchantPortal =
    window.location.pathname.startsWith('/merchant') ||
    window.location.hash.startsWith('#/merchant') ||
    import.meta.env.VITE_APP_PORTAL === 'merchant';

  if (isMerchantPortal) {
    return <MerchantPortal />;
  }

  return <App />;
}
