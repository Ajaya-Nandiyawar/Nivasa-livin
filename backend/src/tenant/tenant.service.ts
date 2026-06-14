import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../core/mail/mail.service';
import { StorageService } from '../core/storage/storage.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantFilterDto } from './dto/tenant-filter.dto';
import { BedStatusEnum, BookingStatusEnum, RentStatusEnum } from '../database/types';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateTenantDto) {
    // We execute the complex onboarding in a strict transaction
    const result = await this.db.transaction().execute(async (trx) => {
      
      // 1. Check duplicates
      const existing = await trx
        .selectFrom('tenants')
        .select('id')
        .where((eb) => eb.or([
          eb('phone', '=', dto.phone),
          eb('aadhaar_number', '=', dto.aadhaar_number)
        ]))
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
        
      if (existing) {
        throw new ConflictException('A tenant with this phone or Aadhaar already exists');
      }

      // 2. Verify bed is VACANT
      const bed = await trx
        .selectFrom('beds')
        .select(['id', 'room_id', 'status'])
        .where('id', '=', dto.bed_id)
        .executeTakeFirst();

      if (!bed) {
        throw new NotFoundException('Bed not found');
      }

      if (bed.status !== 'VACANT') {
        throw new BadRequestException('The selected bed is not vacant');
      }

      // 3. Insert Tenant
      const newTenant = await trx
        .insertInto('tenants')
        .values({
          full_name: dto.full_name,
          email: dto.email,
          phone: dto.phone,
          emergency_contact_name: dto.emergency_contact_name,
          emergency_contact_phone: dto.emergency_contact_phone,
          aadhaar_number: dto.aadhaar_number,
          pan_number: dto.pan_number,
          permanent_address: dto.permanent_address,
          date_of_birth: new Date(dto.dob),
          occupation: dto.occupation,
          // blood_group is missing in the schema? Let's omit it if it doesn't exist.
          // Or we assume the schema is what we saw. `blood_group` doesn't exist in TenantsTable.
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      // 4. Insert Booking
      const newBooking = await trx
        .insertInto('bookings')
        .values({
          tenant_id: newTenant.id,
          bed_id: dto.bed_id,
          check_in_date: new Date(dto.check_in_date),
          security_deposit: dto.security_deposit.toString(),
          monthly_rent: dto.monthly_rent.toString(),
          billing_date: dto.billing_date,
          status: 'ACTIVE' as BookingStatusEnum,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      // 5. Update Bed Status
      await trx
        .updateTable('beds')
        .set({ status: 'OCCUPIED' as BedStatusEnum, updated_at: new Date() })
        .where('id', '=', dto.bed_id)
        .execute();

      // 6. Generate first Rent Record
      const periodMonth = new Date().getMonth() + 1;
      const periodYear = new Date().getFullYear();
      
      const dueDate = new Date();
      dueDate.setDate(dto.billing_date);

      await trx
        .insertInto('rent_records')
        .values({
          booking_id: newBooking.id,
          tenant_id: newTenant.id,
          period_month: periodMonth,
          period_year: periodYear,
          rent_amount: dto.monthly_rent.toString(),
          due_date: dueDate,
          status: 'PENDING' as RentStatusEnum,
        })
        .execute();

      return newTenant.id;
    });

    // 7. Send Welcome Email (Outside transaction)
    try {
      await this.mailService.sendMail(
        dto.email,
        'Welcome to Nivasa PG',
        `Dear ${dto.full_name},\n\nWelcome to Nivasa PG! Your booking is confirmed.`,
        `<h1>Welcome to Nivasa PG!</h1><p>Dear ${dto.full_name}, your booking is confirmed.</p>`
      );
    } catch (e) {
      this.logger.error(`Failed to send welcome email to ${dto.email}`, e);
      // We don't fail the request if email fails
    }

    return { message: 'Tenant created successfully', id: result };
  }

  async findAll(filterDto: TenantFilterDto) {
    // Build query with full joins for rich list view
    let query = this.db.selectFrom('tenants')
      .leftJoin('bookings', (join) =>
        join.onRef('bookings.tenant_id', '=', 'tenants.id').on('bookings.status', '=', 'ACTIVE')
      )
      .leftJoin('beds', 'beds.id', 'bookings.bed_id')
      .leftJoin('rooms', 'rooms.id', 'beds.room_id')
      .leftJoin('floors', 'floors.id', 'rooms.floor_id')
      .leftJoin('properties', 'properties.id', 'floors.property_id')
      .select([
        'tenants.id',
        'tenants.full_name',
        'tenants.email',
        'tenants.phone',
        'tenants.created_at',
        'tenants.deleted_at',
        'bookings.id as booking_id',
        'bookings.status as booking_status',
        'bookings.monthly_rent',
        'bookings.check_in_date',
        'beds.bed_label',
        'rooms.room_number',
        'properties.name as property_name',
      ])
      .where('tenants.deleted_at', 'is', null);

    if (filterDto.status) {
      query = query.where('bookings.status', '=', filterDto.status);
    }

    if (filterDto.search) {
      const s = `%${filterDto.search}%`;
      query = query.where((eb) => eb.or([
        eb('tenants.full_name', 'ilike', s),
        eb('tenants.phone', 'ilike', s),
      ]));
    }

    const limit = filterDto.limit || 20;
    const page = filterDto.page || 1;
    const offset = (page - 1) * limit;

    const [items, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy('tenants.created_at', 'desc').execute(),
      this.db.selectFrom('tenants').select((eb) => eb.fn.countAll<number>().as('total'))
        .where('deleted_at', 'is', null).executeTakeFirstOrThrow(),
    ]);

    return {
      data: items,
      total: Number(countResult.total),
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const tenant = await this.db
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Fetch active booking with room/bed/property info
    const bookingInfo = await this.db
      .selectFrom('bookings')
      .leftJoin('beds', 'beds.id', 'bookings.bed_id')
      .leftJoin('rooms', 'rooms.id', 'beds.room_id')
      .leftJoin('floors', 'floors.id', 'rooms.floor_id')
      .leftJoin('properties', 'properties.id', 'floors.property_id')
      .select([
        'bookings.id as booking_id',
        'bookings.status as booking_status',
        'bookings.monthly_rent',
        'bookings.security_deposit',
        'bookings.check_in_date',
        'bookings.billing_date',
        'beds.bed_label',
        'rooms.room_number',
        'properties.name as property_name',
        'properties.id as property_id',
      ])
      .where('bookings.tenant_id', '=', id)
      .where('bookings.status', '=', 'ACTIVE')
      .executeTakeFirst();

    return {
      ...tenant,
      ...bookingInfo,
    };
  }

  async update(id: string, dto: UpdateTenantDto) {
    const result = await this.db
      .updateTable('tenants')
      .set({ ...dto, updated_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundException('Tenant not found');
    }

    return { message: 'Tenant updated successfully' };
  }

  async softDelete(id: string) {
    const result = await this.db
      .updateTable('tenants')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundException('Tenant not found');
    }

    return { message: 'Tenant soft deleted' };
  }

  // R2 Document logic
  async getDocuments(tenantId: string) {
    const docs = await this.db
      .selectFrom('tenant_documents')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .execute();
      
    return docs;
  }
}
