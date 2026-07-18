import { describe, it, expect } from 'vitest';
import { validateEventInput } from './event.validation';

const valid = {
  childName: '  Maya  ',
  partyDate: '2026-08-15',
  location: 'Sunny Park',
  paymentLinks: [{ type: 'Venmo', url: 'https://venmo.com/u/maya', label: 'Venmo' }],
};

describe('validateEventInput — required fields', () => {
  it('accepts a minimal valid payload and trims strings', () => {
    const res = validateEventInput({ childName: 'Maya', partyDate: '2026-08-15', location: 'Park' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.childName).toBe('Maya');
      expect(res.data.status).toBe('draft');
      expect(res.data.paymentLinks).toEqual([]);
    }
  });

  it('reports every missing required field', () => {
    const res = validateEventInput({});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toEqual(
        expect.arrayContaining([
          'Child name is required.',
          'Party date is required.',
          'Location is required.',
        ]),
      );
    }
  });

  it('rejects an impossible calendar date', () => {
    const res = validateEventInput({ childName: 'A', partyDate: '2026-02-30', location: 'X' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain('Party date must be a valid date (yyyy-mm-dd).');
  });

  it('rejects a malformed date string', () => {
    const res = validateEventInput({ childName: 'A', partyDate: '15/08/2026', location: 'X' });
    expect(res.ok).toBe(false);
  });
});

describe('validateEventInput — payment links', () => {
  it('normalizes method, keeps label, and drops fully-blank rows', () => {
    const res = validateEventInput({
      ...valid,
      paymentLinks: [
        { type: 'Venmo', url: 'https://venmo.com/u/maya', label: 'Venmo' },
        { type: '', url: '', label: '' },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.paymentLinks).toEqual([
        { type: 'venmo', url: 'https://venmo.com/u/maya', label: 'Venmo' },
      ]);
    }
  });

  it('coerces an unknown method to "other"', () => {
    const res = validateEventInput({ ...valid, paymentLinks: [{ type: 'bitcoin', url: 'https://x.com/y' }] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.paymentLinks[0].type).toBe('other');
  });

  it('rejects a non-http(s) payment URL', () => {
    const res = validateEventInput({ ...valid, paymentLinks: [{ type: 'other', url: 'ftp://nope' }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0]).toMatch(/Payment link 1 must be a valid/);
  });
});

describe('validateEventInput — optional fields', () => {
  it('includes gift/charity only when they carry a value and validates their URLs', () => {
    const res = validateEventInput({
      ...valid,
      gender: '  ',
      giftDisplay: { title: 'LEGO set', link: 'https://shop.com/lego', imageUrl: '' },
      charity: { name: 'UNICEF' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.gender).toBeUndefined();
      expect(res.data.giftDisplay).toEqual({ title: 'LEGO set', link: 'https://shop.com/lego' });
      expect(res.data.charity).toEqual({ name: 'UNICEF' });
    }
  });

  it('rejects an invalid gift link', () => {
    const res = validateEventInput({ ...valid, giftDisplay: { link: 'notaurl' } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors).toContain('Gift link must be a valid http(s) URL.');
  });

  it('accepts a published status', () => {
    const res = validateEventInput({ ...valid, status: 'published' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe('published');
  });
});
