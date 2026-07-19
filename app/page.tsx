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

// Live capabilities — everything below is built and working today.
const CAPABILITIES = [
  {
    title: "Member accounts",
    body: "Organizers sign up and log in with email + password, verify their email, and reset a forgotten one — powered by Wix Members.",
  },
  {
    title: "Create & manage events",
    body: "Add the child's name, date, time, location and description, save drafts, then publish when you're ready.",
  },
  {
    title: "Multiple payment links",
    body: "Attach as many Venmo, Zelle, PayPal or CashApp links as you like — guests pay you directly, Wrappit never touches the money.",
  },
  {
    title: "Shareable invite with rich preview",
    body: "Every event gets a public invite link that unfurls into a branded card (child's name + date) in WhatsApp, iMessage and social.",
  },
  {
    title: "Guest RSVP — no login",
    body: "Guests confirm attendance and share contact details straight from the invite link, without creating an account.",
  },
  {
    title: "Group-gift pledges",
    body: "Guests pledge an amount toward the single group gift, with an optional note — on their own or alongside their RSVP.",
  },
  {
    title: "Organizer dashboard",
    body: "See every RSVP with contact details, the running pledge total, and a per-contributor breakdown — visible only to you.",
  },
  {
    title: "Copy-ready share message",
    body: "A suggested invite message you can copy and paste into the group chat in one tap.",
  },
];

// Roadmap — planned, not yet available. Kept clearly separate so nothing
// reads as a shipped feature.
const ROADMAP = [
  "Email the organizer automatically when a guest RSVPs or pledges",
  "Upload a photo of the birthday child onto the invite and preview card",
  "AI-generated invitation artwork",
  "Party reminders and thank-you notes",
  "Gift-idea guides and tips",
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

        {/* What Wrappit can do */}
        <section className="border-t px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              What Wrappit can do
            </h2>
            <p className="mt-2 text-muted-foreground">
              Everything below works today, end to end, on Wix Headless
              (Members + CMS).
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {CAPABILITIES.map((cap) => (
                <div key={cap.title} className="flex flex-col gap-2">
                  <h3 className="font-medium">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground">{cap.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 rounded-xl border bg-muted/40 p-6">
              <h3 className="text-sm font-semibold tracking-tight">
                On the roadmap
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Planned next — not yet available.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {ROADMAP.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
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
