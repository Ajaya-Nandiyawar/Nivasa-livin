import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../core/storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
