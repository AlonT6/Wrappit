import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { COLLECTIONS } from '@/app/model/collections';

const h = vi.hoisted(() => ({
  memberClient: null as unknown,
  adminFind: vi.fn(),
  insert: vi.fn(),
  getCurrentMember: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));
vi.mock('@/app/model/auth/wix-client.server', () => ({
  getServerWixClient: () => h.memberClient,
}));
vi.mock('@/app/model/wix-api-client', () => ({
  getWixApiClient: () => ({
    items: { query: () => ({ eq: () => ({ find: h.adminFind }) }) },
  }),
}));

function memberClient() {
  return {
    members: { getCurrentMember: h.getCurrentMember },
    items: { insert: h.insert },
  };
}

function req(body: unknown) {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = { childName: 'Maya', partyDate: '2026-08-15', location: 'Sunny Park' };

beforeEach(() => {
  h.memberClient = memberClient();
  h.adminFind.mockReset().mockResolvedValue({ items: [] });
  h.insert.mockReset().mockImplementation(async (_c: string, item: Record<string, unknown>) => ({
    _id: 'evt-1',
    _owner: 'member-1',
    ...item,
  }));
  h.getCurrentMember.mockReset().mockResolvedValue({ member: { _id: 'member-1' } });
});

describe('POST /api/events', () => {
  it('returns 500 when the Wix client is not configured', async () => {
    h.memberClient = null;
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
  });

  it('returns 401 when there is no logged-in member', async () => {
    h.getCurrentMember.mockResolvedValue({ member: undefined });
    const res = await POST(req(VALID));
    expect(res.status).toBe(401);
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('returns 401 when getCurrentMember throws (visitor session)', async () => {
    h.getCurrentMember.mockRejectedValue(new Error('not a member'));
    const res = await POST(req(VALID));
    expect(res.status).toBe(401);
  });

  it('returns 400 with validation errors for a bad payload', async () => {
    const res = await POST(req({ childName: '' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errors).toEqual(expect.arrayContaining(['Child name is required.']));
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const res = await POST(req('not json{'));
    expect(res.status).toBe(400);
  });

  it('creates the event via the member client with a generated slug and returns 201', async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(201);
    const json = await res.json();

    expect(h.insert).toHaveBeenCalledTimes(1);
    const [collectionId, item] = h.insert.mock.calls[0];
    expect(collectionId).toBe(COLLECTIONS.events);
    expect(item.childName).toBe('Maya');
    expect(item.inviteSlug).toMatch(/^maya-[a-z0-9]{6}$/);
    expect(item.status).toBe('draft');
    expect(json.event._id).toBe('evt-1');
    expect(json.event._owner).toBe('member-1');
  });

  it('retries the slug when the first candidate already exists', async () => {
    h.adminFind
      .mockResolvedValueOnce({ items: [{ _id: 'taken' }] }) // first slug taken
      .mockResolvedValueOnce({ items: [] }); // second is free
    const res = await POST(req(VALID));
    expect(res.status).toBe(201);
    expect(h.adminFind).toHaveBeenCalledTimes(2);
  });

  it('returns 500 when the insert fails', async () => {
    h.insert.mockRejectedValue(new Error('wix down'));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
  });
});
