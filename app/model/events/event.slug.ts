/** Invite-slug helpers. The slug is the public, shareable id in `/i/[slug]`. */

/** Lowercase, ASCII, hyphen-separated slug fragment from arbitrary text. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 40)
    .replace(/-+$/g, ''); // re-trim after slicing
}

/** 6-char lowercase alphanumeric suffix, kept collision-resistant but readable. */
export function randomSuffix(rand: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return out;
}

/**
 * Build an invite slug from the child's name plus a random suffix, e.g.
 * "maya" → "maya-3f9x2a". Falls back to "party" when the name has no usable
 * characters. Uniqueness is still enforced against the collection at write time.
 */
export function generateInviteSlug(
  childName: string,
  rand: () => number = Math.random,
): string {
  const base = slugify(childName) || 'party';
  return `${base}-${randomSuffix(rand)}`;
}
