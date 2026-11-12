import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AdminSecurityGate({ onAuthorized, onBackToApp }) {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Checking the signed-in account and administrator security level…");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [enrollment, setEnrollment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [signInForm, setSignInForm] = useState({ username: "", password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const authorize = async () => {
    if (!supabase) throw new Error("Supabase is not configured for administrator sign-in.");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session?.user?.id) {
      setStatus("sign-in");
      setMessage("Sign in with your Founder username and password. First sign-in will require an authenticator and a password reset.");
      return;
    }

    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance?.currentLevel !== "aal2") {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const verifiedTotp = (factors?.all || []).find((factor) => factor.factor_type === "totp" && factor.status === "verified");
      if (verifiedTotp) {
        const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedTotp.id });
        if (challenge.error) throw challenge.error;
        setFactorId(verifiedTotp.id);
        setChallengeId(challenge.data.id);
        setStatus("challenge");
        setMessage("Enter the current code from your authenticator app to complete the second factor.");
      } else {
        setStatus("enroll");
        setMessage("Administrator access requires an authenticator app. Enroll a TOTP factor, then verify its first code.");
      }
      return;
    }

    const { data, error } = await supabase.functions.invoke("we4all-admin-review", { body: { action: "whoami" } });
    if (error) throw error;
    if (data?.ok !== true) throw new Error(data?.error || "This account is not authorized for WE4ALL administration.");
    if (data.must_change_password === true) {
      setStatus("change-password");
      setMessage("Set a new administrator password to finish the one-time Founder setup.");
      return;
    }
    if (data.role === "city_manager") {
      onAuthorized?.({ role: data.role, zoneId: data.zone_id, userId: data.user_id });
      return;
    }
    if (data.role !== "founder") throw new Error("The server returned an unsupported administrator role.");
    onAuthorized?.({ role: data.role, zoneId: null, userId: data.user_id });
  };

  const signInFounder = async (event) => {
    event?.preventDefault?.();
    if (!supabase || !signInForm.username.trim() || !signInForm.password) return;
    setBusy(true);
    setMessage("Verifying Founder sign-in with Supabase…");
    try {
      const { data, error } = await supabase.functions.invoke("we4all-founder-auth", {
        body: { action: "login", username: signInForm.username.trim(), password: signInForm.password }
      });
      if (error) {
        let serverMessage = "";
        try {
          const response = error.context;
          const payload = response && typeof response.json === "function" ? await response.json() : null;
          serverMessage = typeof payload?.error === "string" ? payload.error : "";
        } catch { /* Keep Supabase's safe fallback message when no JSON error body exists. */ }
        throw new Error(serverMessage || error.message || "Founder sign-in failed.");
      }
      if (error || data?.ok !== true || !data.session?.access_token || !data.session?.refresh_token) {
        throw new Error(data?.error || error?.message || "Founder sign-in failed.");
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      if (sessionError) throw sessionError;
      setSignInForm({ username: "", password: "" });
      setStatus("checking");
      setMessage("Founder identity verified. Checking authenticator setup…");
      await authorize();
    } catch (error) {
      setMessage(error?.message || "Founder sign-in failed. Check the username and password.");
    } finally {
      setBusy(false);
    }
  };

  const completeInitialPasswordChange = async (event) => {
    event?.preventDefault?.();
    if (!supabase) return;
    if (newPassword.length < 12) { setMessage("Use at least 12 characters for the new administrator password."); return; }
    if (newPassword !== confirmNewPassword) { setMessage("The new password entries do not match."); return; }
    setBusy(true);
    setMessage("Updating your administrator password…");
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      const { data, error } = await supabase.functions.invoke("we4all-admin-review", {
        body: { action: "complete_bootstrap_password_change" }
      });
      if (error || data?.ok !== true) throw new Error(data?.error || error?.message || "Could not finish Founder setup.");
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      setNewPassword("");
      setConfirmNewPassword("");
      setStatus("checking");
      setMessage("Password changed. Opening Founder Console…");
      await authorize();
    } catch (error) {
      setMessage(error?.message || "Could not change the initial password.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    authorize().catch((error) => {
      if (!active) return;
      setStatus("error");
      setMessage(error?.message || "Could not verify administrator access.");
    });
    return () => { active = false; };
  }, []);

  const beginEnrollment = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "WE4ALL administrator"
      });
      if (error) throw error;
      setEnrollment(data);
      setFactorId(data.id);
      const challenge = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (challenge.error) throw challenge.error;
      setChallengeId(challenge.data.id);
      setStatus("enroll-verify");
      setMessage("Scan the QR code with an authenticator app and enter its current six-digit code.");
    } catch (error) {
      setMessage(error?.message || "Could not begin authenticator enrollment.");
    } finally {
      setBusy(false);
    }
  };

  const verifyFactor = async () => {
    if (!supabase || !factorId || !challengeId || !/^\d{6}$/.test(verificationCode)) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: verificationCode });
      if (error) throw error;
      setEnrollment(null);
      setVerificationCode("");
      setStatus("checking");
      setMessage("Second factor verified. Checking administrator permission…");
      await authorize();
    } catch (error) {
      setMessage(error?.message || "The authenticator code could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto mt-12 bg-slate-900 border border-amber-400/50 rounded-3xl p-6 space-y-4 text-white">
      <div className="flex justify-between items-center gap-3">
        <h2 className="font-black text-amber-400 text-base">WE4ALL Administrator Security</h2>
        <button type="button" onClick={onBackToApp} className="bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-black">Back to App</button>
      </div>
      <p className="text-xs text-slate-300" role="status">{message}</p>
      {status === "sign-in" && (
        <form onSubmit={signInFounder} className="space-y-2">
          <input autoComplete="username" value={signInForm.username} onChange={(event) => setSignInForm({ ...signInForm, username: event.target.value })} placeholder="Founder username or Geo Manager email" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
          <input type="password" autoComplete="current-password" value={signInForm.password} onChange={(event) => setSignInForm({ ...signInForm, password: event.target.value })} placeholder="Founder password or one-time recovery code" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
          <button type="submit" disabled={busy || !signInForm.username.trim() || !signInForm.password} className="w-full rounded-xl bg-amber-400 py-2.5 font-black text-slate-950 disabled:opacity-50">{busy ? "Signing in…" : "Sign in to Founder Console"}</button>
        </form>
      )}
      {status === "change-password" && (
        <form onSubmit={completeInitialPasswordChange} className="space-y-2">
          <p className="text-[11px] text-amber-100">Your initial password must be replaced before Founder tools become available.</p>
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (12+ characters)" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
          <input type="password" autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} placeholder="Confirm new password" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
          <button type="submit" disabled={busy || newPassword.length < 12 || newPassword !== confirmNewPassword} className="w-full rounded-xl bg-emerald-500 py-2.5 font-black text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Change password and continue"}</button>
        </form>
      )}
      {status === "enroll" && <button type="button" disabled={busy} onClick={beginEnrollment} className="w-full bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl">{busy ? "Starting…" : "Set Up Authenticator"}</button>}
      {enrollment?.totp?.qr_code && (
        <div className="space-y-2 rounded-xl bg-white p-3 text-slate-900">
          <img src={enrollment.totp.qr_code} alt="QR code to enroll an administrator authenticator" className="mx-auto h-44 w-44" />
          <p className="break-all text-[10px]">Manual setup key: {enrollment.totp.secret}</p>
        </div>
      )}
      {(status === "challenge" || status === "enroll-verify") && (
        <div className="space-y-2">
          <input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-center font-mono tracking-widest" placeholder="6-digit code" />
          <button type="button" disabled={busy || verificationCode.length !== 6} onClick={verifyFactor} className="w-full bg-emerald-500 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl">{busy ? "Verifying…" : "Verify & Continue"}</button>
        </div>
      )}
      {status === "error" && <button type="button" onClick={() => { setStatus("checking"); authorize().catch((error) => { setStatus("error"); setMessage(error?.message || "Could not verify administrator access."); }); }} className="w-full bg-slate-700 text-white font-black py-2.5 rounded-xl">Check Access Again</button>}
    </section>
  );
}
