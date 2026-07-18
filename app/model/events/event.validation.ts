import {
  PAYMENT_METHODS,
  type EventInput,
  type EventStatus,
  type PaymentLink,
  type PaymentMethod,
} from '@/app/model/events/event.types';

export type ValidationResult =
  | { ok: true; data: EventInput }
  | { ok: false; errors: string[] };

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** yyyy-mm-dd that is also a real calendar date. */
function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function normalizePaymentMethod(v: unknown): PaymentMethod {
  const s = str(v).toLowerCase();
  return (PAYMENT_METHODS as readonly string[]).includes(s) ? (s as PaymentMethod) : 'other';
}

/**
 * Validate and normalize an untrusted event payload (JSON body / form state)
 * into a clean EventInput. Drops blank optional fields and empty payment-link
 * rows; reports human-readable errors for anything required or malformed.
 */
export function validateEventInput(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const input = (raw ?? {}) as Record<string, unknown>;

  const childName = str(input.childName);
  if (!childName) errors.push('Child name is required.');

  const partyDate = str(input.partyDate);
  if (!partyDate) errors.push('Party date is required.');
  else if (!isIsoDate(partyDate)) errors.push('Party date must be a valid date (yyyy-mm-dd).');

  const location = str(input.location);
  if (!location) errors.push('Location is required.');

  // Payment links: keep only rows with a URL; every kept row must be a valid http(s) URL.
  const rawLinks = Array.isArray(input.paymentLinks) ? input.paymentLinks : [];
  const paymentLinks: PaymentLink[] = [];
  rawLinks.forEach((row, i) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const url = str(r.url);
    const label = str(r.label);
    if (!url && !label) return; // fully blank row — ignore
    if (!isHttpUrl(url)) {
      errors.push(`Payment link ${i + 1} must be a valid http(s) URL.`);
      return;
    }
    paymentLinks.push({
      type: normalizePaymentMethod(r.type),
      url,
      ...(label ? { label } : {}),
    });
  });

  const status: EventStatus = str(input.status) === 'published' ? 'published' : 'draft';

  // Optional nested objects — only included when they carry at least one value.
  const giftRaw = (input.giftDisplay ?? {}) as Record<string, unknown>;
  const giftDisplay = {
    ...(str(giftRaw.title) ? { title: str(giftRaw.title) } : {}),
    ...(str(giftRaw.description) ? { description: str(giftRaw.description) } : {}),
    ...(str(giftRaw.imageUrl) ? { imageUrl: str(giftRaw.imageUrl) } : {}),
    ...(str(giftRaw.link) ? { link: str(giftRaw.link) } : {}),
  };
  if (giftDisplay.link && !isHttpUrl(giftDisplay.link)) {
    errors.push('Gift link must be a valid http(s) URL.');
  }
  if (giftDisplay.imageUrl && !isHttpUrl(giftDisplay.imageUrl)) {
    errors.push('Gift image URL must be a valid http(s) URL.');
  }

  const charityRaw = (input.charity ?? {}) as Record<string, unknown>;
  const charity = {
    ...(str(charityRaw.name) ? { name: str(charityRaw.name) } : {}),
    ...(str(charityRaw.url) ? { url: str(charityRaw.url) } : {}),
    ...(str(charityRaw.why) ? { why: str(charityRaw.why) } : {}),
  };
  if (charity.url && !isHttpUrl(charity.url)) {
    errors.push('Charity URL must be a valid http(s) URL.');
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: EventInput = {
    childName,
    partyDate,
    location,
    paymentLinks,
    status,
    ...(str(input.gender) ? { gender: str(input.gender) } : {}),
    ...(str(input.partyTime) ? { partyTime: str(input.partyTime) } : {}),
    ...(str(input.description) ? { description: str(input.description) } : {}),
    ...(Object.keys(giftDisplay).length > 0 ? { giftDisplay } : {}),
    ...(Object.keys(charity).length > 0 ? { charity } : {}),
  };

  return { ok: true, data };
}
