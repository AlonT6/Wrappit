import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { COLLECTIONS } from '@/app/model/collections';

const h = vi.hoisted(() => ({ getPublishedEventBySlug: vi.fn(), insert: vi.fn() }));

vi.mock('@/app/model/invite/get-event.server', () => ({
  getPublishedEventBySlug: h.getPublishedEventBySlug,
}));
vi.mock('@/app/model/wix-api-client', () => ({
  getWixApiClient: () => ({ items: { insert: h.insert } }),
}));

const VALID = { slug: 'maya-abc123', inviteeName: 'Ava', attending: false, parentName: 'Sarah' };

function req(body: unknown) {
  return new Request('http://localhost/api/rsvp', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  h.getPublishedEventBySlug.mockReset().mockResolvedValue({ _id: 'evt-1', status: 'published' });
  h.insert.mockReset().mockResolvedValue({ _id: 'rsvp-1' });
});

describe('POST /api/rsvp', () => {
  it('returns 400 for an invalid payload', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('returns 404 when the slug is not a published event', async () => {
    h.getPublishedEventBySlug.mockResolvedValue(null);
    const res = await POST(req(VALID));
    expect(res.status).toBe(404);
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('writes the row to the rsvps collection and returns the new id', async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ rsvpId: 'rsvp-1' });
    const [collection, item] = h.insert.mock.calls[0];
    expect(collection).toBe(COLLECTIONS.rsvps);
    expect(item).toMatchObject({ eventId: 'evt-1', status: 'no', inviteeName: 'Ava', parentName: 'Sarah' });
    // never stores the raw slug
    expect(item.slug).toBeUndefined();
    expect(item.inviteSlug).toBeUndefined();
  });

  it("maps attending=true to status 'yes'", async () => {
    await POST(req({ ...VALID, attending: true }));
    expect(h.insert.mock.calls[0][1].status).toBe('yes');
  });

  it('returns 500 when the insert throws', async () => {
    h.insert.mockRejectedValue(new Error('wix down'));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
  });
});
