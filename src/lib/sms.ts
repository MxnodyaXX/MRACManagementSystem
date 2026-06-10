import { supabase, supabaseEnabled } from './supabase';

/** Normalize a Sri Lankan phone number to the 94XXXXXXXXX form the gateway expects.
 *  Returns null if it can't be made into a valid 11-digit 94 number. */
export function normalizeLkPhone(raw: string): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('94') && d.length === 11) return d;          // 947XXXXXXXX
  if (d.startsWith('0') && d.length === 10) return '94' + d.slice(1); // 07XXXXXXXX
  if (d.length === 9 && d.startsWith('7')) return '94' + d;     // 7XXXXXXXX
  return null;
}

/** Send one SMS via the `send-sms` Edge Function. Resolves false (never throws) on
 *  any failure so callers can fire-and-forget without breaking the main flow. */
export async function sendSms(to: string, message: string): Promise<boolean> {
  if (!supabaseEnabled) {
    console.warn('[sms] skipped — Supabase not configured');
    return false;
  }
  const phone = normalizeLkPhone(to);
  if (!phone) {
    console.warn('[sms] skipped — invalid phone:', to);
    return false;
  }
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', { body: { to: phone, message } });
    if (error) { console.error('[sms] invoke error:', error); return false; }
    const ok = !!(data as { ok?: boolean })?.ok;
    if (!ok) console.error('[sms] gateway rejected:', data);
    return ok;
  } catch (e) {
    console.error('[sms] failed:', e);
    return false;
  }
}

/** Message templates — keep under ~160 chars where possible to stay single-segment. */
export const smsTemplates = {
  bookingConfirmation: (name: string, vehicle: string, start: string, end: string, total: number) =>
    `Hi ${name}, your EMRAC booking for ${vehicle} (${start} to ${end}) is confirmed. Total Rs ${total.toLocaleString()}. Thank you!`,

  paymentReminder: (name: string, balance: number) =>
    `Hi ${name}, you have an outstanding balance of Rs ${balance.toLocaleString()} on your EMRAC rental. Please settle at your earliest convenience.`,

  returnReminder: (name: string, vehicle: string, end: string) =>
    `Hi ${name}, reminder: please return ${vehicle} by ${end}. Thank you - EMRAC.`,

  referralPayout: (ownerName: string, amount: number) =>
    `Hi ${ownerName}, you have Rs ${amount.toLocaleString()} in referral fees pending settlement on EMRAC. Please settle with the referrers.`,
};
