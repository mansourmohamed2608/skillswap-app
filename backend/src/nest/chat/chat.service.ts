import { BadRequestException, ForbiddenException, HttpException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { canSendMessage, getUserDocument, incrementMessageCount } from '../../core/membership';
import { sendEmailNotification, sendInAppNotification, sendPushNotification } from '../../core/notifications';
import { findBannedKeywordInFields } from '../../core/moderation-utils';

type SendMessagePayload = {
  recipientId?: string;
  text?: string;
};

const conversationIdFor = (a: string, b: string) => [a, b].sort().join('_');
const UID_RE = /^[A-Za-z0-9]{20,}$/;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private async resolvePublicIdentifier(uid: string): Promise<string> {
    const rawUid = String(uid || '').trim();
    if (!rawUid) return '';
    try {
      const publicSnap = await admin.firestore().collection('publicProfiles').doc(rawUid).get();
      const publicData: any = publicSnap.exists ? publicSnap.data() || {} : {};
      const username = String(publicData?.username || '').trim();
      if (username) return username;
      const name = String(publicData?.name || '').trim();
      const suffix = rawUid.slice(-6).toLowerCase();
      if (name) {
        const slug = name
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-')
          .split('-')
          .slice(0, 4)
          .join('-')
          .slice(0, 64);
        if (slug) return `${slug}-${suffix}`;
      }
      return suffix ? `member-${suffix}` : rawUid;
    } catch {
      return rawUid;
    }
  }

  async sendMessage(uid: string, payload: SendMessagePayload) {
    try {
      if (!uid) throw new UnauthorizedException('Authentication required');
      const recipientInput = String(payload?.recipientId || '').trim();
      if (!recipientInput) throw new BadRequestException('Missing recipientId');
      const recipientId = await this.resolveRecipientUid(recipientInput);
      if (recipientId === uid) throw new BadRequestException('Cannot message yourself');
      const text = String(payload?.text || '').trim();
      if (!text) throw new BadRequestException('Missing text');
      const banned = await findBannedKeywordInFields([{ label: 'text', value: text }]);
      if (banned) throw new BadRequestException({ code: 'content/banned', field: banned.field });

      let userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
      try {
        userSnap = await getUserDocument(uid);
      } catch {
        throw new ForbiddenException('Complete your profile to use chat');
      }
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
      try {
        await incrementMessageCount(uid);
      } catch (e) {
        // Message was already persisted; do not fail the request on quota-counter write issues.
        this.logger.warn(`[Chat] Failed to increment message count for uid=${uid}: ${(e as any)?.message || e}`);
      }

      try {
        const senderIdentifier = await this.resolvePublicIdentifier(uid);
        await sendInAppNotification({
          userId: recipientId,
          type: 'message',
          content: 'New message received',
          link: `/chat/${senderIdentifier || uid}`,
        });
        await sendPushNotification(recipientId, 'New message', 'You have a new message.', `/chat/${senderIdentifier || uid}`);
        await sendEmailNotification(recipientId, 'New message', 'You have a new message on SkillSwap.');
      } catch (e) {
        this.logger.warn(`Failed to send message notifications: ${(e as any)?.message || e}`);
      }

      return { conversationId: convId, messageId: msgRef.key };
    } catch (error: any) {
      if (error instanceof HttpException || typeof error?.getStatus === 'function') throw error;
      this.logger.error(`[Chat] sendMessage failed uid=${uid} recipient=${String(payload?.recipientId || '').trim()}: ${error?.message || error}`);
      throw new ServiceUnavailableException('Unable to send message right now');
    }
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

  private async resolveRecipientUid(identifier: string): Promise<string> {
    const raw = String(identifier || '').trim();
    if (!raw) throw new BadRequestException('Missing recipientId');

    // Fast path for direct UID
    if (UID_RE.test(raw)) {
      const [userDoc, publicDoc] = await Promise.all([
        admin.firestore().collection('users').doc(raw).get().catch(() => null),
        admin.firestore().collection('publicProfiles').doc(raw).get().catch(() => null),
      ]);
      if (userDoc?.exists || publicDoc?.exists) return raw;
      throw new BadRequestException('Recipient not found');
    }

    const usernameLower = raw.toLowerCase();

    // Preferred lookup from synced public profile
    try {
      const byUsernameLower = await admin.firestore()
        .collection('publicProfiles')
        .where('usernameLower', '==', usernameLower)
        .limit(1)
        .get();
      if (!byUsernameLower.empty) return byUsernameLower.docs[0].id;
    } catch {}

    // Backward compatibility for older docs that store plain username
    try {
      const byUsername = await admin.firestore()
        .collection('publicProfiles')
        .where('username', '==', raw)
        .limit(1)
        .get();
      if (!byUsername.empty) return byUsername.docs[0].id;
    } catch {}

    try {
      const byUserUsernameLower = await admin.firestore()
        .collection('users')
        .where('profile.usernameLower', '==', usernameLower)
        .limit(1)
        .get();
      if (!byUserUsernameLower.empty) return byUserUsernameLower.docs[0].id;
    } catch {}

    try {
      const byUserUsername = await admin.firestore()
        .collection('users')
        .where('profile.username', '==', raw)
        .limit(1)
        .get();
      if (!byUserUsername.empty) return byUserUsername.docs[0].id;
    } catch {}

    // Fallback slug path: first-last-<uidSuffix>
    const fallbackSlugMatch = /^(.+)-([a-z0-9]{6})$/.exec(usernameLower);
    if (fallbackSlugMatch) {
      const fallbackNameSlug = fallbackSlugMatch[1];
      const fallbackUidSuffix = fallbackSlugMatch[2];
      try {
        const byNameSlug = await admin.firestore()
          .collection('publicProfiles')
          .where('nameSlug', '==', fallbackNameSlug)
          .limit(20)
          .get();
        if (!byNameSlug.empty) {
          const hit = byNameSlug.docs.find((d) => d.id.toLowerCase().endsWith(fallbackUidSuffix)) || byNameSlug.docs[0];
          if (hit) return hit.id;
        }
      } catch {}

      // Last-resort compatibility for synthetic identifiers like member-<suffix>.
      if (fallbackNameSlug === 'member') {
        try {
          const sample = await admin.firestore().collection('users').limit(2000).get();
          if (!sample.empty) {
            const hit = sample.docs.find((doc) => String(doc.id || '').toLowerCase().endsWith(fallbackUidSuffix));
            if (hit) return hit.id;
          }
        } catch {}
      }
    }

    throw new BadRequestException('Recipient not found');
  }
}
