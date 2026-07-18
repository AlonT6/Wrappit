import { describe, it, expect } from 'vitest';
import { slugify, randomSuffix, generateInviteSlug } from './event.slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Maya Cohen')).toBe('maya-cohen');
  });

  it('strips diacritics and punctuation', () => {
    expect(slugify("Renée's 8th Party!")).toBe('renee-s-8th-party');
  });

  it('trims leading/trailing hyphens and collapses runs', () => {
    expect(slugify('  --Hello   World-- ')).toBe('hello-world');
  });

  it('caps length at 40 chars without a trailing hyphen', () => {
    const out = slugify('a'.repeat(50));
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith('-')).toBe(false);
  });

  it('returns empty string when there are no usable characters', () => {
    expect(slugify('！！！')).toBe('');
  });
});

describe('randomSuffix', () => {
  it('is 6 lowercase-alphanumeric chars', () => {
    expect(randomSuffix(() => 0.5)).toMatch(/^[a-z0-9]{6}$/);
  });

  it('is deterministic given a seeded rand', () => {
    expect(randomSuffix(() => 0)).toBe('aaaaaa');
  });
});

describe('generateInviteSlug', () => {
  it('combines a name base with a random suffix', () => {
    expect(generateInviteSlug('Maya', () => 0)).toBe('maya-aaaaaa');
  });

  it('falls back to "party" when the name yields no slug', () => {
    expect(generateInviteSlug('###', () => 0)).toBe('party-aaaaaa');
  });
});
