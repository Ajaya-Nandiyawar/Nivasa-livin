import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { validateEnv } from './config/env.config';
import { StorageModule } from './core/storage/storage.module';
import { MailModule } from './core/mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { RentModule } from './rent/rent.module';
import { BookingModule } from './booking/booking.module';
import { ExpenseModule } from './expense/expense.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    StorageModule,
    MailModule,
    AuthModule,
    TenantModule,
    RentModule,
    BookingModule,
    ExpenseModule,
    MaintenanceModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
