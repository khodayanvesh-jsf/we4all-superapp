import React, { useEffect, useState } from 'react';
import {
  registerPortalUser,
  loginToPortal,
  getCurrentCustomerProfile,
  logoutPortalUser,
  requestSqlPortalOtp,
  verifySqlPortalOtp
} from '../../core/backendBridge';

export default function CustomerAuth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify_otp'
  const [sessionProfile, setSessionProfile] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
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

  const completeCustomerLogin = async () => {
    const { profile } = await loginToPortal({
      email: form.email.trim(),
      password: form.password,
      requiredRole: 'customer'
    });
    setSessionProfile(profile);
    syncLocalCustomerData(profile);
    if (onAuthSuccess) onAuthSuccess(profile);
  };

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
        const code = await requestSqlPortalOtp(form.email);
        setGeneratedOtp(code);
        setMode('verify_otp');
        setStatusMsg({ text: 'Enter the 6-digit OTP code below to verify your Customer account.', type: 'info' });
        setSubmitting(false);
        return;
      }
      await completeCustomerLogin();
    } catch (err) {
      setStatusMsg({ text: err.message || 'Authentication failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await verifySqlPortalOtp({ email: form.email, otpCode });
      await completeCustomerLogin();
    } catch (err) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutPortalUser();
    setSessionProfile(null);
  };

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>Checking session...</div>;

  if (sessionProfile) {
    return (
      <div style={{ padding: '24px', maxWidth: '460px', margin: '30px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
        <h2 style={{ marginTop: 0, color: '#0066ff' }}>WE4ALL Customer Profile</h2>
        <p><strong>Name:</strong> {sessionProfile.full_name || 'Customer'}</p>
        <p><strong>Email:</strong> {sessionProfile.email}</p>
        <p><strong>Mobile:</strong> {sessionProfile.phone || 'Not set'}</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => (onAuthSuccess ? onAuthSuccess(sessionProfile) : (window.location.hash = '#/customer'))} style={{ flex: 1, padding: '10px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Go to Marketplace →
          </button>
          <button onClick={handleLogout} style={{ padding: '10px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'verify_otp') {
    return (
      <div style={{ padding: '24px', maxWidth: '420px', margin: '30px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
        <h2 style={{ marginTop: 0, color: '#0066ff' }}>Verify 6-Digit Customer OTP</h2>
        <p style={{ fontSize: '13px', color: '#555' }}>Verify account for <strong>{form.email}</strong>:</p>

        {generatedOtp && (
          <div style={{ padding: '12px', background: '#e7f3ff', border: '1px dashed #0066ff', borderRadius: '6px', marginBottom: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#0056b3' }}>Your 6-Digit Verification OTP Code:</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '6px', color: '#0066ff', marginTop: '4px' }}>
              {generatedOtp}
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(generatedOtp)}
              style={{ marginTop: '6px', padding: '4px 10px', fontSize: '11px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Auto-Fill OTP
            </button>
          </div>
        )}

        {statusMsg.text && (
          <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', background: '#fff3cd', color: '#856404' }}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            placeholder="Enter 6-Digit OTP"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            maxLength={6}
            required
            style={{ padding: '12px', fontSize: '18px', letterSpacing: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid #0066ff' }}
          />
          <button type="submit" disabled={submitting} style={{ padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Verify OTP & Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '420px', margin: '30px auto', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
      <h2 style={{ marginTop: 0 }}>WE4ALL Customer {mode === 'login' ? 'Login' : 'Registration'}</h2>
      {statusMsg.text && (
        <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', background: statusMsg.type === 'error' ? '#ffeef0' : '#e7f3ff', color: statusMsg.type === 'error' ? '#d9534f' : '#0056b3' }}>
          {statusMsg.text}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'register' && (
          <>
            <input placeholder="Your Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required style={{ padding: '10px' }} />
            <input placeholder="10-Digit Mobile Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required style={{ padding: '10px' }} />
          </>
        )}
        <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={{ padding: '10px' }} />
        <input type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={{ padding: '10px' }} />
        <button type="submit" disabled={submitting} style={{ padding: '12px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Login as Customer' : 'Register & Get 6-Digit OTP'}
        </button>
      </form>
      <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStatusMsg({ text: '', type: '' }); }} style={{ marginTop: '14px', background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer', padding: 0, fontSize: '14px' }}>
        {mode === 'login' ? 'New to WE4ALL? Create a Customer Account' : 'Already have an account? Login here'}
      </button>
    </div>
  );
}