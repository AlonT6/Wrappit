/** Domain types for birthday events stored in the Wix `events` CMS collection. */

/** Self-reported payment channels shown to guests (no funds are processed). */
export const PAYMENT_METHODS = ['venmo', 'zelle', 'paypal', 'cashapp', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** A single payment link the organizer shares for the group gift. */
export interface PaymentLink {
  type: PaymentMethod;
  label?: string;
  url: string;
}

/** Optional "here's the gift we're pooling for" showcase. */
export interface GiftDisplay {
  title?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
}

/** Optional charity the organizer points guests to instead of / alongside a gift. */
export interface Charity {
  name?: string;
  url?: string;
  why?: string;
}

export type EventStatus = 'draft' | 'published';

/** The organizer-supplied fields for creating/editing an event. */
export interface EventInput {
  childName: string;
  gender?: string;
  partyDate: string; // ISO date (yyyy-mm-dd)
  partyTime?: string;
  location: string;
  description?: string;
  paymentLinks: PaymentLink[];
  giftDisplay?: GiftDisplay;
  charity?: Charity;
  status: EventStatus;
}

/** An event as stored in Wix Data (input + system + generated fields). */
export interface WrappitEvent extends EventInput {
  _id: string;
  inviteSlug: string;
  _owner?: string;
  _createdDate?: string | Date;
  _updatedDate?: string | Date;
}
