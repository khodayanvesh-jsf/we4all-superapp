import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://bdmbziwazpuzbukazmug.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWJ6aXdhenB1emJ1a2F6bXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODg3ODIsImV4cCI6MjEwODk2NDc4Mn0.dZix8URsszdgGLaDz6fXVCNa__UIsVH8vhTo38spa1o').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;