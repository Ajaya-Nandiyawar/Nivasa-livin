import { Injectable, StreamableFile } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { sql } from 'kysely';
import * as fastcsv from 'fast-csv';
import { PassThrough } from 'stream';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getRevenue(filter: ReportFilterDto) {
    let query: any = this.db
      .selectFrom('payments')
      .select([
        sql<string>`to_char(date_trunc('month', payment_date), 'YYYY-MM')`.as(
          'month',
        ),
        sql<number>`SUM(CAST(amount AS NUMERIC))`.as('total_revenue'),
      ])
      .where('deleted_at', 'is', null);

    if (filter.property_id) {
      query = query
        .innerJoin('rent_records', 'rent_records.id', 'payments.rent_record_id')
        .innerJoin('bookings', 'bookings.id', 'rent_records.booking_id')
        .innerJoin('beds', 'beds.id', 'bookings.bed_id')
        .innerJoin('rooms', 'rooms.id', 'beds.room_id')
        .innerJoin('floors', 'floors.id', 'rooms.floor_id')
        .where('floors.property_id', '=', filter.property_id);
    }
    if (filter.from_date) {
      query = query.where('payment_date', '>=', new Date(filter.from_date));
    } else {
      // Last 12 months default
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);
      query = query.where('payment_date', '>=', twelveMonthsAgo);
    }
    if (filter.to_date) {
      query = query.where('payment_date', '<=', new Date(filter.to_date));
    }

    return await query
      .groupBy(sql`date_trunc('month', payment_date)`)
      .orderBy('month', 'asc')
      .execute();
  }

  async getOccupancy(filter: ReportFilterDto) {
    let bedQuery: any = this.db
      .selectFrom('beds')
      .select([
        sql<number>`COUNT(*)`.as('total_beds'),
        sql<number>`SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END)`.as(
          'occupied_beds',
        ),
      ]);

    if (filter.property_id) {
      bedQuery = bedQuery
        .innerJoin('rooms', 'rooms.id', 'beds.room_id')
        .innerJoin('floors', 'floors.id', 'rooms.floor_id')
        .where('floors.property_id', '=', filter.property_id);
    }

    const currentStats = await bedQuery.executeTakeFirst();
    const total = Number(currentStats?.total_beds || 0);
    const occupied = Number(currentStats?.occupied_beds || 0);

    return {
      total_beds: total,
      occupied_beds: occupied,
      occupancy_rate: total > 0 ? (occupied / total) * 100 : 0,
    };
  }

  async getOutstanding(filter: ReportFilterDto) {
    let query: any = this.db
      .selectFrom('rent_records')
      .select([
        sql<number>`
          SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 0 AND 7 THEN CAST(balance AS NUMERIC) ELSE 0 END)
        `.as('bucket_0_7'),
        sql<number>`
          SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 8 AND 30 THEN CAST(balance AS NUMERIC) ELSE 0 END)
        `.as('bucket_8_30'),
        sql<number>`
          SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN CAST(balance AS NUMERIC) ELSE 0 END)
        `.as('bucket_31_60'),
        sql<number>`
          SUM(CASE WHEN CURRENT_DATE - due_date > 60 THEN CAST(balance AS NUMERIC) ELSE 0 END)
        `.as('bucket_60_plus'),
      ])
      .where('status', 'in', ['PENDING', 'PARTIAL', 'OVERDUE'])
      .where('deleted_at', 'is', null)
      .where(sql<any>`due_date <= CURRENT_DATE`);

    if (filter.property_id) {
      query = query
        .innerJoin('bookings', 'bookings.id', 'rent_records.booking_id')
        .innerJoin('beds', 'beds.id', 'bookings.bed_id')
        .innerJoin('rooms', 'rooms.id', 'beds.room_id')
        .innerJoin('floors', 'floors.id', 'rooms.floor_id')
        .where('floors.property_id', '=', filter.property_id);
    }

    const res = await query.executeTakeFirst();
    return {
      '0-7 days': Number(res?.bucket_0_7 || 0),
      '8-30 days': Number(res?.bucket_8_30 || 0),
      '31-60 days': Number(res?.bucket_31_60 || 0),
      '60+ days': Number(res?.bucket_60_plus || 0),
    };
  }

  async getExpenses(filter: ReportFilterDto) {
    let query: any = this.db
      .selectFrom('expenses')
      .leftJoin(
        'expense_categories',
        'expense_categories.id',
        'expenses.category_id',
      )
      .select([
        'expense_categories.name as category_name',
        sql<number>`SUM(CAST(expenses.amount AS NUMERIC))`.as('total_amount'),
      ])
      .where('expenses.deleted_at', 'is', null);

    if (filter.property_id) {
      query = query.where('expenses.property_id', '=', filter.property_id);
    }
    if (filter.from_date) {
      query = query.where(
        'expenses.expense_date',
        '>=',
        new Date(filter.from_date),
      );
    }
    if (filter.to_date) {
      query = query.where(
        'expenses.expense_date',
        '<=',
        new Date(filter.to_date),
      );
    }

    return await query
      .groupBy('expense_categories.name')
      .orderBy('total_amount', 'desc')
      .execute();
  }

  async getTenantTurnover(filter: ReportFilterDto) {
    let moveInQuery: any = this.db
      .selectFrom('bookings')
      .select([
        sql<string>`to_char(date_trunc('month', check_in_date), 'YYYY-MM')`.as(
          'month',
        ),
        sql<number>`COUNT(*)`.as('move_ins'),
      ])
      .where('deleted_at', 'is', null);

    let moveOutQuery: any = this.db
      .selectFrom('bookings')
      .select([
        sql<string>`to_char(date_trunc('month', check_out_date), 'YYYY-MM')`.as(
          'month',
        ),
        sql<number>`COUNT(*)`.as('move_outs'),
      ])
      .where('status', '=', 'CHECKED_OUT')
      .where('check_out_date', 'is not', null)
      .where('deleted_at', 'is', null);

    // Simplistic approach for property filter via join
    if (filter.property_id) {
      moveInQuery = moveInQuery
        .innerJoin('beds', 'beds.id', 'bookings.bed_id')
        .innerJoin('rooms', 'rooms.id', 'beds.room_id')
        .innerJoin('floors', 'floors.id', 'rooms.floor_id')
        .where('floors.property_id', '=', filter.property_id);

      moveOutQuery = moveOutQuery
        .innerJoin('beds', 'beds.id', 'bookings.bed_id')
        .innerJoin('rooms', 'rooms.id', 'beds.room_id')
        .innerJoin('floors', 'floors.id', 'rooms.floor_id')
        .where('floors.property_id', '=', filter.property_id);
    }

    if (filter.from_date) {
      moveInQuery = moveInQuery.where(
        'check_in_date',
        '>=',
        new Date(filter.from_date),
      );
      moveOutQuery = moveOutQuery.where(
        'check_out_date',
        '>=',
        new Date(filter.from_date),
      );
    }
    if (filter.to_date) {
      moveInQuery = moveInQuery.where(
        'check_in_date',
        '<=',
        new Date(filter.to_date),
      );
      moveOutQuery = moveOutQuery.where(
        'check_out_date',
        '<=',
        new Date(filter.to_date),
      );
    }

    const moveIns = await moveInQuery
      .groupBy(sql`date_trunc('month', check_in_date)`)
      .execute();
    const moveOuts = await moveOutQuery
      .groupBy(sql`date_trunc('month', check_out_date)`)
      .execute();

    // Merge in JS
    const turnoverMap: Record<
      string,
      { month: string; move_ins: number; move_outs: number }
    > = {};

    moveIns.forEach((item) => {
      turnoverMap[item.month] = {
        month: item.month,
        move_ins: Number(item.move_ins),
        move_outs: 0,
      };
    });

    moveOuts.forEach((item) => {
      if (!turnoverMap[item.month]) {
        turnoverMap[item.month] = {
          month: item.month,
          move_ins: 0,
          move_outs: Number(item.move_outs),
        };
      } else {
        turnoverMap[item.month].move_outs = Number(item.move_outs);
      }
    });

    return Object.values(turnoverMap).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  async exportRentRecords(filter: ReportFilterDto) {
    const query = this.db
      .selectFrom('rent_records')
      .innerJoin('bookings', 'bookings.id', 'rent_records.booking_id')
      .innerJoin('tenants', 'tenants.id', 'bookings.tenant_id')
      .select([
        'rent_records.id as id',
        'tenants.full_name as tenant',
        'rent_records.period_month as period_month',
        'rent_records.period_year as period_year',
        'rent_records.rent_amount as rent_amount',
        'rent_records.paid_amount as paid_amount',
        'rent_records.balance as balance',
        'rent_records.status as status',
        'rent_records.due_date as due_date',
      ] as any)
      .where('rent_records.deleted_at', 'is', null)
      .orderBy('rent_records.created_at', 'desc');

    const records = await query.execute();

    const stream = fastcsv.format({ headers: true });
    records.forEach((row) => stream.write(row));
    stream.end();

    return new StreamableFile(stream as any);
  }

  async exportTenants(filter: ReportFilterDto) {
    const query = this.db
      .selectFrom('tenants')
      .select([
        'id',
        'full_name',
        'email',
        'phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'created_at',
      ])
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc');

    const records = await query.execute();

    const stream = fastcsv.format({ headers: true });
    records.forEach((row) => stream.write(row));
    stream.end();

    return new StreamableFile(stream as any);
  }
}
