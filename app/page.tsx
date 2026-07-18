import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Create the event",
    body: "Add the birthday details and drop in your payment links — Venmo, Zelle, PayPal, whatever you use.",
  },
  {
    title: "Share one link",
    body: "Send the invite link to the group. Guests open it on any device — no account, no app to install.",
  },
  {
    title: "Everyone chips in",
    body: "Guests RSVP and pledge toward a single group gift. You watch the RSVPs and total roll in.",
  },
];

const FEATURES = [
  {
    title: "No guest accounts",
    body: "Guests just tap the link. Only you, the organizer, sign in.",
  },
  {
    title: "You never hold funds",
    body: "Pledges point at your own payment links. Wrappit records who's in — money moves directly.",
  },
  {
    title: "One gift, not ten",
    body: "Skip the pile of small presents. Pool it into the one thing they actually want.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          🎁 Wrappit
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button render={<Link href="/signup" />}>Get started</Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 py-24 text-center">
          <div className="flex max-w-2xl flex-col items-center gap-6">
            <span className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
              🎁 Group birthday gifting
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              One gift. Everyone chips in.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Create a birthday event, share an invite link, and let guests RSVP
              and pledge toward a single group gift — no accounts required for
              guests.
            </p>
            <div className="flex gap-3">
              <Button size="lg" render={<Link href="/signup" />}>
                Get started
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/login" />}
              >
                Log in
              </Button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/40 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Why Wrappit */}
        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-2">
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t bg-muted/40 px-6 py-20 text-center">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to organize the gift?
            </h2>
            <p className="text-muted-foreground">
              It takes a minute to set up. Guests take it from there.
            </p>
            <Button size="lg" render={<Link href="/signup" />}>
              Get started
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        <p>🎁 Wrappit — group birthday gifting on Wix Headless.</p>
      </footer>
    </div>
  );
}
