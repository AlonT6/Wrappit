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

const VALID = { slug: 'maya-abc123', contributorName: 'Grandma Ruth', amount: 50 };

function req(body: unknown) {
  return new Request('http://localhost/api/pledge', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  h.getPublishedEventBySlug.mockReset().mockResolvedValue({ _id: 'evt-1', status: 'published' });
  h.insert.mockReset().mockResolvedValue({ _id: 'pledge-1' });
});

describe('POST /api/pledge', () => {
  it('returns 400 for a non-positive amount', async () => {
    const res = await POST(req({ ...VALID, amount: 0 }));
    expect(res.status).toBe(400);
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('returns 404 when the slug is not a published event', async () => {
    h.getPublishedEventBySlug.mockResolvedValue(null);
    const res = await POST(req(VALID));
    expect(res.status).toBe(404);
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('writes the row to the pledges collection with a numeric amount', async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(201);
    const [collection, item] = h.insert.mock.calls[0];
    expect(collection).toBe(COLLECTIONS.pledges);
    expect(item).toMatchObject({ eventId: 'evt-1', contributorName: 'Grandma Ruth', amount: 50 });
    expect(item.slug).toBeUndefined();
  });

  it('links an rsvpId when the guest RSVPed first', async () => {
    await POST(req({ ...VALID, rsvpId: 'rsvp-1' }));
    expect(h.insert.mock.calls[0][1].rsvpId).toBe('rsvp-1');
  });

  it('omits rsvpId for a standalone pledge', async () => {
    await POST(req(VALID));
    expect(h.insert.mock.calls[0][1].rsvpId).toBeUndefined();
  });

  it('returns 500 when the insert throws', async () => {
    h.insert.mockRejectedValue(new Error('wix down'));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
  });
});
