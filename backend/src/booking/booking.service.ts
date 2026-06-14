import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../core/mail/mail.service';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  async findAll(filterDto: BookingFilterDto) {
    let query = this.db
      .selectFrom('bookings')
      .leftJoin('tenants', 'tenants.id', 'bookings.tenant_id')
      .leftJoin('beds', 'beds.id', 'bookings.bed_id')
      .leftJoin('rooms', 'rooms.id', 'beds.room_id')
      .leftJoin('floors', 'floors.id', 'rooms.floor_id')
      .leftJoin('properties', 'properties.id', 'floors.property_id')
      .select([
        'bookings.id',
        'bookings.status',
        'bookings.check_in_date',
        'bookings.check_out_date',
        'tenants.full_name as tenant_name',
        'beds.bed_label',
        'rooms.room_number',
        'properties.name as property_name',
      ])
      .where('bookings.deleted_at', 'is', null);

    if (filterDto.status) {
      query = query.where('bookings.status', '=', filterDto.status);
    }

    const limit = filterDto.limit || 20;
    const page = filterDto.page || 1;
    const offset = (page - 1) * limit;

    const data = await query
      .limit(limit)
      .offset(offset)
      .orderBy('bookings.created_at', 'desc')
      .execute();

    return { data, page, limit };
  }

  async findOne(id: string) {
    const booking = await this.db
      .selectFrom('bookings')
      .leftJoin('tenants', 'tenants.id', 'bookings.tenant_id')
      .leftJoin('beds', 'beds.id', 'bookings.bed_id')
      .selectAll('bookings')
      .select([
        'tenants.full_name as tenant_name',
        'tenants.phone as tenant_phone',
        'tenants.email as tenant_email',
        'beds.bed_label',
        'beds.room_id',
      ])
      .where('bookings.id', '=', id)
      .where('bookings.deleted_at', 'is', null)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException('Booking not found');

    return booking;
  }

  async processCheckout(id: string, dto: CheckoutDto) {
    return await this.db.transaction().execute(async (trx) => {
      // a. Validate the booking is currently 'ACTIVE'
      const booking = await trx
        .selectFrom('bookings')
        .leftJoin('tenants', 'tenants.id', 'bookings.tenant_id')
        .select([
          'bookings.id',
          'bookings.status',
          'bookings.bed_id',
          'bookings.security_deposit',
          'tenants.email',
          'tenants.full_name',
        ])
        .where('bookings.id', '=', id)
        .where('bookings.deleted_at', 'is', null)
        .executeTakeFirst();

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Cannot check out a booking with status ${booking.status}`,
        );
      }

      // b. Check for unpaid rent_records associated with this booking
      const unpaidRents = await trx
        .selectFrom('rent_records')
        .select(['balance'])
        .where('booking_id', '=', id)
        .where('status', 'in', ['PENDING', 'PARTIAL', 'OVERDUE'])
        .where('deleted_at', 'is', null)
        .execute();

      const totalUnpaid = unpaidRents.reduce(
        (sum, record) => sum + parseFloat(record.balance),
        0,
      );
      const securityDeposit = parseFloat(booking.security_deposit);
      const refundAmount = securityDeposit - totalUnpaid;

      // c. Update the booking status to 'CHECKED_OUT'
      const checkOutDate = dto.check_out_date
        ? new Date(dto.check_out_date)
        : new Date();
      await trx
        .updateTable('bookings')
        .set({
          status: 'CHECKED_OUT',
          check_out_date: checkOutDate,
          notes: dto.notes || null,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // d. Update the associated bed status back to 'VACANT'
      await trx
        .updateTable('beds')
        .set({ status: 'VACANT', updated_at: new Date() })
        .where('id', '=', booking.bed_id)
        .execute();

      // e. (In a complete system, we would insert a ledger entry for the deposit refund here)
      // We skip actual ledger table insertion since it's not strictly specified in DB schema,
      // but we log it as requested.
      this.logger.log(
        `Checkout ${id}: Dep: ${securityDeposit}, Unpaid: ${totalUnpaid}, Refund: ${refundAmount}`,
      );

      // f. Trigger email
      if (booking.email) {
        await this.mailService
          .sendMail(
            booking.email,
            'Check-Out Summary - NIVASA',
            `Dear ${booking.full_name}, your check-out is complete. Deposit: ₹${securityDeposit}. Deductions: ₹${totalUnpaid}. Refund: ₹${refundAmount}.`,
          )
          .catch((e) => this.logger.error('Failed to send checkout email', e));
      }

      return {
        message: 'Checkout processed successfully',
        security_deposit: securityDeposit,
        total_deductions: totalUnpaid,
        refund_amount: refundAmount,
      };
    });
  }

  async processTransfer(id: string, dto: TransferDto) {
    return await this.db.transaction().execute(async (trx) => {
      const oldBooking = await trx
        .selectFrom('bookings')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!oldBooking) throw new NotFoundException('Booking not found');
      if (oldBooking.status !== 'ACTIVE') {
        throw new BadRequestException(
          'Only ACTIVE bookings can be transferred',
        );
      }

      // a. Verify the new_bed_id currently has a status of 'VACANT'
      const newBed = await trx
        .selectFrom('beds')
        .select(['id', 'status', 'room_id'])
        .where('id', '=', dto.new_bed_id)
        .executeTakeFirst();

      if (!newBed) throw new NotFoundException('New bed not found');
      if (newBed.status !== 'VACANT') {
        throw new BadRequestException('The selected new bed is not vacant');
      }

      // We need to fetch the room's rent to set the new monthly_rent if they differ
      // Or keep the old rent. The prompt says "create a NEW bookings record".
      // We'll use the new room's rent.
      const room = await trx
        .selectFrom('rooms')
        .select('monthly_rent')
        .where('id', '=', newBed.room_id)
        .executeTakeFirst();

      const newMonthlyRent = room ? room.monthly_rent : oldBooking.monthly_rent;

      // b. Update the current booking status to 'TRANSFERRED'
      await trx
        .updateTable('bookings')
        .set({
          status: 'TRANSFERRED',
          check_out_date: new Date(dto.transfer_date),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // c. Update the old bed status back to 'VACANT'
      await trx
        .updateTable('beds')
        .set({ status: 'VACANT', updated_at: new Date() })
        .where('id', '=', oldBooking.bed_id)
        .execute();

      // d. Create a NEW bookings record for the tenant
      const newBooking = await trx
        .insertInto('bookings')
        .values({
          tenant_id: oldBooking.tenant_id,
          bed_id: dto.new_bed_id,
          check_in_date: new Date(dto.transfer_date),
          monthly_rent: newMonthlyRent,
          security_deposit: oldBooking.security_deposit,
          billing_date: oldBooking.billing_date,
          status: 'ACTIVE',
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      // e. Update the new bed status to 'OCCUPIED'
      await trx
        .updateTable('beds')
        .set({ status: 'OCCUPIED', updated_at: new Date() })
        .where('id', '=', dto.new_bed_id)
        .execute();

      // f. Update PENDING rent records to point to new booking
      const periodMonth = new Date().getMonth() + 1;
      const periodYear = new Date().getFullYear();

      await trx
        .updateTable('rent_records')
        .set({ booking_id: newBooking.id, updated_at: new Date() })
        .where('booking_id', '=', id)
        .where('status', 'in', ['PENDING', 'PARTIAL'])
        .where('period_month', '=', periodMonth)
        .where('period_year', '=', periodYear)
        .execute();

      return {
        message: 'Bed transfer processed successfully',
        new_booking_id: newBooking.id,
      };
    });
  }
}
