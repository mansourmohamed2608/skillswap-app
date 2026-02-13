/**
 * Error Utilities Tests
 * Tests error message handling, code mapping, and safe message detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getErrorMessage,
  getStatusMessage,
  setErrorMessages,
  buildErrorMessageOptions,
} from '@/lib/errors';

describe('Error Utilities', () => {
  beforeEach(() => {
    // Reset global options before each test
    setErrorMessages({});
  });

  describe('getErrorMessage', () => {
    describe('Firebase Auth Errors', () => {
      it('should map auth/email-already-in-use error', () => {
        const error = { code: 'auth/email-already-in-use', message: 'Firebase: Error' };
        const result = getErrorMessage(error, 'Something went wrong');
        expect(result).toBe('This email is already in use.');
      });

      it('should map auth/invalid-email error', () => {
        const error = { code: 'auth/invalid-email' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Enter a valid email address.');
      });

      it('should map auth/weak-password error', () => {
        const error = { code: 'auth/weak-password' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Password is too weak. Use at least 6 characters.');
      });

      it('should map auth/user-not-found error', () => {
        const error = { code: 'auth/user-not-found' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('No account found for that email.');
      });

      it('should map auth/wrong-password error', () => {
        const error = { code: 'auth/wrong-password' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Incorrect password.');
      });

      it('should map auth/invalid-credential error', () => {
        const error = { code: 'auth/invalid-credential' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Invalid email or password.');
      });

      it('should map auth/too-many-requests error', () => {
        const error = { code: 'auth/too-many-requests' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Too many attempts. Please try again later.');
      });

      it('should use fallback for unknown auth errors', () => {
        const error = { code: 'auth/unknown-error' };
        const result = getErrorMessage(error, 'Custom fallback');
        expect(result).toBe('Custom fallback');
      });
    });

    describe('Firestore/General Errors', () => {
      it('should map permission-denied error', () => {
        const error = { code: 'permission-denied' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('You do not have permission to do that.');
      });

      it('should map not-found error', () => {
        const error = { code: 'not-found' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('We could not find what you requested.');
      });

      it('should map unauthenticated error', () => {
        const error = { code: 'unauthenticated' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Please sign in to continue.');
      });

      it('should map resource-exhausted error', () => {
        const error = { code: 'resource-exhausted' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Too many requests. Please try again later.');
      });
    });

    describe('Storage Errors', () => {
      it('should map storage/unauthorized error', () => {
        const error = { code: 'storage/unauthorized' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('You do not have permission to upload this file.');
      });

      it('should map storage/quota-exceeded error', () => {
        const error = { code: 'storage/quota-exceeded' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Storage quota exceeded.');
      });
    });

    describe('Custom Error Codes', () => {
      it('should map reviews/own_listing error', () => {
        const error = { code: 'reviews/own_listing' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('You cannot review your own listing.');
      });

      it('should map reports/own_content error', () => {
        const error = { code: 'reports/own_content' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('You cannot report your own content.');
      });
    });

    describe('Network Errors', () => {
      it('should detect "failed to fetch" as network error', () => {
        const error = { message: 'Failed to fetch' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Network error. Check your connection and try again.');
      });

      it('should detect "network request failed" as network error', () => {
        const result = getErrorMessage('Network request failed', 'Fallback');
        expect(result).toBe('Network error. Check your connection and try again.');
      });

      it('should detect ECONNREFUSED as network error', () => {
        const error = { message: 'ECONNREFUSED' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Network error. Check your connection and try again.');
      });
    });

    describe('String Errors', () => {
      it('should return safe string messages as-is', () => {
        const result = getErrorMessage('User-friendly message', 'Fallback');
        expect(result).toBe('User-friendly message');
      });

      it('should use fallback for unsafe messages with stack traces', () => {
        const unsafeMessage = 'Error at firebase/auth/handler.js:123';
        const result = getErrorMessage(unsafeMessage, 'Safe fallback');
        expect(result).toBe('Safe fallback');
      });

      it('should use fallback for messages with exception keyword', () => {
        const unsafeMessage = 'NullPointerException occurred';
        const result = getErrorMessage(unsafeMessage, 'Safe fallback');
        expect(result).toBe('Safe fallback');
      });

      it('should use fallback for very long messages', () => {
        const longMessage = 'A'.repeat(200);
        const result = getErrorMessage(longMessage, 'Short fallback');
        expect(result).toBe('Short fallback');
      });
    });

    describe('API-like Errors', () => {
      it('should extract message from API-style error object', () => {
        const error = { status: 400, message: 'Invalid request data' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('Invalid request data');
      });

      it('should use fallback when API error has empty message', () => {
        const error = { status: 500, message: '' };
        const result = getErrorMessage(error, 'Server error fallback');
        expect(result).toBe('Server error fallback');
      });
    });

    describe('Custom Options Override', () => {
      it('should use custom auth messages when provided', () => {
        const error = { code: 'auth/email-already-in-use' };
        const result = getErrorMessage(error, 'Fallback', {
          authMessages: {
            'auth/email-already-in-use': 'البريد مستخدم مسبقاً', // Arabic
          },
        });
        expect(result).toBe('البريد مستخدم مسبقاً');
      });

      it('should use custom network message when provided', () => {
        const result = getErrorMessage('Failed to fetch', 'Fallback', {
          networkMessage: 'تحقق من اتصالك بالإنترنت', // Arabic
        });
        expect(result).toBe('تحقق من اتصالك بالإنترنت');
      });
    });

    describe('Error Code Extraction from Message', () => {
      it('should extract error code from message with parentheses', () => {
        const error = { message: 'Firebase: Error (auth/user-not-found).' };
        const result = getErrorMessage(error, 'Fallback');
        expect(result).toBe('No account found for that email.');
      });
    });
  });

  describe('getStatusMessage', () => {
    it('should return network message for status 0', () => {
      const result = getStatusMessage(0);
      expect(result).toBe('Network error. Check your connection and try again.');
    });

    it('should return default message for 400 without server message', () => {
      const result = getStatusMessage(400);
      // 400 falls through to default since it's not special-cased
      expect(result).toBe('Something went wrong. Please try again.');
    });

    it('should return default message for 401 without server message', () => {
      const result = getStatusMessage(401);
      expect(result).toBe('Something went wrong. Please try again.');
    });

    it('should return default message for 403 without server message', () => {
      const result = getStatusMessage(403);
      expect(result).toBe('Something went wrong. Please try again.');
    });

    it('should return default message for 404 without server message', () => {
      const result = getStatusMessage(404);
      expect(result).toBe('Something went wrong. Please try again.');
    });

    it('should return appropriate message for 429', () => {
      const result = getStatusMessage(429);
      expect(result).toBe('Too many requests. Please try again in a moment.');
    });

    it('should return server unavailable for 5xx errors', () => {
      const result = getStatusMessage(503);
      expect(result).toBe('Service is temporarily unavailable. Please try again later.');
    });

    it('should use server message when provided and language is English', () => {
      const result = getStatusMessage(400, 'Custom server error', undefined, { language: 'en' });
      expect(result).toBe('Custom server error');
    });

    it('should use fallback when provided', () => {
      const result = getStatusMessage(418, undefined, 'I am a teapot');
      expect(result).toBe('I am a teapot');
    });
  });

  describe('setErrorMessages', () => {
    it('should set global error message options', () => {
      setErrorMessages({
        networkMessage: 'Global network error message',
      });

      const result = getErrorMessage('Network request failed', 'Fallback');
      expect(result).toBe('Global network error message');
    });

    it('should merge local options with global options', () => {
      setErrorMessages({
        codeMessages: {
          'custom-error': 'Global custom error',
        },
      });

      const error = { code: 'custom-error' };
      const result = getErrorMessage(error, 'Fallback', {
        codeMessages: {
          'another-error': 'Local error',
        },
      });

      expect(result).toBe('Global custom error');
    });
  });

  describe('buildErrorMessageOptions', () => {
    it('should build options from translation function', () => {
      const mockT = vi.fn((key: string) => {
        const translations: Record<string, string> = {
          'errors.codes.auth/email-already-in-use': 'Email already used',
          'errors.status.404': 'Not found',
          'errors.network': 'Network error',
        };
        return translations[key] || key;
      });

      const options = buildErrorMessageOptions(mockT, 'en');

      expect(options.codeMessages).toBeDefined();
      expect(options.statusMessages).toBeDefined();
      expect(options.networkMessage).toBe('Network error');
      expect(options.language).toBe('en');
    });

    it('should not include untranslated keys', () => {
      const mockT = vi.fn((key: string) => key); // Returns key unchanged

      const options = buildErrorMessageOptions(mockT);

      // Keys that weren't translated should not be included
      expect(options.networkMessage).toBeUndefined();
      expect(options.authFallback).toBeUndefined();
    });
  });
});
