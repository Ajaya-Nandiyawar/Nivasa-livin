import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../core/mail/mail.module';

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
