/** Format a party date for prose. Mirrors the page's tolerance of string|Date. */
function formatPartyDate(value?: string | Date): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Build a friendly, ready-to-paste invite message an organizer can share. The
 * invite URL is passed in (not derived) so this stays pure and origin-agnostic —
 * the page supplies the same `${origin}/i/${slug}` used by the copy-link card.
 */
export function buildShareText(
  event: { childName: string; partyDate?: string | Date },
  inviteUrl: string,
): string {
  const name = event.childName?.trim() || 'our little one';
  const when = formatPartyDate(event.partyDate);
  const opener = when
    ? `You're invited to ${name}'s birthday on ${when}! 🎉`
    : `You're invited to ${name}'s birthday! 🎉`;
  return `${opener} Please RSVP and chip in for the group gift here: ${inviteUrl}`;
}
