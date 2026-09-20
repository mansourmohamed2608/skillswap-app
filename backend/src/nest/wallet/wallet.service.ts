import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { createGeideaTokenPurchaseSession } from '../../core/payments';
import { saveTokenTransactionRecord, saveWishContributionRecord } from '../../core/postgres';
import { sendInAppNotification } from '../../core/notifications';
import { logger } from '../../core/logger';
import { createHash } from 'crypto';

/**
 * Token/Wallet Service
 * Manages user token balance, purchases, and wish contributions.
 * Platform takes 10% commission on wish contributions, 90% goes to wish.
 */
@Injectable()
export class WalletService {
  /**
   * Get current user's token balance
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new NotFoundException('User not found');
    const balance = Number(userSnap.get('tokenBalance') || 0);
    return { balance };
  }

  /**
   * Create a token purchase session
   * User specifies amount of tokens to buy, Geidea payment is initiated
   */
  async createTokenPurchaseSession(userId: string, body: any) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    const { tokenAmount, currency } = body || {};
    const tokens = Number(tokenAmount || 0);
    if (!Number.isSafeInteger(tokens) || !(tokens > 0)) throw new BadRequestException('Invalid token amount');
    if (tokens > 100000) throw new BadRequestException('Token amount exceeds maximum (100,000)');

    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new NotFoundException('User not found');

    const userEmail = String(userSnap.get('email') || '').trim();
    const userName = String(userSnap.get('name') || '').trim();
    const curr = String(currency || 'EGP').toUpperCase();
    if (!['EGP', 'SAR'].includes(curr)) throw new BadRequestException('Unsupported token purchase currency');

    // Call payment gateway to initiate token purchase
    // 1 token = 1 currency unit (e.g., 100 tokens = EGP 100)
    const { paymentUrl, sessionId } = await createGeideaTokenPurchaseSession({
      tokenAmount: tokens,
      amount: tokens, // In real scenario, may have different pricing
      currency: curr,
      userId,
      userEmail,
      userName,
    });

    // Create pending transaction record
    const now = new Date();
    const transactionRef = admin.firestore().collection('tokenTransactions').doc();
    await transactionRef.set({
      userId,
      type: 'PURCHASE',
      tokenAmount: tokens,
      amount: tokens,
      currency: curr,
      status: 'PENDING',
      geideaSessionId: sessionId,
      createdAt: now,
      updatedAt: now,
    });

    // Save to PostgreSQL audit log
    await saveTokenTransactionRecord({
      transactionId: transactionRef.id,
      userId,
      type: 'PURCHASE',
      tokenAmount: tokens,
      amount: tokens,
      currency: curr,
      status: 'PENDING',
      geideaSessionId: sessionId,
      createdAt: now,
    });

    return { paymentUrl, sessionId, transactionId: transactionRef.id };
  }

  /**
   * Complete token purchase after payment success
   * Called by payment webhook handler
   */
  async completeTokenPurchase(geideaSessionId: string, status: 'SUCCESS' | 'FAILED' | 'CANCELLED') {
    // Find transaction by sessionId
    const snap = await admin.firestore()
      .collection('tokenTransactions')
      .where('geideaSessionId', '==', geideaSessionId)
      .where('type', '==', 'PURCHASE')
      .limit(1)
      .get();

    if (snap.empty) {
      logger.warn({ geideaSessionId, event: 'token_purchase_not_found' }, 'Token purchase transaction not found');
      throw new NotFoundException('Transaction not found');
    }

    const transactionDoc = snap.docs[0];
    const transaction = transactionDoc.data() as any;
    const userId = transaction.userId;
    const tokenAmount = transaction.tokenAmount;

    if (status === 'SUCCESS') {
      // Add tokens to user balance
      const userRef = admin.firestore().collection('users').doc(userId);
      await userRef.update({
        tokenBalance: admin.firestore.FieldValue.increment(tokenAmount),
      });

      // Update transaction status
      await transactionDoc.ref.update({
        status: 'SUCCESS',
        updatedAt: new Date(),
      });

      // Update PostgreSQL audit
      await saveTokenTransactionRecord({
        transactionId: transactionDoc.id,
        userId,
        type: 'PURCHASE',
        tokenAmount,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'SUCCESS',
        geideaSessionId,
        createdAt: transaction.createdAt,
      });

      // Send notification
      await sendInAppNotification({
        userId,
        type: 'system',
        content: `You've successfully purchased ${tokenAmount} tokens!`,
        link: '/wallet',
      });

      logger.info({ userId, tokenAmount, event: 'token_purchase_success' }, 'Token purchase completed');
    } else {
      // Mark as failed
      await transactionDoc.ref.update({
        status: 'FAILED',
        updatedAt: new Date(),
      });

      await saveTokenTransactionRecord({
        transactionId: transactionDoc.id,
        userId,
        type: 'PURCHASE',
        tokenAmount,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'FAILED',
        geideaSessionId,
        createdAt: transaction.createdAt,
      });
    }
  }

  /**
   * Contribute tokens to a wish
   * 10% platform fee, 90% goes to wish owner
   */
  async contributeToWish(userId: string, body: any) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    const { wishId, tokenAmount, idempotencyKey } = body || {};
    const tokens = Number(tokenAmount || 0);
    const requestKey = String(idempotencyKey || '').trim();

    if (!wishId) throw new BadRequestException('Missing wishId');
    if (!Number.isSafeInteger(tokens) || !(tokens > 0)) throw new BadRequestException('Invalid token amount');
    if (tokens > 100000) throw new BadRequestException('Token amount exceeds maximum (100,000)');
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(requestKey)) {
      throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid idempotency key is required' });
    }

    const platformFee = Math.floor(tokens * 0.1); // 10% commission
    const contributionAmount = tokens - platformFee; // 90% to wish
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const wishRef = db.collection('wishes').doc(String(wishId));
    const contributionId = createHash('sha256').update(`${userId}:${requestKey}`).digest('hex');
    const contributionRef = db.collection('wishContributions').doc(contributionId);
    const now = new Date();

    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(contributionRef);
      if (existing.exists) {
        const previous = existing.data() as any;
        if (previous.wishId !== wishId || Number(previous.tokenAmount) !== tokens) {
          throw new BadRequestException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key was already used for another contribution' });
        }
        return { duplicate: true, wish: { title: previous.wishTitle }, wishOwnerId: previous.wishOwnerId };
      }

      const [userSnap, wishSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(wishRef),
      ]);
      if (!userSnap.exists) throw new NotFoundException('User not found');
      if (!wishSnap.exists) throw new NotFoundException('Wish not found');
      const wish = wishSnap.data() as any;
      if (String(wish?.status || '').toLowerCase() !== 'open') throw new BadRequestException('Wish is not open for contributions');
      const wishOwnerId = String(wish?.userId || '').trim();
      if (!wishOwnerId) throw new BadRequestException('Wish owner is unavailable');
      if (userId === wishOwnerId) throw new ForbiddenException('Cannot contribute to your own wish');
      const wishOwnerRef = db.collection('users').doc(wishOwnerId);
      const wishOwnerSnap = await transaction.get(wishOwnerRef);
      if (!wishOwnerSnap.exists) throw new BadRequestException('Wish owner is unavailable');
      const userBalance = Number(userSnap.get('tokenBalance') || 0);
      if (userBalance < tokens) throw new BadRequestException({ code: 'INSUFFICIENT_BALANCE', message: 'Insufficient token balance' });

      transaction.update(userRef, {
        tokenBalance: userBalance - tokens,
        totalTokensContributed: admin.firestore.FieldValue.increment(contributionAmount),
        contributionCount: admin.firestore.FieldValue.increment(1),
      });
      transaction.update(wishOwnerRef, { tokenBalance: admin.firestore.FieldValue.increment(contributionAmount) });
      transaction.update(wishRef, {
        totalDonated: admin.firestore.FieldValue.increment(contributionAmount),
        donationCount: admin.firestore.FieldValue.increment(1),
      });
      transaction.create(contributionRef, {
        wishId,
        wishTitle: wish.title || null,
        wishOwnerId,
        contributorId: userId,
        tokenAmount: tokens,
        platformFee,
        contributionAmount,
        status: 'COMPLETED',
        idempotencyKeyHash: createHash('sha256').update(requestKey).digest('hex'),
        createdAt: now,
      });
      return { duplicate: false, wish, wishOwnerId };
    });

    if (result.duplicate) {
      return {
        contributionId,
        tokenAmount: tokens,
        platformFee,
        contributionAmount,
        wishTitle: result.wish?.title,
        duplicate: true,
      };
    }

    const wish = result.wish as any;
    const wishOwnerId = result.wishOwnerId;

    // Save to PostgreSQL audit
    await saveWishContributionRecord({
      contributionId,
      wishId,
      contributorId: userId,
      tokenAmount: tokens,
      platformFee,
      contributionAmount,
      status: 'COMPLETED',
      createdAt: now,
    });

    // Send notifications
    await sendInAppNotification({
      userId,
      type: 'system',
      content: `You've contributed ${contributionAmount} tokens to: ${wish.title}`,
      link: `/wishes/${wishId}`,
    });

    await sendInAppNotification({
      userId: wishOwnerId,
      type: 'system',
      content: `Someone contributed ${contributionAmount} tokens to your wish: ${wish.title}`,
      link: `/wishes/${wishId}`,
    });

    logger.info(
      { userId, wishId, tokenAmount, platformFee, contributionAmount, event: 'wish_contribution' },
      'Wish contribution completed'
    );

    return {
      contributionId,
      tokenAmount: tokens,
      platformFee,
      contributionAmount,
      wishTitle: wish.title,
      duplicate: false,
    };
  }

  /**
   * Get top contributors to all wishes (public thank-you section)
   */
  async getTopContributors(limit = 10): Promise<any[]> {
    const lim = Math.min(50, Math.max(1, Number(limit || 10)));

    const snap = await admin.firestore()
      .collection('wishContributions')
      .where('status', '==', 'COMPLETED')
      .orderBy('createdAt', 'desc')
      .limit(lim * 2) // Get extra to deduplicate by contributor
      .get();

    const seen = new Set<string>();
    const contributors: any[] = [];

    for (const doc of snap.docs) {
      const contribution = doc.data() as any;
      const contributorId = contribution.contributorId;

      if (seen.has(contributorId) || contributors.length >= lim) continue;
      seen.add(contributorId);

      try {
        const userSnap = await admin.firestore().collection('users').doc(contributorId).get();
        if (!userSnap.exists) continue;

        const user = userSnap.data() as any;
        contributors.push({
          contributorId,
          name: user.name || 'Anonymous',
          displayName: user.displayName || user.name || 'Anonymous',
          profileImage: user.profileImage || null,
          totalTokensContributed: Number(user.totalTokensContributed || 0),
          contributionCount: Number(user.contributionCount || 0),
          wishTitle: contribution.wishTitle,
          amount: contribution.contributionAmount,
          createdAt: contribution.createdAt,
        });
      } catch (e) {
        logger.warn({ contributorId, error: e }, 'Failed to fetch contributor details');
      }
    }

    return contributors;
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limit = 20) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');

    const lim = Math.min(100, Math.max(1, Number(limit || 20)));

    // Purchases
    const purchaseSnap = await admin.firestore()
      .collection('tokenTransactions')
      .where('userId', '==', userId)
      .where('type', '==', 'PURCHASE')
      .orderBy('createdAt', 'desc')
      .limit(lim)
      .get();

    // Contributions
    const contributionSnap = await admin.firestore()
      .collection('wishContributions')
      .where('contributorId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(lim)
      .get();

    const transactions = [
      ...purchaseSnap.docs.map((doc) => ({
        id: doc.id,
        type: 'PURCHASE',
        ...(doc.data() as any),
      })),
      ...contributionSnap.docs.map((doc) => ({
        id: doc.id,
        type: 'CONTRIBUTION',
        ...(doc.data() as any),
      })),
    ].sort((a, b) => {
      const aTime = a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    });

    return transactions.slice(0, lim);
  }
}
