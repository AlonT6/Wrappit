import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginState } from '@wix/sdk';
import Cookies from 'js-cookie';
import { WIX_REFRESH_TOKEN } from './auth.const';
import {
  signUp,
  signIn,
  verifyEmail,
  sendPasswordReset,
  signOut,
} from './auth.actions';

// The action layer builds a fresh browser client per call; we swap it for a fake.
// vi.hoisted so the spy exists before the (hoisted) vi.mock factory runs.
const { getBrowserWixClient } = vi.hoisted(() => ({ getBrowserWixClient: vi.fn() }));
vi.mock('@/app/model/auth/wix-client.browser', () => ({
  getBrowserWixClient: () => getBrowserWixClient(),
  resetBrowserWixClient: () => {},
}));

vi.mock('js-cookie', () => ({
  default: { set: vi.fn(), get: vi.fn(), remove: vi.fn() },
}));

const MEMBER_TOKENS = {
  refreshToken: { value: 'ref-abc', role: 'member' },
  accessToken: { value: 'acc-abc', expiresAt: 123 },
};

/** A fake Wix client whose auth methods are individually controllable. */
function fakeClient(overrides: Record<string, unknown> = {}) {
  const auth = {
    register: vi.fn(),
    login: vi.fn(),
    processVerification: vi.fn(),
    getMemberTokensForDirectLogin: vi.fn().mockResolvedValue(MEMBER_TOKENS),
    setTokens: vi.fn(),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { auth };
}

beforeEach(() => {
  vi.mocked(Cookies.set).mockClear();
  vi.mocked(Cookies.remove).mockClear();
  getBrowserWixClient.mockReset();
});

describe('resolveState via signIn/signUp', () => {
  it('SUCCESS → exchanges the session token, persists the cookie, returns success', async () => {
    const client = fakeClient({
      login: vi.fn().mockResolvedValue({
        loginState: LoginState.SUCCESS,
        data: { sessionToken: 'sess-1' },
      }),
    });
    getBrowserWixClient.mockReturnValue(client);

    const result = await signIn({ email: 'a@b.com', password: 'pw' });

    expect(result).toEqual({ status: 'success' });
    expect(client.auth.getMemberTokensForDirectLogin).toHaveBeenCalledWith('sess-1');
    expect(client.auth.setTokens).toHaveBeenCalledWith(MEMBER_TOKENS);
    expect(Cookies.set).toHaveBeenCalledWith(
      WIX_REFRESH_TOKEN,
      JSON.stringify(MEMBER_TOKENS.refreshToken),
      expect.objectContaining({ sameSite: 'lax', secure: false, expires: 400 }),
    );
  });

  it('EMAIL_VERIFICATION_REQUIRED → returns the state token, writes no cookie', async () => {
    getBrowserWixClient.mockReturnValue(
      fakeClient({
        register: vi.fn().mockResolvedValue({
          loginState: LoginState.EMAIL_VERIFICATION_REQUIRED,
          data: { stateToken: 'state-9' },
        }),
      }),
    );

    const result = await signUp({ email: 'a@b.com', password: 'pw' });

    expect(result).toEqual({ status: 'verification-required', stateToken: 'state-9' });
    expect(Cookies.set).not.toHaveBeenCalled();
  });

  it.each([
    ['invalidEmail', 'That email address looks invalid.'],
    ['invalidPassword', 'Incorrect email or password.'],
    ['emailAlreadyExists', 'An account with this email already exists. Try logging in.'],
    ['resetPassword', 'Please reset your password before logging in.'],
    ['missingCaptchaToken', 'Captcha verification failed. Please try again.'],
    ['invalidCaptchaToken', 'Captcha verification failed. Please try again.'],
  ])('FAILURE errorCode %s → friendly message', async (errorCode, message) => {
    getBrowserWixClient.mockReturnValue(
      fakeClient({
        login: vi.fn().mockResolvedValue({ loginState: LoginState.FAILURE, errorCode }),
      }),
    );
    const result = await signIn({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({ status: 'error', message });
  });

  it('FAILURE with unknown code → falls back to res.error', async () => {
    getBrowserWixClient.mockReturnValue(
      fakeClient({
        login: vi.fn().mockResolvedValue({
          loginState: LoginState.FAILURE,
          errorCode: 'somethingElse',
          error: 'Server said no.',
        }),
      }),
    );
    const result = await signIn({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({ status: 'error', message: 'Server said no.' });
  });

  it('FAILURE with no code/error → generic fallback', async () => {
    getBrowserWixClient.mockReturnValue(
      fakeClient({
        login: vi.fn().mockResolvedValue({ loginState: LoginState.FAILURE }),
      }),
    );
    const result = await signIn({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({
      status: 'error',
      message: 'Something went wrong. Please try again.',
    });
  });

  it('OWNER_APPROVAL_REQUIRED → pending-approval message', async () => {
    getBrowserWixClient.mockReturnValue(
      fakeClient({
        login: vi.fn().mockResolvedValue({ loginState: LoginState.OWNER_APPROVAL_REQUIRED }),
      }),
    );
    const result = await signIn({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({
      status: 'error',
      message: 'This account is pending owner approval.',
    });
  });

  it('an unhandled state (e.g. captcha) → additional-verification message', async () => {
    getBrowserWixClient.mockReturnValue(
      fakeClient({
        login: vi.fn().mockResolvedValue({ loginState: 'SOME_CAPTCHA_STATE' }),
      }),
    );
    const result = await signIn({ email: 'a@b.com', password: 'pw' });
    expect(result).toEqual({
      status: 'error',
      message: 'Additional verification is required. Please try again later.',
    });
  });
});

describe('argument shapes', () => {
  it('signUp forwards email/password/profile to register', async () => {
    const client = fakeClient({
      register: vi.fn().mockResolvedValue({
        loginState: LoginState.EMAIL_VERIFICATION_REQUIRED,
        data: { stateToken: 's' },
      }),
    });
    getBrowserWixClient.mockReturnValue(client);
    await signUp({ email: 'a@b.com', password: 'pw', firstName: 'Ada', lastName: 'L' });
    expect(client.auth.register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      profile: { firstName: 'Ada', lastName: 'L' },
    });
  });

  it('signIn forwards only email/password to login', async () => {
    const client = fakeClient({
      login: vi.fn().mockResolvedValue({
        loginState: LoginState.SUCCESS,
        data: { sessionToken: 's' },
      }),
    });
    getBrowserWixClient.mockReturnValue(client);
    await signIn({ email: 'a@b.com', password: 'pw' });
    expect(client.auth.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
  });

  it('verifyEmail passes an explicit EMAIL_VERIFICATION_REQUIRED state with the state token', async () => {
    const client = fakeClient({
      processVerification: vi.fn().mockResolvedValue({
        loginState: LoginState.SUCCESS,
        data: { sessionToken: 's' },
      }),
    });
    getBrowserWixClient.mockReturnValue(client);
    await verifyEmail('000111', 'state-tok');
    expect(client.auth.processVerification).toHaveBeenCalledWith(
      { verificationCode: '000111' },
      { loginState: LoginState.EMAIL_VERIFICATION_REQUIRED, data: { stateToken: 'state-tok' } },
    );
  });
});

describe('unconfigured client', () => {
  beforeEach(() => getBrowserWixClient.mockReturnValue(null));

  it('signUp → error result', async () => {
    expect(await signUp({ email: 'a@b.com', password: 'pw' })).toEqual({
      status: 'error',
      message: 'Wix client is not configured.',
    });
  });

  it('signIn → error result', async () => {
    expect(await signIn({ email: 'a@b.com', password: 'pw' })).toEqual({
      status: 'error',
      message: 'Wix client is not configured.',
    });
  });

  it('verifyEmail → error result', async () => {
    expect(await verifyEmail('123', 'st')).toEqual({
      status: 'error',
      message: 'Wix client is not configured.',
    });
  });

  it('sendPasswordReset → throws', async () => {
    await expect(sendPasswordReset('a@b.com')).rejects.toThrow('Wix client is not configured.');
  });
});

describe('sendPasswordReset', () => {
  it('calls sendPasswordResetEmail with the email and current origin', async () => {
    const client = fakeClient();
    getBrowserWixClient.mockReturnValue(client);
    await sendPasswordReset('a@b.com');
    expect(client.auth.sendPasswordResetEmail).toHaveBeenCalledWith(
      'a@b.com',
      window.location.origin,
    );
  });
});

describe('signOut', () => {
  it('removes the refresh-token cookie', async () => {
    await signOut();
    expect(Cookies.remove).toHaveBeenCalledWith(WIX_REFRESH_TOKEN);
  });
});
