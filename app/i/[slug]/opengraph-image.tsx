import { ImageResponse } from 'next/og';
import { getPublishedEventBySlug } from '@/app/model/invite/get-event.server';

// Node runtime (default): the Wix admin client + `server-only` lookup can't run on edge.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Wrappit birthday invite';

function formatDate(value?: string | Date): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug).catch(() => null);
  const childName = event?.childName ?? 'a birthday';
  const when = formatDate(event?.partyDate);

  // No emoji: satori can't render them without an embedded emoji font.
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, opacity: 0.9, letterSpacing: 2 }}>
          YOU&apos;RE INVITED
        </div>
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, marginTop: 12, lineHeight: 1.1 }}>
          {childName}&apos;s birthday
        </div>
        {when ? (
          <div style={{ display: 'flex', fontSize: 40, marginTop: 24, opacity: 0.95 }}>{when}</div>
        ) : null}
        <div style={{ display: 'flex', fontSize: 30, marginTop: 'auto', opacity: 0.85 }}>
          RSVP &amp; chip in for the group gift · Wrappit
        </div>
      </div>
    ),
    size,
  );
}
