/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides resilient HTTP/API call handling with:
 * - Configurable retry attempts
 * - Exponential backoff with jitter
 * - Circuit breaker pattern support
 * - Typed error handling
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Operation name for logging */
  operationName?: string;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'isRetryable' | 'operationName'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Default retry condition - retries on network errors and 5xx status codes
 */
export function defaultIsRetryable(error: unknown): boolean {
  if (!error) return false;
  
  // Network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up') ||
      message.includes('etimedout')
    ) {
      return true;
    }
  }

  // Axios-style errors with response
  const axiosError = error as { response?: { status?: number }; code?: string };
  if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
    return true;
  }
  
  // 5xx server errors are retryable
  const status = axiosError.response?.status;
  if (status && status >= 500 && status < 600) {
    return true;
  }
  
  // 429 Too Many Requests - should retry with backoff
  if (status === 429) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  delay = Math.min(delay, maxDelayMs);
  
  if (jitter) {
    // Add random jitter between 0-25% of the delay
    const jitterAmount = delay * 0.25 * Math.random();
    delay = delay + jitterAmount;
  }
  
  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => axios.post('https://api.example.com/data', payload),
 *   { maxRetries: 3, operationName: 'createUser' }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitter,
  } = { ...DEFAULT_OPTIONS, ...options };
  
  const isRetryable = options.isRetryable ?? defaultIsRetryable;
  const operationName = options.operationName ?? 'operation';

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries || !isRetryable(error)) {
        logger.error({
          event: 'retry_exhausted',
          operation: operationName,
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitter
      );

      logger.warn({
        event: 'retry_attempt',
        operation: operationName,
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Decorator-style retry wrapper for class methods
 * 
 * @example
 * ```typescript
 * class ApiService {
 *   @Retry({ maxRetries: 3 })
 *   async fetchData() { ... }
 * }
 * ```
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        { ...options, operationName: options.operationName ?? propertyKey }
      );
    };
    
    return descriptor;
  };
}

/**
 * Circuit breaker state for a service
 */
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitStates = new Map<string, CircuitState>();

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before trying again (default: 60000) */
  resetTimeoutMs?: number;
  /** Circuit name for tracking */
  name: string;
}

/**
 * Execute with circuit breaker pattern
 * Prevents cascading failures by failing fast when a service is down
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  options: CircuitBreakerOptions
): Promise<T> {
  const { name, failureThreshold = 5, resetTimeoutMs = 60000 } = options;
  
  let state = circuitStates.get(name);
  if (!state) {
    state = { failures: 0, lastFailure: 0, state: 'closed' };
    circuitStates.set(name, state);
  }

  // Check if circuit is open
  if (state.state === 'open') {
    const timeSinceLastFailure = Date.now() - state.lastFailure;
    if (timeSinceLastFailure < resetTimeoutMs) {
      throw new Error(`Circuit breaker open for ${name}`);
    }
    // Move to half-open state
    state.state = 'half-open';
  }

  try {
    const result = await fn();
    
    // Success - reset circuit
    if (state.state === 'half-open') {
      state.state = 'closed';
    }
    state.failures = 0;
    
    return result;
  } catch (error) {
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= failureThreshold) {
      state.state = 'open';
      logger.error({
        event: 'circuit_breaker_opened',
        name,
        failures: state.failures,
      });
    }
    
    throw error;
  }
}

export default { withRetry, withCircuitBreaker, Retry, defaultIsRetryable };
