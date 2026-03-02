import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import Busboy from 'busboy';
import * as admin from 'firebase-admin';
import { FinalizeKycDto } from './dto/finalize-kyc.dto';
import { KycService } from './kyc.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

const IS_EMULATOR = Boolean(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB);

@Controller('kyc')
export class KycController {
  private readonly logger = new Logger(KycController.name);

  constructor(private readonly kycService: KycService) {}


  @Get('status')
  async status(@Query('vendor') vendor: string, @Req() req: Request) {
    let uid = (req as any)?.user?.uid || null;
    if (!uid) {
      const authHeader = (req.headers.authorization || '').toString();
      const match = /^Bearer (.+)$/.exec(authHeader);
      if (match) {
        try {
          const decoded = await admin.auth().verifyIdToken(match[1]);
          uid = decoded.uid;
          (req as any).user = decoded;
        } catch {
          uid = null;
        }
      }
    }
    const result = await this.kycService.status(uid, vendor || null);
    return { result };
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('finalize')
  async finalize(@Body() body: FinalizeKycDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid || '';
    const result = await this.kycService.finalize(uid, body.vendor);
    return result;
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('sync')
  async sync(@Query('sessionId') sessionId: string, @Query('uid') uid: string | undefined, @Req() req: Request) {
    if (!sessionId) throw new BadRequestException('Missing sessionId');
    const user = (req as any)?.user;
    const callerUid = user?.uid;
    const isAdmin = Boolean(user?.admin || user?.claims?.admin);
    if (!callerUid) throw new UnauthorizedException('Authentication required');
    const targetUid = isAdmin && uid ? uid : callerUid;
    return this.kycService.sync(sessionId, targetUid, { isAdmin, callerUid });
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('id/verify')
  async verifyIdDocument(
    @Req() req: Request,
  ) {
    this.logger.debug('[KYC] verifyIdDocument called');
    this.logger.debug(`[KYC] Content-Type: ${req.headers['content-type']}`);
    
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new UnauthorizedException('Authentication required');
    
    // Parse multipart form data using busboy - works with Firebase Functions
    const files = await this.parseMultipartRequest(req);
    this.logger.debug(`[KYC] parsed files: ${Object.keys(files).join(', ')}`);
    
    const front = files.front;
    const back = files.back;
    
    if (!front || !back) {
      throw new BadRequestException('Both front and back ID images are required');
    }

    const result = await this.kycService.verifyIdDocument(uid, front, back);
    return { result };
  }

  private parseMultipartRequest(req: Request): Promise<Record<string, Express.Multer.File>> {
    return new Promise((resolve, reject) => {
      const files: Record<string, Express.Multer.File> = {};
      const contentType = req.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data')) {
        reject(new BadRequestException('Content-Type must be multipart/form-data'));
        return;
      }

      try {
        const busboy = Busboy({ 
          headers: req.headers as any,
          limits: {
            files: 2,
            fileSize: 5 * 1024 * 1024, // 5MB
          }
        });

        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
          const { filename, encoding, mimeType } = info;
          const chunks: Buffer[] = [];
          
          file.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          
          file.on('end', () => {
            const buffer = Buffer.concat(chunks);
            files[fieldname] = {
              fieldname,
              originalname: filename,
              encoding,
              mimetype: mimeType,
              buffer,
              size: buffer.length,
            } as Express.Multer.File;
          });
        });

        busboy.on('finish', () => {
          resolve(files);
        });

        busboy.on('error', (err: Error) => {
          this.logger.error(`[KYC] Busboy error: ${err.message}`);
          reject(new BadRequestException('Failed to parse multipart form data: ' + err.message));
        });

        // Handle the request body - Firebase Functions may have already parsed it
        const rawBody = (req as any).rawBody;
        if (rawBody && Buffer.isBuffer(rawBody)) {
          // Firebase Functions has the raw body available
          busboy.end(rawBody);
        } else if ((req as any).body && Buffer.isBuffer((req as any).body)) {
          // Body was parsed as buffer
          busboy.end((req as any).body);
        } else {
          // Pipe the request stream directly
          req.pipe(busboy);
        }
      } catch (err: any) {
        this.logger.error(`[KYC] Error initializing busboy: ${err.message}`);
        reject(new BadRequestException('Failed to initialize multipart parser: ' + err.message));
      }
    });
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('dev-verify')
  async devVerify(@Body('vendor') vendor: string | null, @Req() req: Request) {
    if (!IS_EMULATOR) throw new NotFoundException();
    const uid = (req as any)?.user?.uid || null;
    if (!uid) throw new UnauthorizedException('Authentication required');
    return this.kycService.devVerify(uid, vendor || null);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('cancel')
  async cancel(@Req() req: Request) {
    const uid = (req as any)?.user?.uid || null;
    if (!uid) throw new UnauthorizedException('Authentication required');
    return this.kycService.cancel(uid);
  }

  /**
   * POST /kyc/submit
   * Authenticated flow: accept Firebase Storage URLs, download them and
   * run Didit ID-verification on the server side.
   */
  @UseGuards(FirebaseAuthGuard)
  @Post('submit')
  async submit(
    @Body() body: { fullName?: string; nationalId?: string; idFrontUrl?: string; idBackUrl?: string },
    @Req() req: Request,
  ) {
    const uid = (req as any)?.user?.uid || null;
    if (!uid) throw new UnauthorizedException('Authentication required');
    if (!body?.idFrontUrl || !body?.idBackUrl) {
      throw new BadRequestException('idFrontUrl and idBackUrl are required');
    }
    return this.kycService.submitFromUrls(uid, {
      fullName: String(body.fullName || ''),
      nationalId: body.nationalId ? String(body.nationalId) : undefined,
      idFrontUrl: body.idFrontUrl,
      idBackUrl: body.idBackUrl,
    });
  }

  /**
   * POST /kyc/submit-public
   * Pre-signup / unauthenticated flow: accept base64-encoded images with a
   * `vendor` identifier.  Results are stored in kyc_temp/{vendor} and can
   * be finalised via POST /kyc/finalize once the user has an account.
   */
  @Post('submit-public')
  async submitPublic(
    @Body() body: {
      fullName?: string;
      vendor?: string;
      idFrontBase64?: string;
      idBackBase64?: string;
      nationalId?: string;
    },
  ) {
    const vendor = String(body?.vendor || '').trim();
    if (!vendor) throw new BadRequestException('vendor is required');
    if (!body?.idFrontBase64 || !body?.idBackBase64) {
      throw new BadRequestException('idFrontBase64 and idBackBase64 are required');
    }
    return this.kycService.submitFromBase64(vendor, {
      fullName: String(body.fullName || ''),
      idFrontBase64: body.idFrontBase64,
      idBackBase64: body.idBackBase64,
      nationalId: body.nationalId ? String(body.nationalId) : undefined,
    });
  }

  @Post('webhook')
  async webhook(@Req() req: any) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('Missing raw body for signature verification');
    }
    const headers = req.headers || {};
    return this.kycService.webhook(raw, headers);
  }

}
