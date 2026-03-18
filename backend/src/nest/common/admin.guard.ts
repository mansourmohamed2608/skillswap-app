import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Ensures the authenticated user (set by FirebaseAuthGuard) holds the 'admin' role.
 * Must be applied after FirebaseAuthGuard so that req.user.uid is already populated.
 * Uses a short-lived in-process TTL cache to avoid a Firestore read on every request.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  // Static shared cache so AdminService.updateUserRole can invalidate it via AdminGuard.invalidate()
  private static readonly sharedCache = new Map<string, number>(); // uid → expiresAt ms
  private static readonly TTL_MS = 5 * 1000; // 5 seconds to match AdminService cache TTL

  /** Called by AdminService when a user's role is updated to ensure the guard cache is cleared. */
  static invalidate(uid: string): void {
    AdminGuard.sharedCache.delete(uid);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest();
    const uid: string | undefined = req?.user?.uid;
    if (!uid) throw new ForbiddenException('Admin access required');

    const now = Date.now();
    const cached = AdminGuard.sharedCache.get(uid);
    if (cached && cached > now) return true;

    const snap = await admin.firestore().collection('users').doc(uid).get();
    const role = (snap.data() as any)?.role;
    if (role !== 'admin') throw new ForbiddenException('Admin access required');

    AdminGuard.sharedCache.set(uid, now + AdminGuard.TTL_MS);
    return true;
  }
}
