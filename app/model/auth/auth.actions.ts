import Cookies from 'js-cookie';
import { LoginState, type StateMachine, type Tokens } from '@wix/sdk';
import {
  getBrowserWixClient,
  resetBrowserWixClient,
} from '@/app/model/auth/wix-client.browser';
import { WIX_REFRESH_TOKEN } from '@/app/model/auth/auth.const';

/**
 * Client-side Wix Members auth. Every organizer flow (signup / login / verify /
 * logout / password reset) runs through the browser OAuth client and persists the
 * resulting session to the shared `wix_refreshToken` cookie, so SSR and browser
 * renders observe the same member session (see wix-client.base.ts).
 *
 * Guests never touch this — their invite reads/writes go through the server
 * API-key client.
 */

const COOKIE_MAX_AGE_DAYS = 400; // ~matches the visitor cookie set in proxy.ts

/** Persist member tokens to the shared cookie + the in-memory client. */
function persistSession(tokens: Tokens) {
  Cookies.set(WIX_REFRESH_TOKEN, JSON.stringify(tokens.refreshToken), {
    secure: window.location.protocol === 'https:',
    sameSite: 'lax',
    expires: COOKIE_MAX_AGE_DAYS,
  });
}

/** Exchange a Wix session token (from a SUCCESS state) for member tokens and persist them. */
async function completeLogin(sessionToken: string) {
  const client = getBrowserWixClient();
  if (!client) throw new Error('Wix client is not configured.');
  const tokens = await client.auth.getMemberTokensForDirectLogin(sessionToken);
  client.auth.setTokens(tokens);
  persistSession(tokens);
}

/** Result of a signup/login/verify step the UI needs to react to. */
export type AuthResult =
  | { status: 'success' }
  | { status: 'verification-required'; stateToken: string }
  | { status: 'error'; message: string };

/** Friendly message for a FAILURE state. */
function failureMessage(errorCode?: string, fallback?: string): string {
  switch (errorCode) {
    case 'invalidEmail':
      return 'That email address looks invalid.';
    case 'invalidPassword':
      return 'Incorrect email or password.';
    case 'emailAlreadyExists':
      return 'An account with this email already exists. Try logging in.';
    case 'resetPassword':
      return 'Please reset your password before logging in.';
    case 'missingCaptchaToken':
    case 'invalidCaptchaToken':
      return 'Captcha verification failed. Please try again.';
    default:
      return fallback || 'Something went wrong. Please try again.';
  }
}

export async function signUp(params: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthResult> {
  const client = getBrowserWixClient();
  if (!client) return { status: 'error', message: 'Wix client is not configured.' };

  const { email, password, firstName, lastName } = params;
  const res = await client.auth.register({
    email,
    password,
    profile: { firstName, lastName },
  });
  return resolveState(res);
}

export async function signIn(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const client = getBrowserWixClient();
  if (!client) return { status: 'error', message: 'Wix client is not configured.' };

  const res = await client.auth.login(params);
  return resolveState(res);
}

/**
 * Submit an email-verification code for a pending signup.
 * The `stateToken` comes from the prior `verification-required` result — we pass an
 * explicit state because each action uses a fresh client (no shared in-memory state).
 */
export async function verifyEmail(
  verificationCode: string,
  stateToken: string,
): Promise<AuthResult> {
  const client = getBrowserWixClient();
  if (!client) return { status: 'error', message: 'Wix client is not configured.' };

  const res = await client.auth.processVerification(
    { verificationCode },
    { loginState: LoginState.EMAIL_VERIFICATION_REQUIRED, data: { stateToken } },
  );
  return resolveState(res);
}

/** Map a Wix auth state machine to our AuthResult, completing login on SUCCESS. */
async function resolveState(res: StateMachine): Promise<AuthResult> {
  switch (res.loginState) {
    case LoginState.SUCCESS:
      await completeLogin(res.data.sessionToken);
      return { status: 'success' };
    case LoginState.EMAIL_VERIFICATION_REQUIRED:
      return { status: 'verification-required', stateToken: res.data.stateToken };
    case LoginState.FAILURE:
      return { status: 'error', message: failureMessage(res.errorCode, res.error) };
    case LoginState.OWNER_APPROVAL_REQUIRED:
      return {
        status: 'error',
        message: 'This account is pending owner approval.',
      };
    default:
      return {
        status: 'error',
        message: 'Additional verification is required. Please try again later.',
      };
  }
}

/** Send a password-reset email; Wix hosts the reset page and returns to `redirectUri`. */
export async function sendPasswordReset(email: string): Promise<void> {
  const client = getBrowserWixClient();
  if (!client) throw new Error('Wix client is not configured.');
  await client.auth.sendPasswordResetEmail(email, window.location.origin);
}

/** Clear the member session. The next navigation re-seeds a visitor token (see proxy.ts). */
export async function signOut(): Promise<void> {
  Cookies.remove(WIX_REFRESH_TOKEN);
  // Drop the shared client so it no longer holds the (now cleared) member tokens in memory.
  resetBrowserWixClient();
}
