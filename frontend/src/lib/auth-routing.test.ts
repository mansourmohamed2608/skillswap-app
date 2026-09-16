import { describe, expect, it } from 'vitest';
import { isAuthContextSyncing, shouldRedirectToSignIn } from './auth-routing';

describe('protected route auth timing', () => {
  it('does not redirect while Firebase is signed in and context is catching up', () => {
    expect(shouldRedirectToSignIn(false, null, 'firebase-user')).toBe(false);
    expect(isAuthContextSyncing(false, null, 'firebase-user')).toBe(true);
  });

  it('redirects only when both auth sources are signed out', () => {
    expect(shouldRedirectToSignIn(false, null, null)).toBe(true);
  });

  it('does not redirect during initial auth loading', () => {
    expect(shouldRedirectToSignIn(true, null, null)).toBe(false);
  });
});
