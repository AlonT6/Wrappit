import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { COLLECTIONS } from '@/app/model/collections';

const h = vi.hoisted(() => ({
  memberClient: null as unknown,
  getCurrentMember: vi.fn(),
  get: vi.fn(),
  find: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));
vi.mock('@/app/model/auth/wix-client.server', () => ({
  getServerWixClient: () => h.memberClient,
}));
vi.mock('@/app/model/wix-api-client', () => ({
  getWixApiClient: () => ({
    items: {
      get: h.get,
      query: (collectionId: string) => ({
        eq: () => ({ find: () => h.find(collectionId) }),
      }),
    },
  }),
}));

function memberClient() {
  return { members: { getCurrentMember: h.getCurrentMember } };
}

function call(id = 'evt-1') {
  const request = new Request(`http://localhost/api/events/${id}/summary`);
  return GET(request, { params: Promise.resolve({ id }) });
}

const RSVPS = [
  { _id: 'r1', eventId: 'evt-1', status: 'yes', inviteeName: 'Kid A', parentName: 'Parent A' },
  { _id: 'r2', eventId: 'evt-1', status: 'yes', inviteeName: 'Kid B', parentName: 'Parent B' },
  { _id: 'r3', eventId: 'evt-1', status: 'no', inviteeName: 'Kid C', parentName: 'Parent C' },
];
const PLEDGES = [
  { _id: 'p1', eventId: 'evt-1', contributorName: 'Alice', amount: 25 },
  { _id: 'p2', eventId: 'evt-1', contributorName: 'Bob', amount: 12.5 },
];

beforeEach(() => {
  h.memberClient = memberClient();
  h.getCurrentMember.mockReset().mockResolvedValue({ member: { _id: 'member-1' } });
  h.get.mockReset().mockResolvedValue({ _id: 'evt-1', _owner: 'member-1', childName: 'Maya' });
  h.find.mockReset().mockImplementation(async (collectionId: string) =>
    collectionId === COLLECTIONS.rsvps ? { items: RSVPS } : { items: PLEDGES },
  );
});

describe('GET /api/events/[id]/summary', () => {
  it('returns 500 when the Wix client is not configured', async () => {
    h.memberClient = null;
    const res = await call();
    expect(res.status).toBe(500);
  });

  it('returns 401 when there is no logged-in member', async () => {
    h.getCurrentMember.mockResolvedValue({ member: undefined });
    const res = await call();
    expect(res.status).toBe(401);
    expect(h.get).not.toHaveBeenCalled();
  });

  it('returns 401 when getCurrentMember throws (visitor session)', async () => {
    h.getCurrentMember.mockRejectedValue(new Error('not a member'));
    const res = await call();
    expect(res.status).toBe(401);
  });

  it('returns 404 when the event does not exist', async () => {
    h.get.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(404);
    expect(h.find).not.toHaveBeenCalled();
  });

  it('returns 404 when the event belongs to another member (no data leak)', async () => {
    h.get.mockResolvedValue({ _id: 'evt-1', _owner: 'someone-else', childName: 'Maya' });
    const res = await call();
    expect(res.status).toBe(404);
    expect(h.find).not.toHaveBeenCalled();
  });

  it('returns 200 with the RSVP list, pledge list and correct totals for the owner', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(h.get).toHaveBeenCalledWith(COLLECTIONS.events, 'evt-1');
    expect(json.rsvps).toHaveLength(3);
    expect(json.pledges).toHaveLength(2);
    expect(json.pledgeTotal).toBe(37.5);
    expect(json.attendingCount).toBe(2);
    expect(json.notAttendingCount).toBe(1);
  });

  it('unwraps the { dataItem } event shape before the ownership check', async () => {
    h.get.mockResolvedValue({ dataItem: { _id: 'evt-1', _owner: 'member-1', childName: 'Maya' } });
    const res = await call();
    expect(res.status).toBe(200);
  });

  it('returns 500 when the admin read fails', async () => {
    h.find.mockRejectedValue(new Error('wix down'));
    const res = await call();
    expect(res.status).toBe(500);
  });
});
