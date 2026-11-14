import { supabase } from '../supabaseClient';

// --- 1. AUTH & REGISTRATION (MERCHANT & CUSTOMER) ---
export async function registerPortalUser({
  email,
  password,
  fullName,
  phone,
  role = 'customer',
  businessName = '',
  category = 'grocery'
}) {
  const cleanEmail = email.trim();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role
      }
    }
  });

  if (signUpError) throw signUpError;

  const userId = signUpData?.user?.id;
  if (userId) {
    await supabase.from('profiles').upsert(
      [
        {
          id: userId,
          email: cleanEmail,
          full_name: fullName,
          phone,
          role
        }
      ],
      { onConflict: 'id' }
    );

    if (role === 'merchant' && businessName) {
      const { data: existingStore } = await supabase
        .from('merchants')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (!existingStore) {
        await supabase.from('merchants').insert([
          {
            owner_id: userId,
            business_name: businessName,
            category,
            status: 'pending',
            is_verified: false
          }
        ]);
      }
    }
  }

  return signUpData;
}

export async function loginToPortal({ email, password, requiredRole }) {
  const cleanEmail = email.trim();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  if (authError) throw authError;

  const user = authData.user;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const effectiveRole = profile?.role || user.user_metadata?.role || requiredRole || 'customer';

  if (requiredRole && effectiveRole !== requiredRole && effectiveRole !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Access denied: This account is registered as ' + effectiveRole + ', not ' + requiredRole + '.');
  }

  return {
    user,
    profile: profile || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
      role: effectiveRole
    }
  };
}

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

// --- 2. DIRECT SQL & EMAIL 6-DIGIT OTP HELPERS ---
export async function requestSqlPortalOtp(email) {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase.rpc('generate_portal_otp', {
      target_email: cleanEmail
    });
    if (!error && data) {
      localStorage.setItem('we4all_fallback_otp_' + cleanEmail, String(data));
      return String(data);
    }
  } catch (err) {
    console.warn('SQL OTP RPC fallback triggered:', err);
  }
  const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
  localStorage.setItem('we4all_fallback_otp_' + cleanEmail, fallbackCode);
  return fallbackCode;
}

export async function verifySqlPortalOtp({ email, otpCode }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = otpCode.trim();
  const localSaved = localStorage.getItem('we4all_fallback_otp_' + cleanEmail);

  try {
    const { data, error } = await supabase.rpc('verify_portal_otp_code', {
      target_email: cleanEmail,
      input_code: cleanCode
    });
    if (!error && data === true) return true;
  } catch (err) {
    console.warn('RPC verify fallback check:', err);
  }

  if (localSaved && localSaved === cleanCode) {
    return true;
  }
  throw new Error('Invalid 6-digit OTP code. Please check the code displayed on screen.');
}

export async function verifyPortalEmailOtp({ email, otpCode }) {
  return verifySqlPortalOtp({ email, otpCode });
}

export async function resendPortalEmailOtp(email) {
  return requestSqlPortalOtp(email);
}

export async function instantVerifyPortalUser(email) {
  try {
    await supabase.rpc('confirm_portal_user_email', { target_email: email.trim() });
  } catch (e) {
    console.warn(e);
  }
  return true;
}

// --- 3. MERCHANT PORTAL: DASHBOARD & CATALOG ---
export async function getMerchantDashboardData(userId) {
  const { data: existingStore, error } = await supabase
    .from('merchants')
    .select('*, merchant_catalog(*)')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (existingStore) return existingStore;

  const { data: createdStore, error: createError } = await supabase
    .from('merchants')
    .insert([
      {
        owner_id: userId,
        business_name: 'My WE4ALL Store',
        category: 'grocery',
        status: 'pending',
        is_verified: false
      }
    ])
    .select('*, merchant_catalog(*)')
    .single();

  if (createError) throw createError;
  return createdStore;
}

export async function addMerchantCatalogItem({ merchantId, itemName, price }) {
  const { data, error } = await supabase
    .from('merchant_catalog')
    .insert([
      {
        merchant_id: merchantId,
        item_name: itemName,
        price: parseFloat(price),
        in_stock: true
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- 4. ADMIN PORTAL: MERCHANT APPROVALS & GLOBAL ORDERS ---
export async function fetchAllMerchantsForAdmin() {
  const { data, error } = await supabase
    .from('merchants')
    .select('*, profiles:owner_id(full_name, email, phone)')
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

export async function fetchAllOrdersForAdmin() {
  const { data, error } = await supabase
    .from('merchant_orders')
    .select('*, merchants:merchant_id(business_name, category, city)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export function subscribeToAllOrdersAdmin(onOrdersEvent) {
  const channel = supabase
    .channel('admin-global-orders-monitor')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'merchant_orders' },
      (payload) => {
        if (onOrdersEvent) onOrdersEvent(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- 5. CUSTOMER PORTAL: MARKETPLACE, ORDERS & REALTIME TRACKING ---
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
        items,
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