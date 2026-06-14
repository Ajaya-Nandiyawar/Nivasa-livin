import { Module } from '@nestjs/common';
import { RentService } from './rent.service';
import { RentController } from './rent.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../core/mail/mail.module';
import { StorageModule } from '../core/storage/storage.module';

@Module({
  imports: [DatabaseModule, MailModule, StorageModule],
  controllers: [RentController],
  providers: [RentService],
})
export class RentModule {}
