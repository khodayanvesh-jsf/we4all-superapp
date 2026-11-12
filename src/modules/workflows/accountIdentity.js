const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function realAccountEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) && !email.endsWith(".invalid") ? email : "";
}

export function accountLoginIdentity(value) {
  const email = realAccountEmail(value);
  if (email) return { email };
  const text = String(value || "").trim();
  if (!/^[+\d() -]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? { phone: "+91" + digits } : null;
}

export function confirmedLoginIdentifier(user) {
  if (!user?.email_confirmed_at || !realAccountEmail(user.email)) return "";
  if (user.phone_confirmed_at && user.user_metadata?.trial_phone_verification !== true) {
    return accountLoginIdentity(user.phone)?.phone || user.email;
  }
  return user.email;
}

export function isStaffAccount(user) {
  return ["founder", "city_manager", "admin"].includes(user?.app_metadata?.we4all_role);
}
