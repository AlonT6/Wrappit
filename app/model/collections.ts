/**
 * Wix Data collection IDs. Wix lowercases collection IDs at creation, so the
 * IDs are `events` / `rsvps` / `pledges` (display names are capitalized).
 * Reference collections through this map so an ID change is a one-line edit.
 */
export const COLLECTIONS = {
  events: "events",
  rsvps: "rsvps",
  pledges: "pledges",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
