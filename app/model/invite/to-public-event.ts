import type { WrappitEvent } from '@/app/model/events/event.types';
import type { PublicEvent } from '@/app/model/invite/invite.types';

/**
 * Map a raw `events` row to the guest-safe `PublicEvent`. This is the single
 * place the public field whitelist lives — anything not copied here (`_id`,
 * `_owner`, `_createdDate`, `status`, …) never reaches a guest's browser.
 */
export function toPublicEvent(row: WrappitEvent): PublicEvent {
  return {
    childName: row.childName,
    partyDate: row.partyDate,
    location: row.location,
    inviteSlug: row.inviteSlug,
    paymentLinks: Array.isArray(row.paymentLinks) ? row.paymentLinks : [],
    ...(row.gender ? { gender: row.gender } : {}),
    ...(row.partyTime ? { partyTime: row.partyTime } : {}),
    ...(row.description ? { description: row.description } : {}),
    ...(row.giftDisplay ? { giftDisplay: row.giftDisplay } : {}),
    ...(row.charity ? { charity: row.charity } : {}),
  };
}
