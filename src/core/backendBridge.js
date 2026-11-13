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
