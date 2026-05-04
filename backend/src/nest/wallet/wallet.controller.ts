import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /wallet/balance
   * Get current user's token balance
   */
  @Get('balance')
  @UseGuards(FirebaseAuthGuard)
  async getBalance(@Req() req: any) {
    const user = req?.user;
    return this.walletService.getBalance(user.uid);
  }

  /**
   * POST /wallet/purchase
   * Create a token purchase session
   */
  @Post('purchase')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(200)
  async createTokenPurchaseSession(@Body() body: any, @Req() req: any) {
    const user = req?.user;
    return this.walletService.createTokenPurchaseSession(user.uid, body);
  }

  /**
   * POST /wallet/contribute-wish
   * Contribute tokens to a wish
   */
  @Post('contribute-wish')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(201)
  async contributeToWish(@Body() body: any, @Req() req: any) {
    const user = req?.user;
    return this.walletService.contributeToWish(user.uid, body);
  }

  /**
   * GET /wallet/transactions
   * Get user's transaction history
   */
  @Get('transactions')
  @UseGuards(FirebaseAuthGuard)
  async getTransactionHistory(@Req() req: any) {
    const user = req?.user;
    return this.walletService.getTransactionHistory(user.uid);
  }

  /**
   * GET /wallet/top-contributors
   * Get top contributors (public thank-you section)
   * No auth required - public endpoint
   */
  @Get('top-contributors')
  async getTopContributors() {
    return this.walletService.getTopContributors();
  }
}
