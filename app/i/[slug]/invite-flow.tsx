'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { submitRsvp } from '@/app/model/invite/submit-rsvp';
import { submitPledge } from '@/app/model/invite/submit-pledge';
import type { PublicEvent } from '@/app/model/invite/invite.types';

type Step = 'invite' | 'rsvp' | 'pledge' | 'done';

function formatDate(value?: string | Date): string {
  if (!value) return 'Date TBD';
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : 'Date TBD';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      {errors.map((err) => (
        <li key={err}>{err}</li>
      ))}
    </ul>
  );
}

export function InviteFlow({ event }: { event: PublicEvent }) {
  const [step, setStep] = useState<Step>('invite');
  // RSVP → pledge linkage: carried when a guest RSVPs before pledging.
  const [rsvpId, setRsvpId] = useState<string | undefined>(undefined);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re invited to {event.childName}&apos;s birthday 🎉
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(event.partyDate)}
          {event.partyTime ? ` · ${event.partyTime}` : ''} · {event.location}
        </p>
      </div>

      {step === 'invite' ? (
        <InviteStep
          event={event}
          onRsvp={() => setStep('rsvp')}
          onPledge={() => setStep('pledge')}
        />
      ) : null}

      {step === 'rsvp' ? (
        <RsvpStep
          event={event}
          onBack={() => setStep('invite')}
          onDone={(newRsvpId) => {
            setRsvpId(newRsvpId);
            setStep('pledge');
          }}
        />
      ) : null}

      {step === 'pledge' ? (
        <PledgeStep
          event={event}
          rsvpId={rsvpId}
          onBack={() => setStep('invite')}
          onDone={() => setStep('done')}
        />
      ) : null}

      {step === 'done' ? <DoneStep event={event} /> : null}
    </main>
  );
}

function InviteStep({
  event,
  onRsvp,
  onPledge,
}: {
  event: PublicEvent;
  onRsvp: () => void;
  onPledge: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Party details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">When:</span> {formatDate(event.partyDate)}
            {event.partyTime ? ` at ${event.partyTime}` : ''}
          </p>
          <p>
            <span className="text-muted-foreground">Where:</span> {event.location}
          </p>
          {event.description ? <p className="whitespace-pre-line">{event.description}</p> : null}
        </CardContent>
      </Card>

      {event.giftDisplay && (event.giftDisplay.title || event.giftDisplay.description) ? (
        <Card>
          <CardHeader>
            <CardTitle>The group gift</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {event.giftDisplay.title ? <p className="font-medium">{event.giftDisplay.title}</p> : null}
            {event.giftDisplay.description ? (
              <p className="text-muted-foreground">{event.giftDisplay.description}</p>
            ) : null}
            {event.giftDisplay.link ? (
              <a
                href={event.giftDisplay.link}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                View the gift
              </a>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {event.charity && (event.charity.name || event.charity.why) ? (
        <Card>
          <CardHeader>
            <CardTitle>Giving back</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {event.charity.name ? <p className="font-medium">{event.charity.name}</p> : null}
            {event.charity.why ? <p className="text-muted-foreground">{event.charity.why}</p> : null}
            {event.charity.url ? (
              <a
                href={event.charity.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Learn more
              </a>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onRsvp}>
          RSVP
        </Button>
        <Button size="lg" variant="outline" onClick={onPledge}>
          Chip in for the gift
        </Button>
      </div>
    </>
  );
}

function RsvpStep({
  event,
  onBack,
  onDone,
}: {
  event: PublicEvent;
  onBack: () => void;
  onDone: (rsvpId?: string) => void;
}) {
  const [attending, setAttending] = useState(true);
  const [inviteeName, setInviteeName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentName2, setParentName2] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [dietary, setDietary] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setPending(true);
    try {
      const result = await submitRsvp({
        slug: event.inviteSlug,
        inviteeName,
        attending,
        parentName,
        parentName2,
        parentEmail,
        parentPhone,
        dietary,
      });
      if (result.ok) onDone(result.rsvpId);
      else setErrors(result.errors);
    } catch {
      setErrors(['Something went wrong. Please try again.']);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>RSVP</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Will you be there?</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="attending"
                  checked={attending}
                  onChange={() => setAttending(true)}
                />
                Yes, we&apos;ll be there
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="attending"
                  checked={!attending}
                  onChange={() => setAttending(false)}
                />
                Can&apos;t make it
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inviteeName">Guest name (the child attending)</Label>
            <Input
              id="inviteeName"
              required
              value={inviteeName}
              onChange={(e) => setInviteeName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="parentName">Parent/guardian name</Label>
              <Input
                id="parentName"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="parentName2">Second parent (optional)</Label>
              <Input
                id="parentName2"
                value={parentName2}
                onChange={(e) => setParentName2(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="parentEmail">Email (optional)</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="parentPhone">Phone (optional)</Label>
              <Input
                id="parentPhone"
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dietary">Allergies / dietary notes (optional)</Label>
            <Textarea id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <ErrorList errors={errors} />

      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Saving…' : 'Submit RSVP'}
        </Button>
      </div>
    </form>
  );
}

function PledgeStep({
  event,
  rsvpId,
  onBack,
  onDone,
}: {
  event: PublicEvent;
  rsvpId?: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [contributorName, setContributorName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(event.paymentLinks[0]?.label || event.paymentLinks[0]?.type || '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setPending(true);
    try {
      const result = await submitPledge({
        slug: event.inviteSlug,
        contributorName,
        amount: Number(amount),
        method,
        note,
        rsvpId,
      });
      if (result.ok) onDone();
      else setErrors(result.errors);
    } catch {
      setErrors(['Something went wrong. Please try again.']);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {event.paymentLinks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Send your contribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Pay directly through any of these — then record your pledge below so the organizer can
              track the total.
            </p>
            {event.paymentLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {link.label || link.type} — {link.url}
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Record your pledge</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contributorName">Your name</Label>
              <Input
                id="contributorName"
                required
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {event.paymentLinks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="method">How you paid</Label>
                  <select
                    id="method"
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {event.paymentLinks.map((link, i) => (
                      <option key={i} value={link.label || link.type}>
                        {link.label || link.type}
                      </option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <ErrorList errors={errors} />

        <div className="flex items-center justify-between gap-4">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Saving…' : 'Record pledge'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DoneStep({ event }: { event: PublicEvent }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thank you! 🎁</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          Your response for {event.childName}&apos;s birthday has been recorded. The organizer will
          see it on their dashboard.
        </p>
        <p>You can close this page now.</p>
      </CardContent>
    </Card>
  );
}
