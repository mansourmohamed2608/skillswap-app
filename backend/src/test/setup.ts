/**
 * Jest Test Setup
 * This file runs before each test file
 */

/* eslint-disable no-console */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.FUNCTIONS_EMULATOR = 'true';

// Mock Firebase Admin - Note: Individual tests may override these mocks
jest.mock('../core/firebase-admin', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ exists: false, data: () => null } as any),
    set: jest.fn().mockResolvedValue(undefined as any),
    update: jest.fn().mockResolvedValue(undefined as any),
    delete: jest.fn().mockResolvedValue(undefined as any),
  },
  auth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user' } as any),
    getUser: jest.fn().mockResolvedValue({ uid: 'test-user', email: 'test@example.com' } as any),
  },
  messaging: {
    send: jest.fn().mockResolvedValue('message-id' as any),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 } as any),
  },
  ensureAdminApp: jest.fn(),
}));

// Mock Firebase Functions config
jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({})),
  firestore: {
    document: jest.fn(() => ({
      onWrite: jest.fn((handler) => handler),
      onCreate: jest.fn((handler) => handler),
      onUpdate: jest.fn((handler) => handler),
      onDelete: jest.fn((handler) => handler),
    })),
  },
  https: {
    onRequest: jest.fn((handler) => handler),
    onCall: jest.fn((handler) => handler),
  },
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless DEBUG is set
  log: process.env.DEBUG ? console.log : jest.fn(),
  debug: process.env.DEBUG ? console.debug : jest.fn(),
  info: process.env.DEBUG ? console.info : jest.fn(),
  warn: process.env.DEBUG ? console.warn : jest.fn(),
  error: console.error,
};

// Increase default test timeout for async operations
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Reset modules between test files to ensure clean state
afterAll(() => {
  jest.resetModules();
});
