import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, CacheModule.register()],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
