import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

const h = vi.hoisted(() => ({ getPublishedEventBySlug: vi.fn() }));

vi.mock('@/app/model/invite/get-event.server', () => ({
  getPublishedEventBySlug: h.getPublishedEventBySlug,
}));

const PUBLISHED = {
  _id: 'evt-1',
  _owner: 'member-1',
  inviteSlug: 'maya-abc123',
  childName: 'Maya',
  location: 'Sunny Park',
  partyDate: '2026-08-15',
  status: 'published',
  paymentLinks: [{ type: 'venmo', url: 'https://venmo.com/u/x' }],
};

function req(slug?: string) {
  const url = slug === undefined ? 'http://localhost/api/invite' : `http://localhost/api/invite?slug=${slug}`;
  return new Request(url);
}

beforeEach(() => {
  h.getPublishedEventBySlug.mockReset();
});

describe('GET /api/invite', () => {
  it('returns 404 for an unknown / draft slug', async () => {
    h.getPublishedEventBySlug.mockResolvedValue(null);
    const res = await GET(req('nope'));
    expect(res.status).toBe(404);
  });

  it('returns the public projection for a published event', async () => {
    h.getPublishedEventBySlug.mockResolvedValue(PUBLISHED);
    const res = await GET(req('maya-abc123'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.childName).toBe('Maya');
    // never leak internal fields
    expect(body.event._id).toBeUndefined();
    expect(body.event._owner).toBeUndefined();
    expect(body.event.status).toBeUndefined();
  });

  it('returns 500 when the lookup throws', async () => {
    h.getPublishedEventBySlug.mockRejectedValue(new Error('wix down'));
    const res = await GET(req('maya-abc123'));
    expect(res.status).toBe(500);
  });
});
