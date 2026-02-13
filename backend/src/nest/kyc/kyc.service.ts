import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import axios from 'axios';
import FormData from 'form-data';
import { getKycStatus, handleDiditWebhook, KycPayload, clean, fetchDiditDecision } from '../../core/kyc';
import { findBannedKeywordInFields } from '../../core/moderation-utils';
const IS_EMULATOR = Boolean(
  process.env.FUNCTIONS_EMULATOR ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIREBASE_EMULATOR_HUB
);

@Injectable()
export class KycService {
  async verifyIdDocument(uid: string, frontFile: Express.Multer.File, backFile: Express.Multer.File) {
    if (!uid) throw new UnauthorizedException('Authentication required');

    const apiKey = process.env.DIDIT_API_KEY;
    const baseUrl = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';

    if (!apiKey) {
      throw new HttpException('KYC verification is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Set initial PENDING status
    await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set({
      status: 'PENDING',
      provider: 'didit',
      createdAt: new Date(),
    }, { merge: true });

    try {
      // Prepare multipart form data
      const form = new FormData();
      form.append('front_image', frontFile.buffer, {
        filename: frontFile.originalname,
        contentType: frontFile.mimetype,
      });
      form.append('back_image', backFile.buffer, {
        filename: backFile.originalname,
        contentType: backFile.mimetype,
      });

      // Optional: Specify Egypt National ID
      form.append('issuing_country', 'EGY');
      form.append('document_type', 'Identity Card');

      // Call Didit ID Verification API
      const response = await axios.post(
        `${baseUrl}/v2/id-verification/`,
        form,
        {
          headers: {
            'x-api-key': apiKey,
            ...form.getHeaders(),
          },
          timeout: 30000,
        },
      );

      const data = response.data;
      const verification = data?.id_verification || {};

      // Map Didit status to our status
      const diditStatus = verification.status || 'Not Finished';
      let status: 'VERIFIED' | 'FAILED' | 'PENDING' | 'IN_REVIEW';
      
      if (diditStatus === 'Approved') {
        status = 'VERIFIED';
      } else if (diditStatus === 'Declined') {
        status = 'FAILED';
      } else if (diditStatus === 'In Review') {
        status = 'IN_REVIEW';
      } else {
        status = 'PENDING';
      }

      // Store verification result
      const kycData = {
        status,
        provider: 'didit',
        referenceId: data.id || verification.id || undefined,
        documentType: verification.document_type,
        documentNumber: verification.document_number || verification.personal_number,
        firstName: verification.first_name,
        lastName: verification.last_name,
        birthDate: verification.birth_date,
        expirationDate: verification.expiration_date,
        verifiedName: verification.first_name && verification.last_name 
          ? `${verification.first_name} ${verification.last_name}`.trim()
          : undefined,
        updatedAt: new Date(),
      };

      await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set(
        clean(kycData),
        { merge: true }
      );

      // Also update user document with KYC status
      await admin.firestore().collection('users').doc(uid).set({
        kyc: {
          status,
          provider: 'didit',
          updatedAt: new Date(),
        },
      }, { merge: true });

      return kycData;
    } catch (error: any) {
      console.error('[KYC] ID verification failed:', error.response?.data || error.message);

      const failedData = {
        status: 'FAILED',
        provider: 'didit',
        reason: error.response?.data?.message || error.message || 'Verification failed',
        updatedAt: new Date(),
      };

      await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set(
        failedData,
        { merge: true }
      );

      throw new HttpException(
        failedData.reason,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  async status(uid: string | null, vendor: string | null) {
    if (uid) {
      const result = await getKycStatus(uid);
      return result;
    }
    if (vendor) {
      const snap = await admin.firestore().collection('kyc_temp').doc(vendor).get();
      return snap.exists ? snap.data() : null;
    }
    throw new BadRequestException('Missing vendor or auth token');
  }

  async finalize(uid: string, vendor: string) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    if (!vendor) throw new BadRequestException('Missing vendor');
    const tempRef = admin.firestore().collection('kyc_temp').doc(String(vendor));
    const snap = await tempRef.get();
    if (!snap.exists) throw new NotFoundException('KYC temp record not found');
    const data = (snap.data() || {}) as any;
    const status = String(data.status || '').toUpperCase();
    if (status !== 'VERIFIED') throw new ForbiddenException('KYC not VERIFIED');

    const update: any = {
      status: 'VERIFIED',
      provider: data.provider || 'didit',
      referenceId: data.referenceId || undefined,
      updatedAt: new Date(),
    };
    await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set(update, { merge: true } as any);

    if (data.referenceId) {
      await admin.firestore().collection('kycReferences').doc(String(data.referenceId)).set({
        uid,
        provider: update.provider,
        boundAt: new Date(),
      }, { merge: true });
    }

    await tempRef.delete();
    return { success: true };
  }

  async sync(sessionId: string, targetUid: string, opts: { isAdmin: boolean; callerUid: string }) {
    if (!targetUid) throw new UnauthorizedException('Authentication required');
    // Throttle self-service requests to once per 30s per session
    if (!opts.isAdmin) {
      const statusSnap = await admin.firestore().collection('users').doc(targetUid).collection('kyc').doc('status').get();
      const lastSyncAtRaw = (statusSnap.data() as any)?.lastSyncAt;
      const lastSyncAt = lastSyncAtRaw?.toDate ? lastSyncAtRaw.toDate() : (lastSyncAtRaw instanceof Date ? lastSyncAtRaw : null);
      if (lastSyncAt && (Date.now() - lastSyncAt.getTime()) < 30_000) {
        throw new HttpException('Please wait before syncing again', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const r = await fetchDiditDecision(sessionId);
    const data = r.data;
    if (r.status < 200 || r.status >= 300) throw new BadRequestException(data || 'decision_error');
    const decisionVendorRaw =
      data?.vendor_data ||
      data?.vendorData ||
      data?.vendor ||
      data?.session?.vendor_data ||
      data?.session?.vendorData ||
      data?.session?.vendor;
    const decisionVendor = typeof decisionVendorRaw === 'string' ? decisionVendorRaw : undefined;
    let matchesRef = false;
    let matchesDecision = false;
    // Ownership check for self-service
    if (!opts.isAdmin) {
      const refSnap = await admin.firestore().collection('kycReferences').doc(sessionId).get();
      const refData = (refSnap.data() || {}) as any;
      const refUid = refData.uid || refData.vendor;
      matchesRef = Boolean(refSnap.exists && refUid && refUid === targetUid);
      matchesDecision = Boolean(decisionVendor && decisionVendor === targetUid);
      if (!matchesRef && !matchesDecision) {
        if (!IS_EMULATOR) {
          throw new ForbiddenException('Session does not belong to user');
        }
        console.warn('[kyc.sync] bypassing ownership check in emulator', {
          sessionId,
          targetUid,
          refUid: refUid || null,
          decisionVendor: decisionVendor || null,
        });
      }
    }
    const raw = String(data?.status || '').toLowerCase();
    const mapped =
      raw.includes('approved') || raw.includes('verified') ? 'VERIFIED' :
      (raw.includes('declined') || raw.includes('rejected') || raw.includes('failed')) ? 'FAILED' :
      'PENDING';
    const now = new Date();
    if (!opts.isAdmin && matchesDecision && !matchesRef) {
      await admin.firestore().collection('kycReferences').doc(sessionId).set({
        uid: targetUid,
        provider: 'didit',
        boundAt: now,
      }, { merge: true } as any);
    }
    const update = {
      status: mapped,
      provider: 'didit',
      referenceId: sessionId,
      updatedAt: now,
      ...(data?.reason ? { reason: data.reason } : {}),
    };
    await admin.firestore().collection('users').doc(targetUid).collection('kyc').doc('status').set({
      ...update,
      lastSyncAt: now,
    }, { merge: true });
    await admin.firestore().collection('users').doc(targetUid).set({
      kyc: { status: mapped, provider: 'didit', referenceId: sessionId, updatedAt: now },
    }, { merge: true } as any);

    return { ok: true, mapped, raw: data };
  }

  async devVerify(uid: string | null, vendor: string | null) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const now = new Date();
    if (uid) {
      await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set({
        status: 'VERIFIED',
        provider: 'dev',
        referenceId: 'dev-local',
        updatedAt: now,
      }, { merge: true } as any);
      await admin.firestore().collection('users').doc(uid).set({
        kyc: { status: 'VERIFIED', provider: 'dev', updatedAt: now },
      }, { merge: true });
    }
    if (vendor) {
      await admin.firestore().collection('kyc_temp').doc(String(vendor)).set({
        status: 'VERIFIED',
        provider: 'dev',
        updatedAt: now,
        vendor,
      }, { merge: true });
    }
    return { ok: true };
  }

  async cancel(uid: string) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const statusRef = admin.firestore().collection('users').doc(uid).collection('kyc').doc('status');
    const statusSnap = await statusRef.get();
    const current = String((statusSnap.data() as any)?.status || '').toUpperCase();
    if (current === 'VERIFIED') {
      throw new BadRequestException({ code: 'kyc/already-verified' });
    }
    const provider = String((statusSnap.data() as any)?.provider || 'didit');
    const now = new Date();
    await statusRef.set({
      status: 'CANCELLED',
      provider,
      updatedAt: now,
      cancelledAt: now,
    }, { merge: true } as any);
    await admin.firestore().collection('users').doc(uid).set({
      kyc: { status: 'CANCELLED', provider, updatedAt: now },
    }, { merge: true } as any);
    return { ok: true, status: 'CANCELLED' };
  }


  async webhook(rawBody: Buffer, headers: Record<string, any>) {
    if (!rawBody || !(rawBody instanceof Buffer)) throw new BadRequestException('Missing raw body');
    return handleDiditWebhook(rawBody, headers);
  }
}
