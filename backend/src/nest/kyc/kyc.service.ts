import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import axios from 'axios';
import FormData from 'form-data';
import { createHash, createHmac } from 'crypto';
import { getKycStatus, clean, toPublicKycResult } from '../../core/kyc';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  private normalizeDocumentNumber(value: string | undefined): string {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  // HMAC-SHA256 with server secret makes the hash infeasible to brute-force without the key
  private hmacSha256(value: string): string {
    const secret = process.env.KYC_HMAC_SECRET;
    if (!secret) {
      // Fallback to plain SHA256 if secret is not configured (logs a warning on first use)
      this.logger.warn('[KYC] KYC_HMAC_SECRET not set; falling back to plain SHA256 for document index');
      return createHash('sha256').update(value).digest('hex');
    }
    return createHmac('sha256', secret).update(value).digest('hex');
  }

  async verifyIdDocument(uid: string, frontFile: Express.Multer.File, backFile: Express.Multer.File) {
    if (!uid) throw new UnauthorizedException('Authentication required');

    const userRef = admin.firestore().collection('users').doc(uid);
    const statusRef = userRef.collection('kyc').doc('status');
    const currentStatus = String((await statusRef.get()).data()?.status || '').toUpperCase();
    if (currentStatus === 'VERIFIED') {
      throw new BadRequestException({ code: 'kyc/already-verified' });
    }

    const apiKey = process.env.DIDIT_API_KEY;
    const baseUrl = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
    const preferredCharacters = String(process.env.DIDIT_PREFERRED_CHARACTERS || 'non_latin').toLowerCase();

    if (!apiKey) {
      throw new HttpException('KYC verification is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Set initial PENDING status
    const pendingAt = new Date();
    const pendingBatch = admin.firestore().batch();
    pendingBatch.set(statusRef, {
      status: 'PENDING',
      provider: 'didit',
      createdAt: pendingAt,
      updatedAt: pendingAt,
    });
    pendingBatch.set(userRef, {
      kyc: { status: 'PENDING', provider: 'didit', updatedAt: pendingAt },
    }, { merge: true });
    await pendingBatch.commit();

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
      form.append('preferred_characters', preferredCharacters === 'latin' ? 'latin' : 'non_latin');

      // Call Didit ID Verification API
      const response = await axios.post(
        `${baseUrl}/v3/id-verification/`,
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

      const rawDocumentNumber = verification.document_number || verification.personal_number;
      const normalizedDocumentNumber = this.normalizeDocumentNumber(rawDocumentNumber);
      const documentNumberHash = normalizedDocumentNumber ? this.hmacSha256(normalizedDocumentNumber) : undefined;
      const diditFullName = String(verification.full_name || '').trim();
      const fallbackJoinedName = [verification.first_name, verification.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const verifiedName = diditFullName || fallbackJoinedName || undefined;

      if (status === 'VERIFIED' && documentNumberHash) {
        const indexRef = admin.firestore().collection('kycDocumentIndex').doc(documentNumberHash);
        await admin.firestore().runTransaction(async (tx) => {
          const idxSnap = await tx.get(indexRef);
          if (idxSnap.exists) {
            const existingUid = String((idxSnap.data() as any)?.uid || '');
            if (existingUid && existingUid !== uid) {
              throw new BadRequestException({ code: 'kyc/document-already-used' });
            }
          }
          tx.set(indexRef, {
            uid,
            provider: 'didit',
            updatedAt: new Date(),
            createdAt: idxSnap.exists ? (idxSnap.data() as any)?.createdAt || new Date() : new Date(),
          }, { merge: true });
        });
      }

      // Store verification result
      const kycData = {
        status,
        provider: 'didit',
        referenceId: data.id || verification.id || undefined,
        documentNumberHash,
        verifiedName: status === 'VERIFIED' ? verifiedName : undefined,
        updatedAt: new Date(),
      };

      const resultBatch = admin.firestore().batch();
      resultBatch.set(statusRef, clean(kycData));
      resultBatch.set(userRef, {
        kyc: {
          status,
          provider: 'didit',
          updatedAt: new Date(),
        },
      }, { merge: true });
      await resultBatch.commit();

      return toPublicKycResult(kycData);
    } catch (error: any) {
      this.logger.error(`[KYC] ID verification failed: ${error.response?.data || error.message}`);

      const exceptionResponse = error instanceof HttpException ? error.getResponse() : null;
      const exceptionCode =
        typeof exceptionResponse === 'object' && exceptionResponse
          ? (exceptionResponse as any).code
          : null;
      const failedData = {
        status: 'FAILED',
        provider: 'didit',
        reason: exceptionCode || error.response?.data?.message || error.message || 'Verification failed',
        updatedAt: new Date(),
      };

      const failureBatch = admin.firestore().batch();
      failureBatch.set(statusRef, failedData);
      failureBatch.set(userRef, {
        kyc: { status: 'FAILED', provider: 'didit', updatedAt: failedData.updatedAt },
      }, { merge: true });
      await failureBatch.commit();

      if (error instanceof HttpException) throw error;
      throw new HttpException(failedData.reason, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
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

  async devVerify(uid: string | null, vendor: string | null) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const now = new Date();
    if (uid) {
      await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set({
        status: 'VERIFIED',
        provider: 'dev',
        referenceId: 'dev-local',
        updatedAt: now,
      });
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
    const cancelBatch = admin.firestore().batch();
    cancelBatch.set(statusRef, {
      status: 'CANCELLED',
      provider,
      updatedAt: now,
      cancelledAt: now,
    });
    cancelBatch.set(admin.firestore().collection('users').doc(uid), {
      kyc: { status: 'CANCELLED', provider, updatedAt: now },
    }, { merge: true } as any);
    await cancelBatch.commit();
    return { ok: true, status: 'CANCELLED' };
  }


  /**
   * Submit KYC via Firebase Storage download URLs (authenticated, post-signup flow).
   * Downloads the images from Firebase Storage and calls the Didit ID-verification API.
   */
  async submitFromUrls(
    uid: string,
    params: { fullName: string; nationalId?: string; idFrontUrl: string; idBackUrl: string },
  ) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const { idFrontUrl, idBackUrl } = params;
    if (!idFrontUrl || !idBackUrl) throw new BadRequestException('Both idFrontUrl and idBackUrl are required');

    const validateStorageUrl = (url: string) => {
      try {
        const parsed = new URL(url);
        const validHosts = ['storage.googleapis.com', 'firebasestorage.googleapis.com'];
        if (!validHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
          throw new BadRequestException('Image URL must be a Firebase Storage URL');
        }
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('Invalid image URL');
      }
    };
    validateStorageUrl(idFrontUrl);
    validateStorageUrl(idBackUrl);

    const downloadAsFile = async (url: string, fieldname: string): Promise<Express.Multer.File> => {
      // maxRedirects:0 prevents SSRF via open-redirect chains: the URL was already
      // validated as a Firebase Storage host above, so no legitimate redirect should occur.
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 20_000, maxRedirects: 0 });
      const contentType = String(resp.headers['content-type'] || 'image/jpeg');
      const ext = contentType.split('/')[1]?.split(';')[0]?.trim() || 'jpg';
      const buffer = Buffer.from(resp.data as ArrayBuffer);
      return {
        fieldname,
        originalname: `${fieldname}.${ext}`,
        encoding: '7bit',
        mimetype: contentType,
        buffer,
        size: buffer.length,
      } as Express.Multer.File;
    };

    const [frontFile, backFile] = await Promise.all([
      downloadAsFile(idFrontUrl, 'front'),
      downloadAsFile(idBackUrl, 'back'),
    ]);

    return this.verifyIdDocument(uid, frontFile, backFile);
  }

}
