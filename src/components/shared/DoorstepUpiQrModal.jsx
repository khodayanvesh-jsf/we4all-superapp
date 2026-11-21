import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../supabaseClient';
import { BottomSheet } from '../ui/BottomSheet';
import { SwipeToConfirm } from '../ui/SwipeToConfirm';

const INR = '\u20B9';

export function buildNpciUpiUri({ vpa, payeeName, amountInr, orderRef, note }) {
  const cleanVpa = String(vpa || '').trim();
  const cleanName = String(payeeName || 'WE4ALL Merchant').trim().slice(0, 99);
  const params = [
    `pa=${encodeURIComponent(cleanVpa)}`,
    `pn=${encodeURIComponent(cleanName)}`,
  ];

  const numericAmount = Number(amountInr);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.push(`am=${numericAmount.toFixed(2)}`);
  }

  params.push('cu=INR');

  if (orderRef) {
    params.push(`tr=${encodeURIComponent(String(orderRef).slice(0, 35))}`);
  }
  if (note) {
    params.push(`tn=${encodeURIComponent(String(note).slice(0, 80))}`);
  }

  return `upi://pay?${params.join('&')}`;
}

export function DoorstepUpiQrModal({
  open,
  onClose,
  order,
  merchantVpa,
  merchantName = 'WE4ALL Partner Store',
  onSettled,
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const orderNo = order
    ? order.order_number || `WE4-${order.id.slice(0, 8).toUpperCase()}`
    : '';

  const upiUri = useMemo(() => {
    if (!order || !merchantVpa) return '';
    return buildNpciUpiUri({
      vpa: merchantVpa,
      payeeName: merchantName,
      amountInr: order.total_inr,
      orderRef: orderNo,
      note: `WE4ALL Order ${orderNo}`,
    });
  }, [order, merchantVpa, merchantName, orderNo]);

  useEffect(() => {
    let active = true;
    if (!open || !upiUri) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setError('Unable to generate QR code. Check merchant UPI ID.');
      });

    return () => {
      active = false;
    };
  }, [open, upiUri]);

  const handleConfirmPaid = async () => {
    if (!order) return;
    setSaving(true);
    setError('');

    const nowIso = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from('we4all_orders')
      .update({
        payment_method: 'upi',
        payment_status: 'paid',
        cod_collected_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', order.id)
      .select('id, status, payment_method, payment_status, cod_collected_at')
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      throw updateError;
    }

    onSettled?.(data);
    onClose?.();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Doorstep COD to UPI QR"
      subtitle={order ? `Order #${orderNo} - ${merchantName}` : ''}
    >
      {!merchantVpa ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Merchant UPI ID is missing. Ask WE4ALL Admin to update the verified UPI VPA.
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="inline-block rounded-2xl bg-white p-3 border border-slate-200 shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`UPI QR for order ${orderNo}`}
                className="h-56 w-56 mx-auto"
              />
            ) : (
              <div className="h-56 w-56 rounded-xl we4-shimmer" />
            )}
          </div>

          <div>
            <p className="text-2xl font-black text-emerald-700">
              {INR}
              {Number(order?.total_inr ?? 0).toFixed(2)}
            </p>
            <p className="text-xs opacity-70 mt-0.5">
              Scan with PhonePe, GPay, Paytm, or BHIM ({merchantVpa})
            </p>
          </div>

          <a
            href={upiUri}
            className="block w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            Open UPI App on This Phone
          </a>

          {error && (
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          )}

          <SwipeToConfirm
            disabled={saving}
            label="Swipe after UPI payment arrives"
            confirmedLabel="Marked UPI Paid"
            onConfirm={handleConfirmPaid}
          />
        </div>
      )}
    </BottomSheet>
  );
}