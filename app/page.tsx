import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <span className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
          🎁 Group birthday gifting
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          One gift. Everyone chips in.
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Create a birthday event, share an invite link, and let guests RSVP and
          pledge toward a single group gift — no accounts required for guests.
        </p>
        <div className="flex gap-3">
          <Button size="lg" render={<Link href="/signup" />}>
            Get started
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/login" />}>
            Log in
          </Button>
        </div>
      </div>
    </main>
  );
}
