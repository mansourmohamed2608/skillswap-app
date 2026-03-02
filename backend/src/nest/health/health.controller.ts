import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Controller('health')
export class HealthController {
  @Get()
  async getHealth() {
    const checks: Record<string, string> = {};
    let allOk = true;

    // Firestore connectivity
    try {
      await admin.firestore().collection('_health').doc('ping').get();
      checks.firestore = 'ok';
    } catch (e: any) {
      checks.firestore = `error: ${e?.message ?? 'unknown'}`;
      allOk = false;
    }

    // Firebase Auth connectivity
    try {
      // Lightweight list: just verifying the SDK is connected
      await admin.auth().listUsers(1);
      checks.auth = 'ok';
    } catch (e: any) {
      checks.auth = `error: ${e?.message ?? 'unknown'}`;
      allOk = false;
    }

    const result = { ok: allOk, ts: Date.now(), checks };
    if (!allOk) throw new ServiceUnavailableException(result);
    return result;
  }
}

