import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedEventBySlug } from '@/app/model/invite/get-event.server';
import { toPublicEvent } from '@/app/model/invite/to-public-event';
import { InviteFlow } from './invite-flow';

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Rich link-preview tags, built server-side from the event so pasting an invite
 * URL into a chat app shows the child's name and (if provided) the gift image.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug).catch(() => null);
  if (!event) return { title: 'Invite not found — Wrappit' };

  const title = `You're invited to ${event.childName}'s birthday 🎉`;
  const description =
    event.description ||
    `Join us to celebrate ${event.childName}. RSVP and chip in for the group gift.`;

  // The og:image / twitter:image tags are supplied automatically by the sibling
  // `opengraph-image.tsx` (a generated branded card), resolved to an absolute
  // URL via `metadataBase`. Chat apps like WhatsApp won't show a card without one.
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function InvitePage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Wrappit
          </Link>
          <span className="text-xs text-muted-foreground">Group birthday gifting</span>
        </div>
      </header>
      <InviteFlow event={toPublicEvent(event)} />
      <footer className="border-t">
        <div className="mx-auto w-full max-w-2xl px-6 py-4 text-center text-xs text-muted-foreground">
          Wrappit coordinates the gift — it never handles any money.
        </div>
      </footer>
    </div>
  );
}
