import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { PartnerOnboardingTracker } from './PartnerOnboardingTracker';

const ROLE_TITLES = {
  merchant: 'Merchant Partner Portal',
  rider: 'Delivery Captain Portal',
  service_provider: 'Home Service Provider Portal',
  decorator: 'Event Decorator & Hall Portal',
  labour: 'Labour & Mistri Portal',
};

export function PendingPartnerGate({
  portalRole = 'merchant',
  partnerName = 'WE4ALL Partner',
  initialStatus = null,
  supportPhone = '919999999999',
  children = null,
}) {
  const [roleStatus, setRoleStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(!initialStatus);

  const checkLiveStatus = useCallback(async () => {
    setChecking(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      setChecking(false);
      return;
    }

    const { data } = await supabase
      .from('we4all_user_roles')
      .select('status')
      .eq('user_id', userId)
      .eq('role', portalRole)
      .maybeSingle();

    if (data?.status) {
      setRoleStatus(data.status);
    }
    setChecking(false);
  }, [portalRole]);

  useEffect(() => {
    checkLiveStatus();
  }, [checkLiveStatus]);

  const normalized = String(roleStatus || '').toLowerCase().trim();
  const isPending =
    normalized === 'pending' ||
    normalized === 'pending_admin_approval' ||
    normalized === 'draft' ||
    normalized === 'kyc_pending';

  if (checking && !children) {
    return <div className="max-w-md mx-auto h-44 rounded-2xl we4-shimmer" />;
  }

  if (isPending) {
    return (
      <div className="py-3">
        <PartnerOnboardingTracker
          partnerName={partnerName}
          roleLabel={ROLE_TITLES[portalRole] || portalRole}
          status={roleStatus}
          supportPhone={supportPhone}
          onRefreshStatus={checkLiveStatus}
        />
      </div>
    );
  }

  return children;
}