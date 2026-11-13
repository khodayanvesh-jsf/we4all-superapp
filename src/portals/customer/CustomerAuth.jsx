import React, { useEffect, useState } from 'react';
import {
  registerPortalUser,
  loginToPortal,
  getCurrentCustomerProfile,
  logoutPortalUser
} from '../../core/backendBridge';

export default function CustomerAuth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [sessionProfile, setSessionProfile] = useState(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const syncLocalCustomerData = (profileObj) => {
    if (!profileObj) return;
    if (profileObj.full_name) localStorage.setItem('we4all_cust_name', profileObj.full_name);
    if (profileObj.phone) localStorage.setItem('we4all_cust_phone', profileObj.phone);
  };

  useEffect(() => {
    (async () => {
      try {
        const current = await getCurrentCustomerProfile();
        if (current?.profile) {
          setSessionProfile(current.profile);
          syncLocalCustomerData(current.profile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg({ text: 'Processing...', type: 'info' });

    try {
      if (mode === 'register') {
        await registerPortalUser({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          role: 'customer'
        });
      }

      const { profile } = await loginToPortal({
        email: form.email.trim(),
        password: form.password,
        requiredRole: 'customer'
      });

      setSessionProfile(profile);
      syncLocalCustomerData(profile);
      setStatusMsg({ text: 'Success! Redirecting to marketplace...', type: 'success' });

      if (onAuthSuccess) {
        onAuthSuccess(profile);
      }
    } catch (err) {
      setStatusMsg({
        text: err.message || 'Authentication failed. Please check your credentials.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutPortalUser();
    setSessionProfile(null);
    setStatusMsg({ text: 'Logged out of Customer Portal.', type: 'info' });
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>Checking customer session...</div>;
  }

  if (sessionProfile) {
    return (
      <div style={{ padding: '24px', maxWidth: '460px', margin: '30px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
        <h2 style={{ marginTop: 0, color: '#0066ff' }}>WE4ALL Customer Profile</h2>
        <p><strong>Name:</strong> {sessionProfile.full_name || 'Customer'}</p>
        <p><strong>Email:</strong> {sessionProfile.email}</p>
        <p><strong>Mobile:</strong> {sessionProfile.phone || 'Not set'}</p>
        <p>
          <strong>Role:</strong>{' '}
          <span style={{ padding: '3px 8px', background: '#e2f0d9', color: '#28a745', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>
            {sessionProfile.role}
          </span>
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={() => {
              if (onAuthSuccess) onAuthSuccess(sessionProfile);
              else window.location.hash = '#/customer';
            }}
            style={{ flex: 1, padding: '10px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Go to Marketplace →
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '10px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '30px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
      <h2 style={{ marginTop: 0 }}>WE4ALL Customer {mode === 'login' ? 'Login' : 'Registration'}</h2>
      <p style={{ fontSize: '13px', color: '#666', marginTop: '-6px', marginBottom: '16px' }}>
        {mode === 'login'
          ? 'Sign in to order from verified stores and track live deliveries.'
          : 'Create your customer account for one-click ordering and tracking.'}
      </p>

      {statusMsg.text && (
        <div
          style={{
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '14px',
            fontSize: '13px',
            background: statusMsg.type === 'error' ? '#ffeef0' : '#e7f3ff',
            color: statusMsg.type === 'error' ? '#d9534f' : '#0056b3'
          }}
        >
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'register' && (
          <>
            <input
              placeholder="Your Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input
              placeholder="10-Digit Mobile Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '12px',
            background: '#0066ff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {submitting ? 'Please wait...' : mode === 'login' ? 'Login as Customer' : 'Create Customer Account'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setStatusMsg({ text: '', type: '' });
        }}
        style={{
          marginTop: '14px',
          background: 'none',
          border: 'none',
          color: '#0066ff',
          cursor: 'pointer',
          padding: 0,
          fontSize: '14px'
        }}
      >
        {mode === 'login' ? 'New to WE4ALL? Create a Customer Account' : 'Already have an account? Login here'}
      </button>
    </div>
  );
}