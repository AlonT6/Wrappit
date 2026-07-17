'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { signUp, verifyEmail } from '@/app/model/auth/auth.actions';
import { useRefreshCurrentMember } from '@/app/model/auth/use-current-member';

export default function SignupPage() {
  const router = useRouter();
  const refreshMember = useRefreshCurrentMember();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stateToken, setStateToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSuccess() {
    await refreshMember();
    router.replace('/dashboard');
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signUp({ email, password, firstName });
      if (result.status === 'success') {
        await onSuccess();
      } else if (result.status === 'verification-required') {
        setStateToken(result.stateToken);
      } else {
        setError(result.message);
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!stateToken) return;
    setError(null);
    setPending(true);
    try {
      const result = await verifyEmail(code, stateToken);
      if (result.status === 'success') {
        await onSuccess();
      } else if (result.status === 'error') {
        setError(result.message);
      } else {
        setError('That code was not accepted. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (stateToken) {
    return (
      <AuthShell
        title="Check your email"
        description={`We sent a verification code to ${email}.`}
      >
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? 'Verifying…' : 'Verify email'}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" description="Start organizing group gifts.">
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
