import { describe, it, expect } from 'vitest';
import { toPublicEvent } from './to-public-event';
import type { WrappitEvent } from '@/app/model/events/event.types';

const ROW: WrappitEvent = {
  _id: 'evt-1',
  _owner: 'member-secret',
  _createdDate: '2026-07-01',
  inviteSlug: 'maya-abc123',
  childName: 'Maya',
  gender: 'girl',
  partyDate: '2026-08-15',
  partyTime: '15:00',
  location: 'Sunny Park',
  description: 'Superhero party',
  status: 'published',
  paymentLinks: [{ type: 'venmo', url: 'https://venmo.com/u/x' }],
  giftDisplay: { title: 'Bike', imageUrl: 'https://img/x.png' },
  charity: { name: 'Shelter' },
};

describe('toPublicEvent', () => {
  it('copies guest-safe fields', () => {
    const pub = toPublicEvent(ROW);
    expect(pub.childName).toBe('Maya');
    expect(pub.inviteSlug).toBe('maya-abc123');
    expect(pub.paymentLinks).toHaveLength(1);
    expect(pub.giftDisplay?.title).toBe('Bike');
  });

  it('never leaks internal / system fields', () => {
    const pub = toPublicEvent(ROW) as unknown as Record<string, unknown>;
    expect(pub._id).toBeUndefined();
    expect(pub._owner).toBeUndefined();
    expect(pub._createdDate).toBeUndefined();
    expect(pub.status).toBeUndefined();
  });

  it('defaults paymentLinks to an array when missing', () => {
    const pub = toPublicEvent({ ...ROW, paymentLinks: undefined as unknown as [] });
    expect(Array.isArray(pub.paymentLinks)).toBe(true);
  });
});
