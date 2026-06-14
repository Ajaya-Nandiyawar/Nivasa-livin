import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../core/mail/mail.module';
import { StorageModule } from '../core/storage/storage.module';

@Module({
  imports: [DatabaseModule, MailModule, StorageModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
