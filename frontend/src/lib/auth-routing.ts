export function shouldRedirectToSignIn(
  authLoading: boolean,
  contextUserId: string | null | undefined,
  sdkUserId: string | null | undefined,
): boolean {
  return !authLoading && !contextUserId && !sdkUserId;
}

export function isAuthContextSyncing(
  authLoading: boolean,
  contextUserId: string | null | undefined,
  sdkUserId: string | null | undefined,
): boolean {
  return authLoading || (!contextUserId && Boolean(sdkUserId));
}
