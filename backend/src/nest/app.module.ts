import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { KycModule } from './kyc/kyc.module';
import { PaymentsModule } from './payments/payments.module';
import { RequestsModule } from './requests/requests.module';
import { ListingsModule } from './listings/listings.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { WishesModule } from './wishes/wishes.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { DevicesModule } from './devices/devices.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    HealthModule,
    UsersModule,
    KycModule,
    PaymentsModule,
    RequestsModule,
    ListingsModule,
    MatchmakingModule,
    WishesModule,
    AnalyticsModule,
    SearchModule,
    DevicesModule,
    ReviewsModule,
    AdminModule,
    ChatModule,
    ReportsModule,
    EventsModule,
  ],
})
export class AppModule {}
