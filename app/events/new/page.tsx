'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createEvent } from '@/app/model/events/create-event';
import { myEventsQueryKey } from '@/app/model/events/use-my-events';
import { PAYMENT_METHODS, type EventInput, type PaymentMethod } from '@/app/model/events/event.types';

const DRAFT_KEY = 'wrappit:new-event-draft';

type PaymentRow = { type: PaymentMethod; label: string; url: string };

type Draft = {
  childName: string;
  gender: string;
  partyDate: string;
  partyTime: string;
  location: string;
  description: string;
  paymentLinks: PaymentRow[];
  gift: { title: string; description: string; imageUrl: string; link: string };
  charity: { name: string; url: string; why: string };
  publish: boolean;
};

const EMPTY_DRAFT: Draft = {
  childName: '',
  gender: '',
  partyDate: '',
  partyTime: '',
  location: '',
  description: '',
  paymentLinks: [{ type: 'venmo', label: '', url: '' }],
  gift: { title: '', description: '', imageUrl: '', link: '' },
  charity: { name: '', url: '', why: '' },
  publish: false,
};

function loadDraft(): Draft {
  if (typeof window === 'undefined') return EMPTY_DRAFT;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

/** Assemble the API payload from the form draft (server does full validation). */
function toEventInput(d: Draft): EventInput {
  return {
    childName: d.childName,
    partyDate: d.partyDate,
    location: d.location,
    status: d.publish ? 'published' : 'draft',
    paymentLinks: d.paymentLinks.map((p) => ({ type: p.type, label: p.label, url: p.url })),
    gender: d.gender,
    partyTime: d.partyTime,
    description: d.description,
    giftDisplay: d.gift,
    charity: d.charity,
  };
}

export default function NewEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  // Load any autosaved draft after mount. Reading localStorage during render (lazy
  // init) would diverge from the server-rendered HTML and cause a hydration mismatch,
  // so we intentionally sync it in a mount effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe draft load
    setDraft(loadDraft());
  }, []);

  // Autosave on every change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setPayment(i: number, patch: Partial<PaymentRow>) {
    setDraft((d) => ({
      ...d,
      paymentLinks: d.paymentLinks.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    }));
  }

  function addPayment() {
    setDraft((d) => ({ ...d, paymentLinks: [...d.paymentLinks, { type: 'other', label: '', url: '' }] }));
  }

  function removePayment(i: number) {
    setDraft((d) => ({ ...d, paymentLinks: d.paymentLinks.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setPending(true);
    try {
      const result = await createEvent(toEventInput(draft));
      if (result.ok) {
        window.localStorage.removeItem(DRAFT_KEY);
        await queryClient.invalidateQueries({ queryKey: myEventsQueryKey });
        router.push(`/events/${result.event._id}`);
      } else {
        setErrors(result.errors);
      }
    } catch {
      setErrors(['Something went wrong. Please try again.']);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New birthday event</h1>
        <p className="text-sm text-muted-foreground">
          Your progress is saved on this device until you create the event.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>The basics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="childName">Child&apos;s name</Label>
              <Input
                id="childName"
                required
                value={draft.childName}
                onChange={(e) => set('childName', e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="partyDate">Party date</Label>
                <Input
                  id="partyDate"
                  type="date"
                  required
                  value={draft.partyDate}
                  onChange={(e) => set('partyDate', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="partyTime">Party time</Label>
                <Input
                  id="partyTime"
                  type="time"
                  value={draft.partyTime}
                  onChange={(e) => set('partyTime', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                required
                value={draft.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gender">Gender (optional)</Label>
              <Input
                id="gender"
                value={draft.gender}
                onChange={(e) => set('gender', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Where guests can send their pledge. Wrappit never handles the money.
            </p>
            {draft.paymentLinks.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`pm-type-${i}`}>Method</Label>
                  <select
                    id={`pm-type-${i}`}
                    aria-label={`Payment method ${i + 1}`}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                    value={row.type}
                    onChange={(e) => setPayment(i, { type: e.target.value as PaymentMethod })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`pm-url-${i}`}>Link</Label>
                  <Input
                    id={`pm-url-${i}`}
                    type="url"
                    placeholder="https://venmo.com/u/…"
                    value={row.url}
                    onChange={(e) => setPayment(i, { url: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePayment(i)}
                  aria-label={`Remove payment link ${i + 1}`}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                Add payment link
              </Button>
            </div>
          </CardContent>
        </Card>

        {errors.length > 0 ? (
          <ul className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.publish}
              onChange={(e) => set('publish', e.target.checked)}
            />
            Publish now (otherwise saved as a draft)
          </label>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Creating…' : 'Create event'}
          </Button>
        </div>
      </form>
    </main>
  );
}
