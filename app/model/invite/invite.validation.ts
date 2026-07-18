import type { PledgeInput, RsvpInput } from '@/app/model/invite/invite.types';

export type RsvpValidation =
  | { ok: true; data: RsvpInput }
  | { ok: false; errors: string[] };

export type PledgeValidation =
  | { ok: true; data: PledgeInput }
  | { ok: false; errors: string[] };

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Loose email shape check — good enough to catch typos without rejecting valid addresses. */
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Validate and normalize an untrusted RSVP payload into a clean RsvpInput.
 * `attending` accepts a boolean or the strings 'yes'/'no'. Optional contact
 * fields are dropped when blank.
 */
export function validateRsvpInput(raw: unknown): RsvpValidation {
  const errors: string[] = [];
  const input = (raw ?? {}) as Record<string, unknown>;

  const slug = str(input.slug);
  if (!slug) errors.push('Missing invite reference.');

  const inviteeName = str(input.inviteeName);
  if (!inviteeName) errors.push("The guest's name is required.");

  const parentName = str(input.parentName);
  if (!parentName) errors.push("A parent/guardian's name is required.");

  // attending: boolean or 'yes'/'no' string.
  let attending: boolean;
  if (typeof input.attending === 'boolean') attending = input.attending;
  else if (str(input.attending).toLowerCase() === 'yes') attending = true;
  else if (str(input.attending).toLowerCase() === 'no') attending = false;
  else {
    attending = false;
    errors.push('Please say whether the guest is attending.');
  }

  const parentEmail = str(input.parentEmail);
  if (parentEmail && !isEmail(parentEmail)) errors.push('Please enter a valid email address.');

  if (errors.length > 0) return { ok: false, errors };

  const data: RsvpInput = {
    slug,
    inviteeName,
    attending,
    parentName,
    ...(str(input.parentName2) ? { parentName2: str(input.parentName2) } : {}),
    ...(parentEmail ? { parentEmail } : {}),
    ...(str(input.parentPhone) ? { parentPhone: str(input.parentPhone) } : {}),
    ...(str(input.dietary) ? { dietary: str(input.dietary) } : {}),
  };
  return { ok: true, data };
}

/**
 * Validate and normalize an untrusted pledge payload into a clean PledgeInput.
 * `amount` must be a positive, finite number (accepts a numeric string).
 */
export function validatePledgeInput(raw: unknown): PledgeValidation {
  const errors: string[] = [];
  const input = (raw ?? {}) as Record<string, unknown>;

  const slug = str(input.slug);
  if (!slug) errors.push('Missing invite reference.');

  const contributorName = str(input.contributorName);
  if (!contributorName) errors.push('Your name is required.');

  const amount = typeof input.amount === 'number' ? input.amount : Number(str(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push('Pledge amount must be a positive number.');
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: PledgeInput = {
    slug,
    contributorName,
    amount,
    ...(str(input.method) ? { method: str(input.method) } : {}),
    ...(str(input.note) ? { note: str(input.note) } : {}),
    ...(str(input.rsvpId) ? { rsvpId: str(input.rsvpId) } : {}),
  };
  return { ok: true, data };
}
