import { describe, it, expect } from 'vitest';
import { buildShareText } from './share-text';

const URL = 'https://wrappit.app/i/maya-abc123';

describe('buildShareText', () => {
  it('includes the child name, formatted date and invite url', () => {
    const text = buildShareText({ childName: 'Maya', partyDate: '2026-08-15' }, URL);
    expect(text).toContain('Maya');
    expect(text).toMatch(/August.*15.*2026/);
    expect(text).toContain(URL);
  });

  it('accepts a Date object for partyDate (as Wix returns it)', () => {
    const text = buildShareText({ childName: 'Maya', partyDate: new Date('2026-08-15T00:00:00') }, URL);
    expect(text).toMatch(/August.*15.*2026/);
  });

  it('omits the date clause when partyDate is missing', () => {
    const text = buildShareText({ childName: 'Maya', partyDate: '' }, URL);
    expect(text).toContain("Maya's birthday!");
    expect(text).not.toMatch(/on\s+\w+\s+\d/);
    expect(text).toContain(URL);
  });

  it('falls back to a generic name when childName is blank', () => {
    const text = buildShareText({ childName: '  ', partyDate: '2026-08-15' }, URL);
    expect(text).toContain('our little one');
  });
});
