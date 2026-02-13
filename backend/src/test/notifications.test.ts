/**
 * Notifications Service Tests
 * Tests in-app, email, and push notifications
 */

// Mock dependencies
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn(),
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
  messaging: jest.fn(() => ({
    sendEachForMulticast: jest.fn(),
  })),
}));

jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({
    smtp: {},
  })),
}));

jest.mock('axios');
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

import * as admin from 'firebase-admin';
import axios from 'axios';
import { sendInAppNotification, sendEmailNotification, sendEmail, sendPushNotification } from '../core/notifications';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Notifications Service', () => {
  let mockAdd: jest.Mock;
  let mockGet: jest.Mock;
  let mockSendMulticast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdd = jest.fn().mockResolvedValue({ id: 'notification-123' });
    mockGet = jest.fn();
    mockSendMulticast = jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 });

    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn((name) => ({
        add: mockAdd,
        doc: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    });

    (admin.messaging as jest.Mock).mockReturnValue({
      sendEachForMulticast: mockSendMulticast,
    });
  });

  describe('sendInAppNotification', () => {
    it('should create a notification document in Firestore', async () => {
      const payload = {
        userId: 'user-123',
        type: 'message' as const,
        content: 'You have a new message',
        link: '/chat/abc',
      };

      await sendInAppNotification(payload);

      expect(admin.firestore).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'message',
          content: 'You have a new message',
          link: '/chat/abc',
          isRead: false,
          date: expect.any(Date),
        })
      );
    });

    it('should set isRead to false by default', async () => {
      const payload = {
        userId: 'user-456',
        type: 'system' as const,
        content: 'System notification',
      };

      await sendInAppNotification(payload);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: false,
        })
      );
    });

    it('should include optional listingId when provided', async () => {
      const payload = {
        userId: 'user-789',
        type: 'request' as const,
        content: 'New request',
        listingId: 'listing-123',
      };

      await sendInAppNotification(payload);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: 'listing-123',
        })
      );
    });
  });

  describe('sendEmailNotification', () => {
    beforeEach(() => {
      // Clear SMTP env vars
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.SMTP_FROM;
    });

    it('should not send email when SMTP is not configured', async () => {
      await sendEmailNotification('user-123', 'Subject', 'Body');

      // Should return early without calling nodemailer
      expect(require('nodemailer').createTransport).not.toHaveBeenCalled();
    });

    it('should fetch user email and send when SMTP is configured', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      process.env.SMTP_FROM = 'noreply@example.com';

      mockGet.mockResolvedValue({
        data: () => ({ email: 'recipient@example.com' }),
      });

      const nodemailer = require('nodemailer');
      const mockSendMail = jest.fn().mockResolvedValue({});
      nodemailer.createTransport.mockReturnValue({
        sendMail: mockSendMail,
      });

      await sendEmailNotification('user-123', 'Test Subject', 'Test Body');

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
      });
    });

    it('should not send email when user has no email address', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      process.env.SMTP_FROM = 'noreply@example.com';

      mockGet.mockResolvedValue({
        data: () => ({}), // No email field
      });

      const nodemailer = require('nodemailer');
      const mockSendMail = jest.fn();
      nodemailer.createTransport.mockReturnValue({
        sendMail: mockSendMail,
      });

      await sendEmailNotification('user-123', 'Subject', 'Body');

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.SMTP_FROM;
    });

    it('should send email directly to specified address', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      process.env.SMTP_FROM = 'noreply@example.com';

      const nodemailer = require('nodemailer');
      const mockSendMail = jest.fn().mockResolvedValue({});
      nodemailer.createTransport.mockReturnValue({
        sendMail: mockSendMail,
      });

      await sendEmail('direct@example.com', 'Direct Subject', 'Direct Body');

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'direct@example.com',
        subject: 'Direct Subject',
        text: 'Direct Body',
      });
    });
  });

  describe('sendPushNotification', () => {
    it('should not send when user has no device tokens', async () => {
      mockGet.mockResolvedValue({
        data: () => ({ tokens: [] }),
      });

      await sendPushNotification('user-123', 'Title', 'Body');

      expect(mockSendMulticast).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should send FCM notifications for non-Expo tokens', async () => {
      mockGet.mockResolvedValue({
        data: () => ({ tokens: ['fcm-token-1', 'fcm-token-2'] }),
      });

      await sendPushNotification('user-123', 'FCM Title', 'FCM Body', '/deep/link');

      expect(mockSendMulticast).toHaveBeenCalledWith({
        tokens: ['fcm-token-1', 'fcm-token-2'],
        notification: { title: 'FCM Title', body: 'FCM Body' },
        data: { link: '/deep/link' },
      });
    });

    it('should send Expo push notifications for Expo tokens', async () => {
      mockGet.mockResolvedValue({
        data: () => ({ tokens: ['ExponentPushToken[abc123]', 'ExpoPushToken[def456]'] }),
      });

      mockedAxios.post.mockResolvedValue({ data: {} });

      await sendPushNotification('user-123', 'Expo Title', 'Expo Body');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        [
          { to: 'ExponentPushToken[abc123]', title: 'Expo Title', body: 'Expo Body', sound: 'default', data: undefined },
          { to: 'ExpoPushToken[def456]', title: 'Expo Title', body: 'Expo Body', sound: 'default', data: undefined },
        ],
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );
    });

    it('should send to both FCM and Expo when mixed tokens present', async () => {
      mockGet.mockResolvedValue({
        data: () => ({
          tokens: ['fcm-token-1', 'ExponentPushToken[abc123]', 'fcm-token-2'],
        }),
      });

      mockedAxios.post.mockResolvedValue({ data: {} });

      await sendPushNotification('user-123', 'Mixed Title', 'Mixed Body');

      // FCM tokens
      expect(mockSendMulticast).toHaveBeenCalledWith({
        tokens: ['fcm-token-1', 'fcm-token-2'],
        notification: { title: 'Mixed Title', body: 'Mixed Body' },
        data: undefined,
      });

      // Expo tokens
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        [{ to: 'ExponentPushToken[abc123]', title: 'Mixed Title', body: 'Mixed Body', sound: 'default', data: undefined }],
        expect.any(Object)
      );
    });

    it('should not throw when push notification fails', async () => {
      mockGet.mockResolvedValue({
        data: () => ({ tokens: ['fcm-token-1'] }),
      });

      mockSendMulticast.mockRejectedValue(new Error('FCM error'));

      // Should not throw
      await expect(sendPushNotification('user-123', 'Title', 'Body')).resolves.not.toThrow();
    });
  });
});
