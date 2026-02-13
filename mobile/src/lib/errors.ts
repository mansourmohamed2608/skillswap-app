const SAFE_MESSAGE_MAX = 140;
const UNSAFE_MESSAGE_RE = /(exception|stack|trace|firebase|at\s)/i;

type ApiLikeError = { status: number; message: string };
type ErrorMessageOptions = {
  authMessages?: Record<string, string>;
  codeMessages?: Record<string, string>;
  statusMessages?: Record<string, string>;
  authFallback?: string;
  networkMessage?: string;
  language?: string;
};

const DEFAULT_AUTH_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already in use.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/user-not-found': 'No account found for that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
  'auth/operation-not-allowed': 'Email/password sign-in is disabled.',
  'auth/credential-already-in-use': 'This credential is already linked to another account.',
  'auth/account-exists-with-different-credential': 'This email is already linked to another sign-in method.',
};
const DEFAULT_CODE_MESSAGES: Record<string, string> = {
  ...DEFAULT_AUTH_MESSAGES,
  'permission-denied': 'You do not have permission to do that.',
  'unauthenticated': 'Please sign in to continue.',
  'not-found': 'We could not find what you requested.',
  'already-exists': 'This already exists.',
  'failed-precondition': 'This action cannot be completed right now.',
  'aborted': 'The request was cancelled.',
  'cancelled': 'The request was cancelled.',
  'deadline-exceeded': 'Request timed out. Please try again.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'invalid-argument': 'Invalid input. Please check and try again.',
  'out-of-range': 'Invalid input. Please check and try again.',
  'data-loss': 'Unexpected error. Please try again.',
  'unavailable': 'Service is temporarily unavailable. Please try again later.',
  'internal': 'Service is temporarily unavailable. Please try again later.',
  'unknown': 'Something went wrong. Please try again.',
  'storage/unauthorized': 'You do not have permission to upload this file.',
  'storage/canceled': 'Upload cancelled.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/retry-limit-exceeded': 'Upload failed. Please try again.',
  'storage/invalid-checksum': 'Upload failed. Please try again.',
  'storage/invalid-argument': 'Invalid file.',
  'storage/unknown': 'File upload failed.',
};
const DEFAULT_STATUS_MESSAGES: Record<string, string> = {
  '0': 'Network error. Check your connection and try again.',
  '400': 'We could not process that request.',
  '401': 'Please sign in to continue.',
  '403': 'You do not have permission to do that.',
  '404': 'We could not find what you requested.',
  '408': 'Request timed out. Please try again.',
  '429': 'Too many requests. Please try again in a moment.',
  '500': 'Service is temporarily unavailable. Please try again later.',
  default: 'Something went wrong. Please try again.',
};
const NETWORK_ERROR_RE = /(failed to fetch|network request failed|econnrefused|enotfound|etimedout|networkerror|offline)/i;
const ERROR_CODE_LIST = Object.keys(DEFAULT_CODE_MESSAGES);

let globalOptions: ErrorMessageOptions | null = null;

export function setErrorMessages(options: ErrorMessageOptions) {
  globalOptions = options;
}

function mergeOptions(options?: ErrorMessageOptions): ErrorMessageOptions | undefined {
  if (!globalOptions && !options) return options;
  return {
    ...globalOptions,
    ...options,
    authMessages: { ...(globalOptions?.authMessages || {}), ...(options?.authMessages || {}) },
    codeMessages: { ...(globalOptions?.codeMessages || {}), ...(options?.codeMessages || {}) },
    statusMessages: { ...(globalOptions?.statusMessages || {}), ...(options?.statusMessages || {}) },
  };
}

export function buildErrorMessageOptions(t: (key: string) => string, language?: string): ErrorMessageOptions {
  const codeMessages: Record<string, string> = {};
  for (const code of ERROR_CODE_LIST) {
    const key = `errors.codes.${code}`;
    const value = t(key);
    if (value && value !== key) {
      codeMessages[code] = value;
    }
  }
  const statusMessages: Record<string, string> = {};
  for (const status of ['0', '400', '401', '403', '404', '408', '429', '500', 'default']) {
    const key = `errors.status.${status}`;
    const value = t(key);
    if (value && value !== key) {
      statusMessages[status] = value;
    }
  }
  const networkMessage = t('errors.network');
  const authFallback = t('errors.authFallback');
  return {
    codeMessages,
    statusMessages,
    networkMessage: networkMessage !== 'errors.network' ? networkMessage : undefined,
    authFallback: authFallback !== 'errors.authFallback' ? authFallback : undefined,
    language,
  };
}

function isApiLikeError(err: unknown): err is ApiLikeError {
  return Boolean(
    err
      && typeof err === 'object'
      && typeof (err as ApiLikeError).status === 'number'
      && typeof (err as ApiLikeError).message === 'string'
  );
}

function isSafeMessage(message: string) {
  if (!message) return false;
  if (message.length > SAFE_MESSAGE_MAX) return false;
  if (message.includes('\n') || message.includes('\r')) return false;
  if (UNSAFE_MESSAGE_RE.test(message)) return false;
  return true;
}

function extractCodeFromMessage(message: string) {
  if (!message) return null;
  const match = message.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

function resolveCodeMessage(code: string, options?: ErrorMessageOptions) {
  const normalized = normalizeCode(code);
  const short = normalized.replace(/^(auth|storage)\//, '');
  const overrides = { ...(options?.codeMessages || {}), ...(options?.authMessages || {}) };
  if (overrides[code]) return overrides[code];
  if (overrides[normalized]) return overrides[normalized];
  if (overrides[short]) return overrides[short];
  if (DEFAULT_CODE_MESSAGES[normalized]) return DEFAULT_CODE_MESSAGES[normalized];
  if (DEFAULT_CODE_MESSAGES[short]) return DEFAULT_CODE_MESSAGES[short];
  return null;
}

export function getStatusMessage(
  status: number,
  serverMessage?: string,
  fallback?: string,
  options?: ErrorMessageOptions
) {
  const merged = mergeOptions(options);
  const mappedServer = serverMessage ? resolveCodeMessage(serverMessage, merged) : null;
  if (mappedServer) return mappedServer;
  const lang = merged?.language ? merged.language.toLowerCase() : 'en';
  if (serverMessage && lang.startsWith('en')) return serverMessage;

  const statusMessages = merged?.statusMessages || {};
  if (status === 0) {
    return merged?.networkMessage || statusMessages['0'] || DEFAULT_STATUS_MESSAGES['0'];
  }
  if (status >= 500) {
    return statusMessages['500'] || DEFAULT_STATUS_MESSAGES['500'];
  }
  const key = String(status);
  if (statusMessages[key]) return statusMessages[key];
  if (status === 408 || status === 429) {
    return statusMessages[key] || DEFAULT_STATUS_MESSAGES[key];
  }
  return fallback || statusMessages.default || DEFAULT_STATUS_MESSAGES.default;
}

export function getErrorMessage(error: unknown, fallback: string, options?: ErrorMessageOptions) {
  const merged = mergeOptions(options);
  if (isApiLikeError(error)) {
    return error.message || fallback;
  }

  if (typeof error === 'string') {
    if (NETWORK_ERROR_RE.test(error)) {
      return merged?.networkMessage || DEFAULT_STATUS_MESSAGES['0'];
    }
    return isSafeMessage(error) ? error : fallback;
  }

  if (error && typeof error === 'object') {
    const codeRaw = (error as any).code || (error as any).errorCode;
    const message = (error as any).message;
    const code =
      typeof codeRaw === 'string' ? codeRaw : (typeof message === 'string' ? extractCodeFromMessage(message) : null);
    if (typeof code === 'string') {
      const resolved = resolveCodeMessage(code, merged);
      if (resolved) return resolved;
      if (code.startsWith('auth/')) {
        return merged?.authFallback || fallback;
      }
    }
    if (typeof message === 'string' && isSafeMessage(message)) {
      if (NETWORK_ERROR_RE.test(message)) {
        return merged?.networkMessage || DEFAULT_STATUS_MESSAGES['0'];
      }
      const mapped = resolveCodeMessage(message, merged);
      if (mapped) return mapped;
      const lang = merged?.language ? merged.language.toLowerCase() : 'en';
      if (lang.startsWith('en')) return message;
    }
  }

  return fallback;
}
