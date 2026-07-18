import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InviteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-lg font-medium">This invite isn&apos;t available</p>
      <p className="text-sm text-muted-foreground">
        The link may be mistyped, or the event hasn&apos;t been published yet. Check with whoever
        shared it with you.
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Go to Wrappit
      </Button>
    </main>
  );
}
