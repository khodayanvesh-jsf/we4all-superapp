import React, { useState } from "react";
import { createIsolatedSupabaseClient, supabase } from "../supabaseClient";
import { confirmedLoginIdentifier, isStaffAccount, realAccountEmail } from "./workflows/accountIdentity";

const input = "w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white";
const button = "w-full rounded-xl bg-emerald-400 p-2.5 text-sm font-bold text-slate-950 disabled:opacity-50";
const pinPattern = /^\d{6}$/;
const codePattern = /^\d{6,10}$/;

export default function AccountRecovery({ mode, onBack }) {
  const [client] = useState(createIsolatedSupabaseClient);
  const [email, setEmail] = useState("");
  const [challengeEmail, setChallengeEmail] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = mode === "reset";

  async function requestCode() {
    const address = realAccountEmail(email);
    if (!address || !client) {
      setFeedback("Enter the verified email for your WE4ALL account.");
      return;
    }
    setBusy(true);
    try {
      const result = reset
        ? await client.auth.resetPasswordForEmail(address)
        : await client.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } });
      if (result.error && [429, 500, 502, 503, 504].includes(result.error.status)) {
        setFeedback("Email delivery is unavailable or rate limited. Wait a moment before trying again.");
        return;
      }
      setChallengeEmail(address);
      setCode("");
      setFeedback("If the address is eligible, check its inbox for your code.");
    } catch {
      setFeedback("Could not reach the account service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    if (!codePattern.test(code) || (reset && (!pinPattern.test(pin) || pin !== confirmation))) {
      setFeedback("Enter your email code and, for PIN reset, two matching six-digit PINs.");
      return;
    }
    setBusy(true);
    let hasSession = false;
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: challengeEmail, token: code, type: reset ? "recovery" : "email"
      });
      hasSession = Boolean(data?.session);
      if (error || !hasSession || isStaffAccount(data.user) || !confirmedLoginIdentifier(data.user)) {
        throw new Error("The code could not be verified. Request a new one or contact WE4ALL support.");
      }
      if (reset) {
        const result = await client.auth.updateUser({ password: pin });
        if (result.error) throw new Error("The PIN could not be changed. Request a new code and try again.");
        const logout = await client.auth.signOut({ scope: "global" });
        if (logout.error) throw new Error("Your PIN changed. Contact support if other devices remain signed in.");
        hasSession = false;
        setFeedback("PIN changed. Return to sign-in to use your new PIN.");
      } else {
        setIdentifier(confirmedLoginIdentifier(data.user));
        setFeedback("Email verified.");
      }
      setDone(true);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      if (hasSession) await client.auth.signOut({ scope: "local" });
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3" aria-label={reset ? "Reset your PIN" : "Find your login"}>
      <h3 className="font-black text-emerald-300">{reset ? "Reset your PIN" : "Find your login"}</h3>
      {!done && <form className="space-y-2" onSubmit={challengeEmail ? verify : (event) => { event.preventDefault(); void requestCode(); }}>
        <label className="block text-xs">Verified recovery email
          <input className={input} type="email" autoComplete="email" value={email} disabled={busy || !!challengeEmail} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {challengeEmail && <>
          <label className="block text-xs">Email verification code
            <input className={input} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required />
          </label>
          {reset && <>
            <label className="block text-xs">New PIN
              <input className={input} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} required />
            </label>
            <label className="block text-xs">Confirm new PIN
              <input className={input} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, ""))} required />
            </label>
          </>}
        </>}
        <button className={button} disabled={busy} type="submit">{busy ? "Working…" : challengeEmail ? "Verify code" : "Send email code"}</button>
        {challengeEmail && <button type="button" disabled={busy} onClick={requestCode} className="text-xs text-emerald-300 underline">Resend code</button>}
      </form>}
      {feedback && <p role="status" className="text-xs text-slate-200">{feedback}</p>}
      {identifier && <p className="break-all text-sm text-emerald-300">Your sign-in is <strong>{identifier}</strong>.</p>}
      <button type="button" disabled={busy} onClick={onBack} className="text-xs text-emerald-300 underline">Back to sign-in</button>
    </section>
  );
}

export function RecoveryEmailSettings() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState("");
  const [previousAddress, setPreviousAddress] = useState("");
  const [codeAddress, setCodeAddress] = useState("");
  const [token, setToken] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const address = realAccountEmail(email);
    if (!address || !supabase) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || isStaffAccount(data.user)) throw new Error("Use the Founder console for administrator credentials.");
      if (!pending && data.user.email && !realAccountEmail(data.user.email)) {
        throw new Error("This private trial account has a placeholder email. Use backup codes or ask the Founder to help attach a real address.");
      }
      const result = pending
        ? await supabase.auth.verifyOtp({ email: codeAddress, token, type: "email_change" })
        : await supabase.auth.updateUser({ email: address });
      if (result.error) throw result.error;
      if (pending) {
        const confirmed = await supabase.auth.getUser();
        if (confirmed.error) throw confirmed.error;
        if (confirmed.data.user?.email === pending && confirmed.data.user?.email_confirmed_at) {
          setFeedback("Recovery email verified.");
          setPending("");
          setPreviousAddress("");
          setCodeAddress("");
        } else if (previousAddress) {
          setCodeAddress(codeAddress === pending ? previousAddress : pending);
          setFeedback("Enter the confirmation code sent to the other address.");
        } else {
          setFeedback("Email confirmation is still pending. Contact WE4ALL support if another code does not arrive.");
        }
        setToken("");
      } else {
        setPending(address);
        setPreviousAddress(realAccountEmail(data.user.email));
        setCodeAddress(address);
        setFeedback("Check the new address for its confirmation code. An existing address may also need confirmation.");
      }
    } catch (error) {
      setFeedback(error.message || "Could not verify recovery email.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="space-y-2" onSubmit={submit}>
      <label className="block text-xs">Add or change your verified recovery email
        <input className={input} type="email" autoComplete="email" value={email} disabled={busy || !!pending} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      {pending && previousAddress && previousAddress !== pending && <label className="block text-xs">Address receiving this code
        <select className={input} value={codeAddress} onChange={(event) => { setCodeAddress(event.target.value); setToken(""); }} disabled={busy}>
          <option value={pending}>{pending}</option>
          <option value={previousAddress}>{previousAddress}</option>
        </select>
      </label>}
      {pending && <label className="block text-xs">Email confirmation code
        <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} required />
      </label>}
      <button className={button} type="submit" disabled={busy}>{pending ? "Confirm email" : "Send confirmation code"}</button>
      {pending && <button type="button" className="text-xs underline" disabled={busy} onClick={() => { setPending(""); setToken(""); setFeedback(""); }}>Change address</button>}
      {feedback && <p role="status" className="text-xs">{feedback}</p>}
    </form>
  );
}

export function BackupCodeForm({ enrollment = false, onBack }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState([]);
  const [identifier, setIdentifier] = useState("");
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!supabase || !pinPattern.test(pin) || (!enrollment && pin !== confirm)) {
      setFeedback("Enter a six-digit PIN. Both entries must match when setting a new PIN.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const { data, error } = await supabase.functions.invoke("we4all-account-recovery", {
        body: enrollment ? { action: "rotate", pin } : { action: "reset", code, pin }
      });
      if (error) {
        const body = await error.context?.clone?.().json().catch(() => null);
        throw new Error(body?.error || "Recovery service is unavailable.");
      }
      if (enrollment && data?.codes?.length === 4) {
        setIssued(data.codes);
        setFeedback("Save these codes somewhere private. Each can be used once. Previous codes have been replaced.");
      } else if (!enrollment && data?.ok === true) {
        setDone(true);
        setIdentifier(typeof data.identifier === "string" ? data.identifier : "");
        setFeedback(data.sessions_revoked ? "PIN changed. Return to sign-in." : "PIN changed. Contact support if other devices remain signed in.");
      } else {
        throw new Error("Recovery service returned an unexpected result.");
      }
      setPin("");
      setConfirm("");
      setCode("");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2" aria-label={enrollment ? "Backup codes" : "Reset with a backup code"}>
      {!done && <form className="space-y-2" onSubmit={submit}>
        {!enrollment && <label className="block text-xs">Saved backup code
          <input className={input} value={code} onChange={(event) => setCode(event.target.value)} type="password" maxLength={40} autoComplete="off" required />
        </label>}
        <label className="block text-xs">{enrollment ? "Current PIN" : "New PIN"}
          <input className={input} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} type="password" inputMode="numeric" maxLength={6} autoComplete={enrollment ? "current-password" : "new-password"} required />
        </label>
        {!enrollment && <label className="block text-xs">Confirm new PIN
          <input className={input} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, ""))} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" required />
        </label>}
        <button className={button} type="submit" disabled={busy}>{enrollment ? "Generate and replace backup codes" : "Reset PIN with backup code"}</button>
      </form>}
      {feedback && <p role="status" className="text-xs text-slate-200">{feedback}</p>}
      {identifier && <p className="break-all text-sm text-emerald-300">Your sign-in is <strong>{identifier}</strong>.</p>}
      {issued.length > 0 && <div className="space-y-2">
        <ul className="break-all font-mono text-xs">{issued.map(item => <li key={item}>{item.match(/.{4}/g).join("-")}</li>)}</ul>
        <button type="button" className="text-xs underline" onClick={() => setIssued([])}>Hide saved codes</button>
      </div>}
      {onBack && <button type="button" disabled={busy} className="text-xs underline" onClick={onBack}>Back to sign-in</button>}
    </section>
  );
}
