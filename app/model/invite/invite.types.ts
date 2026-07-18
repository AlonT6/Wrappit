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

/**
 * An RSVP row as stored in the `rsvps` collection. `eventId` (never the slug) is
 * the parent event's `_id`; `attending` is persisted as the `status` string.
 */
export interface Rsvp {
  _id: string;
  eventId: string;
  status: 'yes' | 'no';
  inviteeName: string;
  parentName: string;
  parentName2?: string;
  parentEmail?: string;
  parentPhone?: string;
  dietary?: string;
  _createdDate?: string | Date;
}

/** A pledge row as stored in the `pledges` collection. `rsvpId` links back to an RSVP if any. */
export interface Pledge {
  _id: string;
  eventId: string;
  contributorName: string;
  amount: number;
  method?: string;
  note?: string;
  rsvpId?: string;
  _createdDate?: string | Date;
}

/**
 * The organizer-facing rollup for one event, returned by GET /api/events/[id]/summary.
 * Totals/counts are computed server-side so the client renders trusted numbers.
 */
export interface EventSummary {
  rsvps: Rsvp[];
  pledges: Pledge[];
  pledgeTotal: number;
  attendingCount: number;
  notAttendingCount: number;
}
