import Link from 'next/link';
import { RequireMember } from '@/components/auth/require-member';
import { UserMenu } from '@/components/auth/user-menu';

/**
 * Member-gated chrome shared by all organizer areas (/dashboard, /events/*):
 * the RequireMember gate plus the app header with the user menu.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <RequireMember>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            🎁 Wrappit
          </Link>
          <UserMenu />
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </RequireMember>
  );
}
