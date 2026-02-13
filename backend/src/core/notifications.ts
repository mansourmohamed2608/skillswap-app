import * as admin from 'firebase-admin';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { logger } from './logger';
import { withRetry } from './retry';

type NotificationPayload = {
  userId: string;
  type: 'system' | 'request' | 'message' | 'review';
  content: string;
  link?: string;
  listingId?: string;
  requesterId?: string;
};

type FailedNotification = {
  type: 'email' | 'push' | 'expo';
  payload: Record<string, unknown>;
  error: string;
  timestamp: Date;
  retryCount: number;
};

// Dead letter collection for failed notifications
const DEAD_LETTER_COLLECTION = 'notificationDeadLetters';

/**
 * Save failed notification to dead letter queue for manual retry/investigation
 */
async function saveToDeadLetter(notification: FailedNotification): Promise<void> {
  try {
    await admin.firestore().collection(DEAD_LETTER_COLLECTION).add(notification);
    logger.warn({
      event: 'notification_dead_letter',
      type: notification.type,
      error: notification.error,
    });
  } catch (e) {
    logger.error({ event: 'dead_letter_save_failed', error: e instanceof Error ? e.message : String(e) });
  }
}

export async function sendInAppNotification(payload: NotificationPayload): Promise<void> {
  try {
    await admin.firestore().collection('notifications').add({
      ...payload,
      isRead: false,
      date: new Date(),
    });
  } catch (e) {
    logger.error({ event: 'in_app_notification_failed', userId: payload.userId, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

/**
 * Get email transporter (lazy initialization)
 */
function getEmailTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!host || !port || !user || !pass) {
    return null;
  }
  
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmailNotification(toUserId: string, subject: string, text: string): Promise<void> {
  const transporter = getEmailTransporter();
  const from = process.env.SMTP_FROM;
  if (!transporter || !from) return;
  
  try {
    const userDoc = await admin.firestore().collection('users').doc(toUserId).get();
    const email = (userDoc.data() as any)?.email;
    if (!email) return;
    
    await withRetry(
      () => transporter.sendMail({ from, to: email, subject, text }),
      { maxRetries: 2, operationName: 'sendEmailNotification' }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logger.error({ event: 'email_notification_failed', userId: toUserId, error });
    await saveToDeadLetter({
      type: 'email',
      payload: { toUserId, subject, text },
      error,
      timestamp: new Date(),
      retryCount: 0,
    });
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const transporter = getEmailTransporter();
  const from = process.env.SMTP_FROM;
  if (!transporter || !from) return;
  
  try {
    await withRetry(
      () => transporter.sendMail({ from, to, subject, text }),
      { maxRetries: 2, operationName: 'sendEmail' }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logger.error({ event: 'email_send_failed', to, error });
    await saveToDeadLetter({
      type: 'email',
      payload: { to, subject, text },
      error,
      timestamp: new Date(),
      retryCount: 0,
    });
  }
}

export async function sendPushNotification(toUserId: string, title: string, body: string, link?: string): Promise<void> {
  try {
    const tokSnap = await admin.firestore().collection('deviceTokens').doc(toUserId).get();
    const tokens: string[] = (tokSnap.data() as any)?.tokens || [];
    if (!tokens.length) return;

    const expoTokens = tokens.filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
    const fcmTokens = tokens.filter((t) => !expoTokens.includes(t));

    // Send FCM notifications with retry
    if (fcmTokens.length) {
      try {
        const msg: admin.messaging.MulticastMessage = {
          tokens: fcmTokens,
          notification: { title, body },
          data: link ? { link } : undefined,
        };
        const response = await withRetry(
          () => admin.messaging().sendEachForMulticast(msg),
          { maxRetries: 2, operationName: 'sendFcmPush' }
        );
        
        // Log failures for investigation
        if (response.failureCount > 0) {
          logger.warn({
            event: 'fcm_partial_failure',
            userId: toUserId,
            successCount: response.successCount,
            failureCount: response.failureCount,
          });
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        logger.error({ event: 'fcm_push_failed', userId: toUserId, error });
        await saveToDeadLetter({
          type: 'push',
          payload: { toUserId, title, body, link, tokens: fcmTokens },
          error,
          timestamp: new Date(),
          retryCount: 0,
        });
      }
    }

    // Send Expo notifications with retry
    if (expoTokens.length) {
      await sendExpoPush(toUserId, expoTokens, title, body, link);
    }
  } catch (e) {
    logger.error({ event: 'push_notification_failed', userId: toUserId, error: e instanceof Error ? e.message : String(e) });
  }
}

async function sendExpoPush(userId: string, tokens: string[], title: string, body: string, link?: string): Promise<void> {
  try {
    const payload = tokens.map((token) => ({
      to: token,
      title,
      body,
      sound: 'default' as const,
      data: link ? { link } : undefined,
    }));
    
    await withRetry(
      () => axios.post('https://exp.host/--/api/v2/push/send', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }),
      { maxRetries: 2, operationName: 'sendExpoPush' }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logger.error({ event: 'expo_push_failed', userId, error });
    await saveToDeadLetter({
      type: 'expo',
      payload: { userId, tokens, title, body, link },
      error,
      timestamp: new Date(),
      retryCount: 0,
    });
  }
}
