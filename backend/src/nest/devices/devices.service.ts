import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class DevicesService {
  async register(userId: string, token: string) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    if (!token) throw new BadRequestException('Missing token');
    const ref = admin.firestore().collection('deviceTokens').doc(userId);
    await ref.set({ tokens: admin.firestore.FieldValue.arrayUnion(token) }, { merge: true } as any);
    return { success: true };
  }
}
