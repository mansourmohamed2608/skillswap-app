/**
 * Moderation Utils Tests
 * Tests banned keyword detection and image moderation
 */

// Mock dependencies before importing the module
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
}));

jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({
    moderation: {
      image_api_url: '',
      image_api_key: '',
    },
  })),
}));

jest.mock('axios');
jest.mock('../core/firebase-admin', () => ({
  ensureAdminApp: jest.fn(),
}));

import * as admin from 'firebase-admin';
import axios from 'axios';
import { findBannedKeyword, findBannedKeywordInFields, checkImageModeration } from '../core/moderation-utils';
import { ensureAdminApp } from '../core/firebase-admin';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Moderation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findBannedKeyword', () => {
    it('should return null for empty input', async () => {
      const result = await findBannedKeyword('');
      expect(result).toBeNull();
    });

    it('should return null for null/undefined input', async () => {
      const result = await findBannedKeyword(null as any);
      expect(result).toBeNull();
    });

    it('should detect actual banned keyword in text', async () => {
      // Mock Firestore to fail so we use DEFAULT_KEYWORDS (from banned-keywords.ts)
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      // Test with actual banned keyword from banned-keywords.ts
      const result = await findBannedKeyword('this text contains weapon in it');
      expect(result).toBe('weapon');
    });

    it('should be case insensitive', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      // Test with uppercase version of a banned keyword
      const result = await findBannedKeyword('THIS TEXT HAS WEAPON IN IT');
      expect(result).toBe('weapon');
    });

    it('should return null for clean text', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      const result = await findBannedKeyword('hello world how are you today');
      expect(result).toBeNull();
    });

    it('should detect multiple banned keywords and return first found', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      // Both 'weapon' and 'drugs' are in the banned list
      const result = await findBannedKeyword('text with weapon and drugs');
      // Should return the first match found during iteration
      expect(['weapon', 'drugs']).toContain(result);
    });

    // Obfuscation detection tests
    describe('Obfuscation Detection', () => {
      beforeEach(() => {
        (ensureAdminApp as jest.Mock).mockImplementation(() => {
          throw new Error('No Firebase app');
        });
      });

      it('should detect asterisk obfuscation (s*x)', async () => {
        const result = await findBannedKeyword('this has s*x content');
        expect(result).toBe('sex');
      });

      it('should detect dot obfuscation (s.e.x)', async () => {
        const result = await findBannedKeyword('hidden s.e.x word');
        expect(result).toBe('sex');
      });

      it('should detect partial dot obfuscation (s.ex)', async () => {
        const result = await findBannedKeyword('tricky s.ex bypass');
        expect(result).toBe('sex');
      });

      it('should detect repeated character obfuscation (seex)', async () => {
        const result = await findBannedKeyword('doubled seex letters');
        expect(result).toBe('sex');
      });

      it('should detect leetspeak (dru9s, w3apon)', async () => {
        // 9 -> g, 3 -> e mapping
        const result1 = await findBannedKeyword('trying dru9s bypass');
        expect(result1).toBe('drugs');

        const result2 = await findBannedKeyword('hidden w3apon here');
        expect(result2).toBe('weapon');
      });

      it('should detect number substitution (p0rn)', async () => {
        const result = await findBannedKeyword('bad p0rn content');
        expect(result).toBe('porn');
      });

      it('should detect at-sign substitution (h@te)', async () => {
        const result = await findBannedKeyword('spreading h@te speech');
        expect(result).toBe('hate');
      });

      it('should detect dollar-sign substitution ($cam)', async () => {
        const result = await findBannedKeyword('its a $cam alert');
        expect(result).toBe('scam');
      });

      it('should detect combined obfuscation (s*xx, dr.u.gs)', async () => {
        const result1 = await findBannedKeyword('very bad s*xx stuff');
        expect(result1).toBe('sex');

        const result2 = await findBannedKeyword('selling dr.u.gs here');
        expect(result2).toBe('drugs');
      });

      it('should detect dash/underscore separators (w-e-a-p-o-n)', async () => {
        const result = await findBannedKeyword('hidden w-e-a-p-o-n word');
        expect(result).toBe('weapon');
      });

      it('should still allow clean text after normalization', async () => {
        const result = await findBannedKeyword('hello world coding tutorial');
        expect(result).toBeNull();
      });
    });

    it('should use default keywords when Firestore doc does not exist', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {});

      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: mockGet,
          })),
        })),
      });

      const result = await findBannedKeyword('normal text');
      // Should not crash and should return null for normal text
      expect(result).toBeNull();
    });
  });

  describe('findBannedKeywordInFields', () => {
    it('should return null for empty fields array', async () => {
      const result = await findBannedKeywordInFields([]);
      expect(result).toBeNull();
    });

    it('should check multiple fields and return first match', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      const fields = [
        { label: 'title', value: 'Normal title' },
        { label: 'description', value: 'Contains weapon here' },
      ];

      const result = await findBannedKeywordInFields(fields);
      expect(result).toEqual({ field: 'description', keyword: 'weapon' });
    });

    it('should return null for clean fields', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      const fields = [
        { label: 'title', value: 'Normal title' },
        { label: 'description', value: 'Some safe description' },
      ];

      const result = await findBannedKeywordInFields(fields);
      expect(result).toBeNull();
    });

    it('should handle array values in fields', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      const fields = [
        { label: 'tags', value: ['safe', 'weapon', 'tag3'] },
      ];

      const result = await findBannedKeywordInFields(fields);
      expect(result).toEqual({ field: 'tags', keyword: 'weapon' });
    });

    it('should handle null/undefined values in fields', async () => {
      const fields = [
        { label: 'empty', value: null },
        { label: 'undefined', value: undefined },
      ];

      const result = await findBannedKeywordInFields(fields);
      expect(result).toBeNull();
    });

    it('should convert numbers and booleans to strings', async () => {
      (ensureAdminApp as jest.Mock).mockImplementation(() => {
        throw new Error('No Firebase app');
      });

      const fields = [
        { label: 'price', value: 100 },
        { label: 'active', value: true },
      ];

      const result = await findBannedKeywordInFields(fields);
      // Should not throw and should process numeric/boolean values
      expect(result).toBeNull();
    });
  });

  describe('checkImageModeration', () => {
    beforeEach(() => {
      process.env.MODERATION_IMAGE_API_URL = '';
      process.env.MODERATION_IMAGE_API_KEY = '';
    });

    it('should return ok: true for empty URL', async () => {
      const result = await checkImageModeration('');
      expect(result).toEqual({ ok: true });
    });

    it('should return ok: true for null URL', async () => {
      const result = await checkImageModeration(null);
      expect(result).toEqual({ ok: true });
    });

    it('should return ok: true when no API URL is configured', async () => {
      const result = await checkImageModeration('https://example.com/image.jpg');
      expect(result).toEqual({ ok: true });
    });

    it('should call moderation API when URL is configured', async () => {
      process.env.MODERATION_IMAGE_API_URL = 'https://moderation.api/check';
      process.env.MODERATION_IMAGE_API_KEY = 'test-api-key';

      mockedAxios.post.mockResolvedValue({
        data: { safe: true },
      });

      const result = await checkImageModeration('https://example.com/image.jpg');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://moderation.api/check',
        { url: 'https://example.com/image.jpg' },
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-api-key' },
          timeout: 10000,
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it('should return ok: false when API flags image', async () => {
      process.env.MODERATION_IMAGE_API_URL = 'https://moderation.api/check';

      mockedAxios.post.mockResolvedValue({
        data: { safe: false, reason: 'inappropriate_content' },
      });

      const result = await checkImageModeration('https://example.com/bad-image.jpg');

      expect(result).toEqual({
        ok: false,
        reason: 'inappropriate_content',
      });
    });

    it('should return ok: true when API call fails', async () => {
      process.env.MODERATION_IMAGE_API_URL = 'https://moderation.api/check';

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await checkImageModeration('https://example.com/image.jpg');

      // Should fail gracefully and allow the image
      expect(result).toEqual({ ok: true });
    });

    it('should use default reason when API returns no reason', async () => {
      process.env.MODERATION_IMAGE_API_URL = 'https://moderation.api/check';

      mockedAxios.post.mockResolvedValue({
        data: { safe: false },
      });

      const result = await checkImageModeration('https://example.com/flagged.jpg');

      expect(result).toEqual({
        ok: false,
        reason: 'image_flagged',
      });
    });
  });
});
