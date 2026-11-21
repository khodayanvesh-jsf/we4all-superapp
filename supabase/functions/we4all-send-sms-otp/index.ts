import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeIndianMobile(rawPhone: string): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

async function sendViaMsg91(mobile: string, otp: string) {
  const authKey = Deno.env.get('MSG91_AUTHKEY')?.trim();
  const templateId = Deno.env.get('MSG91_OTP_TEMPLATE_ID')?.trim();

  if (!authKey || !templateId) {
    return { ok: false, reason: 'MSG91 secrets not configured' };
  }

  const params = new URLSearchParams({
    template_id: templateId,
    mobile,
    otp,
    otp_length: String(otp.length || 6),
    realTimeResponse: '1',
  });

  try {
    const res = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ OTP: otp }),
      signal: AbortSignal.timeout(3000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && String(data?.type || '').toLowerCase() === 'success') {
      return { ok: true, provider: 'msg91' };
    }
    return { ok: false, reason: `MSG91 error (${res.status}): ${JSON.stringify(data)}` };
  } catch (err) {
    return { ok: false, reason: `MSG91 exception: ${(err as Error).message}` };
  }
}

async function sendViaWhatsAppFallback(mobile: string, otp: string) {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')?.trim();
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')?.trim();
  const templateName = Deno.env.get('WHATSAPP_OTP_TEMPLATE')?.trim() || 'we4all_otp_auth';
  const langCode = Deno.env.get('WHATSAPP_TEMPLATE_LANG')?.trim() || 'en';

  if (!phoneNumberId || !accessToken) {
    return { ok: false, reason: 'WhatsApp fallback secrets not configured' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: mobile,
        type: 'template',
        template: {
          name: templateName,
          language: { code: langCode },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(1500),
    });

    if (res.ok) return { ok: true, provider: 'whatsapp' };
    const errText = await res.text().catch(() => '');
    return { ok: false, reason: `WhatsApp error (${res.status}): ${errText}` };
  } catch (err) {
    return { ok: false, reason: `WhatsApp exception: ${(err as Error).message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: { http_code: 405, message: 'Method not allowed' } }, 405);
  }

  const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')?.trim();
  if (!rawSecret) {
    return jsonResponse({ error: { http_code: 500, message: 'SMS hook secret missing' } }, 500);
  }

  const rawBody = await req.text();
  const reqHeaders = Object.fromEntries(req.headers);

  let payload: { user?: { phone?: string }; sms?: { otp?: string } } | null = null;
  const secrets = rawSecret
    .split('|')
    .map((s) => s.replace(/^v1,whsec_/, '').trim())
    .filter(Boolean);

  for (const secret of secrets) {
    try {
      const wh = new Webhook(secret);
      payload = wh.verify(rawBody, reqHeaders) as { user?: { phone?: string }; sms?: { otp?: string } };
      break;
    } catch {
      // Check next key during secret rotation
    }
  }

  if (!payload) {
    return jsonResponse({ error: { http_code: 401, message: 'Invalid webhook signature' } }, 401);
  }

  const phone = normalizeIndianMobile(payload.user?.phone || '');
  const otp = String(payload.sms?.otp || '').trim();

  if (phone.length < 10 || !otp) {
    return jsonResponse({ error: { http_code: 400, message: 'Missing valid phone or OTP' } }, 400);
  }

  const smsResult = await sendViaMsg91(phone, otp);
  if (smsResult.ok) return jsonResponse({}, 200);

  const waResult = await sendViaWhatsAppFallback(phone, otp);
  if (waResult.ok) return jsonResponse({}, 200);

  console.error(`OTP delivery failed: SMS=[${smsResult.reason}] WA=[${waResult.reason}]`);
  return jsonResponse(
    { error: { http_code: 502, message: 'Unable to deliver OTP via SMS or WhatsApp.' } },
    502
  );
});