/** Domain types for the public guest flow (invite view + RSVP + pledge). */

import type { Charity, GiftDisplay, PaymentLink } from '@/app/model/events/event.types';

/**
 * The guest-safe projection of an event. Deliberately omits `_id`, `_owner`, and
 * every internal/system field — guests reference an event only by its public
 * `inviteSlug`, and the server resolves that to an id when writing rows.
 */
export interface PublicEvent {
  childName: string;
  gender?: string;
  partyDate: string | Date; // Wix returns date columns as Date; the page formats both
  partyTime?: string;
  location: string;
  description?: string;
  inviteSlug: string;
  giftDisplay?: GiftDisplay;
  charity?: Charity;
  paymentLinks: PaymentLink[];
}

/** RSVP as submitted by a guest. `slug` is resolved to `eventId` server-side. */
export interface RsvpInput {
  slug: string;
  inviteeName: string;
  attending: boolean; // stored as `status`: 'yes' | 'no'
  parentName: string;
  parentName2?: string;
  parentEmail?: string;
  parentPhone?: string;
  dietary?: string;
}

/** Pledge as submitted by a guest. RSVP is optional, so `rsvpId` may be absent. */
export interface PledgeInput {
  slug: string;
  contributorName: string;
  amount: number;
  method?: string;
  note?: string;
  rsvpId?: string;
}

export type RsvpResult = { ok: true; rsvpId: string } | { ok: false; errors: string[] };
export type PledgeResult = { ok: true } | { ok: false; errors: string[] };
