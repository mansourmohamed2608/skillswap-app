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

      // Check if recipient has blocked the sender before writing anything.
      const blockSnap = await admin.firestore()
        .collection('users').doc(recipientId)
        .collection('blockedUsers').doc(uid)
        .get().catch(() => null);
      if (blockSnap?.exists) throw new ForbiddenException('This user is not available for messaging');

      const text = String(payload?.text || '').trim();
      if (!text) throw new BadRequestException('Missing text');
      if (text.length > 5000) throw new BadRequestException('Message too long (max 5000 characters)');
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

  // In-process TTL cache: avoids N+1 Firestore queries for repeated username lookups.
  // TTL is 5 minutes — stale after a username change, acceptable for internal routing.
  private readonly uidCache = new Map<string, { uid: string; expiresAt: number }>();

  private async resolveRecipientUid(identifier: string): Promise<string> {
    const raw = String(identifier || '').trim();
    if (!raw) throw new BadRequestException('Missing recipientId');

    // Check TTL cache first (works for both UID and username inputs)
    const now = Date.now();
    const cached = this.uidCache.get(raw);
    if (cached && cached.expiresAt > now) return cached.uid;

    const resolved = await this._resolveRecipientUidUncached(raw);
    this.uidCache.set(raw, { uid: resolved, expiresAt: now + 5 * 60 * 1000 });
    return resolved;
  }

  private async _resolveRecipientUidUncached(raw: string): Promise<string> {
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

    // Query all four username/profile paths in parallel to avoid N+1 round-trips.
    const [byUsernameLower, byUsername, byUserUsernameLower, byUserUsername] = await Promise.allSettled([
      admin.firestore().collection('publicProfiles').where('usernameLower', '==', usernameLower).limit(1).get(),
      admin.firestore().collection('publicProfiles').where('username', '==', raw).limit(1).get(),
      admin.firestore().collection('users').where('profile.usernameLower', '==', usernameLower).limit(1).get(),
      admin.firestore().collection('users').where('profile.username', '==', raw).limit(1).get(),
    ]);

    if (byUsernameLower.status === 'fulfilled' && !byUsernameLower.value.empty) return byUsernameLower.value.docs[0].id;
    if (byUsername.status === 'fulfilled' && !byUsername.value.empty) return byUsername.value.docs[0].id;
    if (byUserUsernameLower.status === 'fulfilled' && !byUserUsernameLower.value.empty) return byUserUsernameLower.value.docs[0].id;
    if (byUserUsername.status === 'fulfilled' && !byUserUsername.value.empty) return byUserUsername.value.docs[0].id;

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
      } catch {
        // Ignore fallback lookup failures and continue with other strategies.
      }

      // Last-resort compatibility for synthetic identifiers like member-<suffix>.
      if (fallbackNameSlug === 'member') {
        try {
          const sample = await admin.firestore().collection('users').limit(2000).get();
          if (!sample.empty) {
            const hit = sample.docs.find((doc) => String(doc.id || '').toLowerCase().endsWith(fallbackUidSuffix));
            if (hit) return hit.id;
          }
        } catch {
          // Ignore broad scan failures and continue to final not-found response.
        }
      }
    }

    throw new BadRequestException('Recipient not found');
  }
}
