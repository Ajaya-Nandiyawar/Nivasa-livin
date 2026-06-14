import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../core/mail/mail.service';
import { StorageService } from '../core/storage/storage.service';
import { RentFilterDto } from './dto/rent-filter.dto';
import { PaymentDto } from './dto/payment.dto';
import PDFDocument from 'pdfkit';
import { sql } from 'kysely';

@Injectable()
export class RentService {
  private readonly logger = new Logger(RentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  // CRON JOBS
  
  // 1st of every month at 8:00 AM
  @Cron('0 8 1 * *')
  async generateMonthlyRent() {
    this.logger.log('Starting monthly rent generation...');
    const now = new Date();
    const periodMonth = now.getMonth() + 1;
    const periodYear = now.getFullYear();

    const activeBookings = await this.db
      .selectFrom('bookings')
      .selectAll()
      .where('status', '=', 'ACTIVE')
      .execute();

    let count = 0;

    for (const booking of activeBookings) {
      // Check if record exists
      const existing = await this.db
        .selectFrom('rent_records')
        .select('id')
        .where('booking_id', '=', booking.id)
        .where('period_month', '=', periodMonth)
        .where('period_year', '=', periodYear)
        .executeTakeFirst();

      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(booking.billing_date);

        await this.db.insertInto('rent_records').values({
          booking_id: booking.id,
          tenant_id: booking.tenant_id,
          period_month: periodMonth,
          period_year: periodYear,
          rent_amount: booking.monthly_rent,
          due_date: dueDate,
          status: 'PENDING',
        }).execute();

        count++;
      }
    }

    this.logger.log(`Generated ${count} new rent records for ${periodMonth}/${periodYear}.`);
    return { generated: count };
  }

  // Daily at 9:00 AM
  @Cron('0 9 * * *')
  async detectOverdueRent() {
    this.logger.log('Running overdue detection...');
    const today = new Date();

    const result = await this.db
      .updateTable('rent_records')
      .set({ status: 'OVERDUE' })
      .where('due_date', '<', today)
      .where('status', 'in', ['PENDING', 'PARTIAL'])
      .executeTakeFirst();

    this.logger.log(`Marked ${result.numUpdatedRows} records as OVERDUE.`);
  }

  // ENDPOINTS

  async manualGenerateRent() {
    return this.generateMonthlyRent();
  }

  async findAll(filterDto: RentFilterDto) {
    let query = this.db.selectFrom('rent_records')
      .leftJoin('tenants', 'tenants.id', 'rent_records.tenant_id')
      .select([
        'rent_records.id',
        'rent_records.period_month',
        'rent_records.period_year',
        'rent_records.rent_amount',
        'rent_records.paid_amount',
        'rent_records.balance',
        'rent_records.due_date',
        'rent_records.status',
        'tenants.full_name as tenant_name',
      ])
      .where('rent_records.deleted_at', 'is', null);

    if (filterDto.period_month) {
      query = query.where('rent_records.period_month', '=', filterDto.period_month);
    }
    if (filterDto.period_year) {
      query = query.where('rent_records.period_year', '=', filterDto.period_year);
    }
    if (filterDto.status) {
      query = query.where('rent_records.status', '=', filterDto.status);
    }
    if (filterDto.tenant_id) {
      query = query.where('rent_records.tenant_id', '=', filterDto.tenant_id);
    }

    return query.orderBy('rent_records.due_date', 'desc').execute();
  }

  async findDue() {
    return this.db.selectFrom('rent_records')
      .leftJoin('tenants', 'tenants.id', 'rent_records.tenant_id')
      .select([
        'rent_records.id',
        'rent_records.rent_amount',
        'rent_records.balance',
        'rent_records.due_date',
        'rent_records.status',
        'tenants.full_name as tenant_name',
        'tenants.phone as tenant_phone',
      ])
      .where('rent_records.deleted_at', 'is', null)
      .where('rent_records.status', 'in', ['PENDING', 'PARTIAL', 'OVERDUE'])
      .orderBy('rent_records.due_date', 'asc')
      .execute();
  }

  async findOne(id: string) {
    const record = await this.db.selectFrom('rent_records')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!record) throw new NotFoundException('Rent record not found');
    return record;
  }

  async recordPayment(id: string, dto: PaymentDto, userId: string) {
    return await this.db.transaction().execute(async (trx) => {
      const rentRecord = await trx.selectFrom('rent_records')
        .leftJoin('tenants', 'tenants.id', 'rent_records.tenant_id')
        .select([
          'rent_records.id',
          'rent_records.tenant_id',
          'rent_records.rent_amount',
          'rent_records.paid_amount',
          'rent_records.balance',
          'rent_records.period_month',
          'rent_records.period_year',
          'tenants.email',
          'tenants.full_name',
        ])
        .where('rent_records.id', '=', id)
        .executeTakeFirst();

      if (!rentRecord) throw new NotFoundException('Rent record not found');

      const currentBalance = parseFloat(rentRecord.balance);
      if (currentBalance <= 0) {
        throw new BadRequestException('Rent is already fully paid');
      }

      if (dto.amount > currentBalance) {
        throw new BadRequestException('Payment amount exceeds balance');
      }

      // Generate PDF in memory
      const pdfBuffer = await this.generatePdfReceipt(rentRecord, dto);
      const fileName = `receipts/${rentRecord.id}/${Date.now()}.pdf`;
      const uploadResult = await this.storageService.uploadFile(pdfBuffer, fileName, 'application/pdf');

      // Insert payment
      await trx.insertInto('payments')
        .values({
          rent_record_id: id,
          amount: dto.amount.toString(),
          payment_mode: dto.payment_mode,
          reference_number: dto.reference_number || null,
          receipt_url: uploadResult.url,
          collected_by: userId,
        })
        .execute();

      // Update rent_record
      const newPaid = parseFloat(rentRecord.paid_amount) + dto.amount;
      const newBalance = currentBalance - dto.amount;
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

      await trx.updateTable('rent_records')
        .set({
          paid_amount: newPaid.toString(),
          balance: newBalance.toString(),
          status: newStatus,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // Send email
      if (rentRecord.email) {
        await this.mailService.sendMail(
          rentRecord.email,
          'Payment Receipt - Nivasa PG',
          `Your payment of ₹${dto.amount} was received. Receipt: ${uploadResult.url}`,
        );
      }

      return { message: 'Payment recorded successfully', receipt_url: uploadResult.url };
    });
  }

  async getReceipt(id: string) {
    const payment = await this.db.selectFrom('payments')
      .select('receipt_url')
      .where('rent_record_id', '=', id)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!payment || !payment.receipt_url) {
      throw new NotFoundException('Receipt not found');
    }

    return { receipt_url: payment.receipt_url };
  }

  private async generatePdfReceipt(record: any, paymentDto: PaymentDto): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text('NIVASA PG - PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Tenant: ${record.full_name}`);
      doc.text(`Period: ${record.period_month}/${record.period_year}`);
      doc.text(`Amount Paid: ₹${paymentDto.amount}`);
      doc.text(`Payment Mode: ${paymentDto.payment_mode}`);
      if (paymentDto.reference_number) {
        doc.text(`Reference No: ${paymentDto.reference_number}`);
      }
      doc.moveDown();
      doc.text(`Remaining Balance: ₹${parseFloat(record.balance) - paymentDto.amount}`);
      doc.end();
    });
  }
}
