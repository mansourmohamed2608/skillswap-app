/**
 * Auth Middleware Tests
 * Tests Firebase token verification middleware
 */

import { Request, Response, NextFunction } from 'express';

// Mock firebase-admin before importing the module under test
const mockVerifyIdToken = jest.fn();

jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

import { authenticate } from '../authMiddleware';

// Helper to flush pending promises
const flushPromises = () => new Promise(setImmediate);

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Missing or Invalid Authorization Header', () => {
    it('should return 401 when Authorization header is missing', () => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing or invalid Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has no Bearer prefix', () => {
      mockReq.headers = { authorization: 'some-token' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing or invalid Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is empty', () => {
      mockReq.headers = { authorization: '' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer token is missing', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Valid Authorization Header', () => {
    it('should call next() and attach user when token is valid', async () => {
      const mockDecodedToken = { uid: 'user-123', email: 'test@example.com' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      authenticate(mockReq as Request, mockRes as Response, mockNext);
      await flushPromises();

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect((mockReq as any).user).toEqual(mockDecodedToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      authenticate(mockReq as Request, mockRes as Response, mockNext);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-string authorization header', () => {
      mockReq.headers = { authorization: 123 as any };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should extract token correctly with extra spaces', async () => {
      const mockDecodedToken = { uid: 'user-456' };
      mockReq.headers = { authorization: 'Bearer   token-with-spaces' };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      authenticate(mockReq as Request, mockRes as Response, mockNext);
      await flushPromises();

      // The regex should only capture what's after "Bearer "
      expect(mockVerifyIdToken).toHaveBeenCalledWith('  token-with-spaces');
    });
  });
});
