import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../core/storage/storage.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { sql } from 'kysely';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    dto: CreateExpenseDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    let receiptUrl: string | null = null;

    if (file) {
      const fileName = `expenses/${Date.now()}-${file.originalname}`;
      const uploadResult = await this.storageService.uploadFile(
        file.buffer,
        fileName,
        file.mimetype,
      );
      receiptUrl = uploadResult.url;
    }

    const result = await this.db
      .insertInto('expenses')
      .values({
        property_id: dto.property_id,
        category_id: dto.category_id,
        title: dto.title,
        amount: dto.amount.toString(),
        expense_date: new Date(dto.expense_date),
        notes: dto.notes || null,
        receipt_url: receiptUrl,
        created_by: userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return {
      message: 'Expense created',
      id: result.id,
      receipt_url: receiptUrl,
    };
  }

  async findAll(filter: ExpenseFilterDto) {
    let query = this.db
      .selectFrom('expenses')
      .leftJoin(
        'expense_categories',
        'expense_categories.id',
        'expenses.category_id',
      )
      .select([
        'expenses.id',
        'expenses.title',
        'expenses.amount',
        'expenses.expense_date',
        'expenses.receipt_url',
        'expense_categories.name as category_name',
      ])
      .where('expenses.deleted_at', 'is', null);

    if (filter.property_id) {
      query = query.where('expenses.property_id', '=', filter.property_id);
    }
    if (filter.category_id) {
      query = query.where('expenses.category_id', '=', filter.category_id);
    }
    if (filter.start_date) {
      query = query.where(
        'expenses.expense_date',
        '>=',
        new Date(filter.start_date),
      );
    }
    if (filter.end_date) {
      query = query.where(
        'expenses.expense_date',
        '<=',
        new Date(filter.end_date),
      );
    }

    const limit = filter.limit || 20;
    const page = filter.page || 1;
    const offset = (page - 1) * limit;

    const data = await query
      .limit(limit)
      .offset(offset)
      .orderBy('expenses.expense_date', 'desc')
      .execute();

    return { data, page, limit };
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const updateData: any = { updated_at: new Date() };
    if (dto.title) updateData.title = dto.title;
    if (dto.amount !== undefined) updateData.amount = dto.amount.toString();
    if (dto.expense_date) updateData.expense_date = new Date(dto.expense_date);
    if (dto.category_id) updateData.category_id = dto.category_id;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const result = await this.db
      .updateTable('expenses')
      .set(updateData)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundException('Expense not found');
    }

    return { message: 'Expense updated successfully' };
  }

  async softDelete(id: string) {
    const result = await this.db
      .updateTable('expenses')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundException('Expense not found');
    }

    return { message: 'Expense soft deleted' };
  }

  async createCategory(dto: CreateCategoryDto) {
    const result = await this.db
      .insertInto('expense_categories')
      .values({
        name: dto.name,
        property_id: dto.property_id || null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return { message: 'Category created', id: result.id };
  }

  async getCategories() {
    return this.db
      .selectFrom('expense_categories')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async getSummary() {
    // Month-wise financial breakdown grouped by category
    // We use Kysely raw sql for DATE_TRUNC to group by month
    const result = await this.db
      .selectFrom('expenses')
      .leftJoin(
        'expense_categories',
        'expense_categories.id',
        'expenses.category_id',
      )
      .select([
        'expense_categories.name as category_name',
        sql<string>`to_char(date_trunc('month', expenses.expense_date), 'YYYY-MM')`.as(
          'month',
        ),
        sql<number>`SUM(CAST(expenses.amount AS NUMERIC))`.as('total_amount'),
      ])
      .where('expenses.deleted_at', 'is', null)
      .groupBy([
        'expense_categories.name',
        sql`date_trunc('month', expenses.expense_date)`,
      ])
      .orderBy('month', 'desc')
      .execute();

    return result;
  }
}
