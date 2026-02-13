import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { canSendMessage, getUserDocument, incrementMessageCount } from '../../core/membership';
import { sendEmailNotification, sendInAppNotification, sendPushNotification } from '../../core/notifications';
import { findBannedKeywordInFields } from '../../core/moderation-utils';

type SendMessagePayload = {
  recipientId?: string;
  text?: string;
};

const conversationIdFor = (a: string, b: string) => [a, b].sort().join('_');

@Injectable()
export class ChatService {
  async sendMessage(uid: string, payload: SendMessagePayload) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const recipientId = String(payload?.recipientId || '').trim();
    if (!recipientId) throw new BadRequestException('Missing recipientId');
    if (recipientId === uid) throw new BadRequestException('Cannot message yourself');
    const text = String(payload?.text || '').trim();
    if (!text) throw new BadRequestException('Missing text');
    const banned = await findBannedKeywordInFields([{ label: 'text', value: text }]);
    if (banned) throw new BadRequestException({ code: 'content/banned', field: banned.field });

    const userSnap = await getUserDocument(uid);
    this.ensureKycVerified(userSnap);
    const membership = userSnap.get('membership');
    const check = canSendMessage(membership);
    if (!check.allowed) throw new ForbiddenException(check.reason || 'Messaging not allowed');

    const convId = conversationIdFor(uid, recipientId);
    const now = Date.now();
    const db = admin.database();
    const convRef = db.ref(`conversations/${convId}`);

    await convRef.update({
      participants: { [uid]: true, [recipientId]: true },
      lastMessage: text,
      lastMessageAt: now,
      updatedAt: now,
    });

    await db.ref(`userConversations/${uid}`).update({ [convId]: true });
    await db.ref(`userConversations/${recipientId}`).update({ [convId]: true });

    const msgRef = convRef.child('messages').push();
    await msgRef.set({ senderId: uid, text, createdAt: now });
    await convRef.child(`perUserLastReadAt/${uid}`).set(now);
    await incrementMessageCount(uid);

    try {
      await sendInAppNotification({
        userId: recipientId,
        type: 'message',
        content: 'New message received',
        link: `/chat/${uid}`,
      });
      await sendPushNotification(recipientId, 'New message', 'You have a new message.', `/chat/${uid}`);
      await sendEmailNotification(recipientId, 'New message', 'You have a new message on SkillSwap.');
    } catch (e) {
      console.warn('Failed to send message notifications', e);
    }

    return { conversationId: convId, messageId: msgRef.key };
  }

  async markRead(uid: string, conversationId: string) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const convId = String(conversationId || '').trim();
    if (!convId) throw new BadRequestException('Missing conversationId');

    const db = admin.database();
    const participantsSnap = await db.ref(`conversations/${convId}/participants/${uid}`).get();
    if (!participantsSnap.exists()) throw new ForbiddenException('Not a participant');

    const now = Date.now();
    await db.ref(`conversations/${convId}/perUserLastReadAt/${uid}`).set(now);
    return { success: true };
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }
}
