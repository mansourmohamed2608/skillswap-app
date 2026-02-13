import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest();
    const authHeader = (req.headers.authorization || '').toString();
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) throw new UnauthorizedException('Missing or invalid Authorization header');
    try {
      const decoded = await admin.auth().verifyIdToken(match[1]);
      req.user = decoded;
      (req as any).userClaims = decoded;
      (req as any).firebaseToken = match[1];
      const userSnap = await admin.firestore().collection('users').doc(decoded.uid).get();
      const status = (userSnap.data() as any)?.accountStatus || 'active';
      if (status !== 'active') {
        throw new ForbiddenException('Account is not active');
      }
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
