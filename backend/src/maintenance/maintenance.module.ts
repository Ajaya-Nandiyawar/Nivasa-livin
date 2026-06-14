import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../core/mail/mail.module';

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
