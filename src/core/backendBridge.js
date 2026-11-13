import { supabase } from '../supabaseClient';

export async function registerPortalUser({ email, password, fullName, phone, role, businessName, category }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        role: role,
        business_name: businessName || null,
        category: category || null
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function loginToPortal({ email, password, requiredRole }) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (authError) throw authError;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, phone')
    .eq('id', authData.user.id)
    .single();

  if (profileError) throw profileError;

  if (requiredRole && profile.role !== requiredRole && profile.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error(`Access denied. Registered as '${profile.role}', not '${requiredRole}'.`);
  }

  return { user: authData.user, profile };
}

export async function getMerchantDashboardData(userId) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*, merchant_catalog(*)')
    .eq('owner_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function addMerchantCatalogItem({ merchantId, itemName, price }) {
  const { data, error } = await supabase
    .from('merchant_catalog')
    .insert([{ merchant_id: merchantId, item_name: itemName, price: parseFloat(price) }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- ADMIN CONSOLE: MERCHANT APPROVAL HELPERS ---
export async function fetchAllMerchantsForAdmin() {
  const { data, error } = await supabase
    .from('merchants')
    .select('*, profiles:owner_id(full_name, email, phone), merchant_catalog(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateMerchantApprovalStatus({ merchantId, status, isVerified }) {
  const { data, error } = await supabase
    .from('merchants')
    .update({ status, is_verified: isVerified })
    .eq('id', merchantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- CUSTOMER PORTAL: ACTIVE MERCHANTS & CATALOG ---
export async function fetchActiveMerchantsWithCatalog() {
  const { data, error } = await supabase
    .from('merchants')
    .select('*, merchant_catalog(*)')
    .eq('status', 'active')
    .eq('is_verified', true)
    .order('business_name', { ascending: true });
  if (error) throw error;
  return data;
}


// --- ORDER PLACEMENT & MERCHANT ORDER MANAGEMENT ---
export async function placeCustomerOrder({
  merchantId,
  customerName,
  customerPhone,
  deliveryAddress,
  items,
  totalAmount,
  paymentMethod = 'UPI / Cash on Delivery'
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const customerId = sessionData?.session?.user?.id || null;

  const { data, error } = await supabase
    .from('merchant_orders')
    .insert([
      {
        merchant_id: merchantId,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        items: items,
        total_amount: parseFloat(totalAmount),
        payment_method: paymentMethod,
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchMerchantOrders(merchantId) {
  const { data, error } = await supabase
    .from('merchant_orders')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateMerchantOrderStatus({ orderId, status }) {
  const { data, error } = await supabase
    .from('merchant_orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- CUSTOMER PORTAL: LIVE ORDER STATUS TRACKING ---
export async function fetchCustomerOrders({ customerPhone, orderIds = [] }) {
  let query = supabase
    .from('merchant_orders')
    .select('*, merchants:merchant_id(business_name, category, city)')
    .order('created_at', { ascending: false });

  if (customerPhone && customerPhone.trim().length >= 10) {
    query = query.eq('customer_phone', customerPhone.trim());
  } else if (orderIds.length > 0) {
    query = query.in('id', orderIds);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export function subscribeToOrderStatusChanges(onOrderChange) {
  const channel = supabase
    .channel('customer-order-tracker')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'merchant_orders' },
      (payload) => {
        if (onOrderChange && payload.new) {
          onOrderChange(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- CUSTOMER AUTH: SESSION & PROFILE HELPERS ---
export async function getCurrentCustomerProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile: profile || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
      role: user.user_metadata?.role || 'customer'
    }
  };
}

export async function logoutPortalUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// --- DIRECT SQL 6-DIGIT OTP GENERATOR & VERIFIER (NO EMAIL TEMPLATE NEEDED) ---
export async function requestSqlPortalOtp(email) {
  const { data, error } = await supabase.rpc('generate_portal_otp', {
    target_email: email.trim()
  });
  if (error) throw error;
  return data; // Returns the 6-digit OTP string
}

export async function verifySqlPortalOtp({ email, otpCode }) {
  const { data, error } = await supabase.rpc('verify_portal_otp_code', {
    target_email: email.trim(),
    input_code: otpCode.trim()
  });
  if (error) throw error;
  if (!data) {
    throw new Error('Invalid 6-digit OTP code. Please check the code and try again.');
  }
  return true;
}