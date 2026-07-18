import { describe, it, expect } from 'vitest';
import { validateRsvpInput, validatePledgeInput } from './invite.validation';

describe('validateRsvpInput', () => {
  const VALID = { slug: 'maya-abc123', inviteeName: 'Ava', attending: true, parentName: 'Sarah' };

  it('accepts a minimal valid RSVP', () => {
    const r = validateRsvpInput(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.inviteeName).toBe('Ava');
      expect(r.data.attending).toBe(true);
    }
  });

  it("coerces 'yes'/'no' strings to a boolean", () => {
    const yes = validateRsvpInput({ ...VALID, attending: 'yes' });
    const no = validateRsvpInput({ ...VALID, attending: 'no' });
    expect(yes.ok && yes.data.attending).toBe(true);
    expect(no.ok && no.data.attending).toBe(false);
  });

  it('requires slug, invitee name, parent name, and an attendance choice', () => {
    const r = validateRsvpInput({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('rejects a malformed email', () => {
    const r = validateRsvpInput({ ...VALID, parentEmail: 'not-an-email' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.toLowerCase().includes('email'))).toBe(true);
  });

  it('drops blank optional fields and trims values', () => {
    const r = validateRsvpInput({
      ...VALID,
      inviteeName: '  Ava  ',
      parentName2: '',
      dietary: '  no nuts ',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.inviteeName).toBe('Ava');
      expect(r.data.parentName2).toBeUndefined();
      expect(r.data.dietary).toBe('no nuts');
    }
  });
});

describe('validatePledgeInput', () => {
  const VALID = { slug: 'maya-abc123', contributorName: 'Grandma Ruth', amount: 50 };

  it('accepts a valid pledge', () => {
    const r = validatePledgeInput(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.amount).toBe(50);
  });

  it('accepts a numeric string amount', () => {
    const r = validatePledgeInput({ ...VALID, amount: '25.50' });
    expect(r.ok && r.data.amount).toBe(25.5);
  });

  it.each([0, -5, 'abc', undefined, NaN])('rejects a non-positive/invalid amount: %s', (amount) => {
    const r = validatePledgeInput({ ...VALID, amount });
    expect(r.ok).toBe(false);
  });

  it('requires slug and contributor name', () => {
    const r = validatePledgeInput({ amount: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps an optional rsvpId link when present', () => {
    const r = validatePledgeInput({ ...VALID, rsvpId: 'rsvp-1' });
    expect(r.ok && r.data.rsvpId).toBe('rsvp-1');
  });
});
