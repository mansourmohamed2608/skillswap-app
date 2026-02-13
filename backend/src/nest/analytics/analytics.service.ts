import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AnalyticsService {
  async recordEvent(userId: string, body: any) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    const { name, properties } = body || {};
    if (!name || typeof name !== 'string') {
      throw new BadRequestException('Missing event name');
    }
    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();
    await admin.firestore().collection('analytics_events').add({
      userId,
      name,
      properties: properties && typeof properties === 'object' ? properties : {},
      createdAt: createdAtVal,
    });
    return { success: true };
  }
}
