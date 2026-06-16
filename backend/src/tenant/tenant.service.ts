import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../core/mail/mail.service';
import { StorageService } from '../core/storage/storage.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantFilterDto } from './dto/tenant-filter.dto';
import {
  AddNoteDto,
  AddChargeDto,
  AddPaymentDto,
  AddDepositTransactionDto,
  CreateAgreementDto,
  AddTagDto,
  RoomTransferDto,
  CheckoutDto,
  LogCommunicationDto,
} from './dto/tenant-operations.dto';
import {
  BedStatusEnum,
  BookingStatusEnum,
  RentStatusEnum,
} from '../database/types';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateTenantDto, userId?: string) {
    const result = await this.db.transaction().execute(async (trx) => {
      // 1. Check duplicates
      const existing = await trx
        .selectFrom('tenants')
        .select('id')
        .where((eb) =>
          eb.or([
            eb('phone', '=', dto.phone),
            eb('aadhaar_number', '=', dto.aadhaar_number),
          ]),
        )
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (existing) {
        throw new ConflictException(
          'A tenant with this phone or Aadhaar already exists',
        );
      }

      // 2. Verify bed is VACANT
      const bed = await trx
        .selectFrom('beds')
        .leftJoin('rooms', 'rooms.id', 'beds.room_id')
        .leftJoin('floors', 'floors.id', 'rooms.floor_id')
        .select(['beds.id', 'beds.room_id', 'beds.status', 'floors.property_id'])
        .where('beds.id', '=', dto.bed_id)
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
          pan_number: dto.pan_number ?? null,
          permanent_address: dto.permanent_address,
          date_of_birth: new Date(dto.dob),
          occupation: dto.occupation ?? null,
          guardian_name: dto.guardian_name ?? null,
          guardian_mobile: dto.guardian_mobile ?? null,
          guardian_relation: dto.guardian_relation ?? null,
          gender: dto.gender ?? null,
          company_college: dto.company_college ?? null,
          lead_source: dto.lead_source ?? null,
          referred_by_tenant_id: dto.referred_by_tenant_id ?? null,
          created_by: userId ?? null,
          status: 'ACTIVE',
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

      // 6. Create initial Stay
      await trx
        .insertInto('tenant_stays')
        .values({
          tenant_id: newTenant.id,
          property_id: bed.property_id,
          room_id: bed.room_id,
          bed_id: bed.id,
          start_date: new Date(dto.check_in_date),
        })
        .execute();

      // 7. Create rent charge
      await trx
        .insertInto('tenant_charges')
        .values({
          tenant_id: newTenant.id,
          charge_type: 'RENT',
          amount: dto.monthly_rent.toString(),
          due_date: new Date(dto.check_in_date),
          status: 'PENDING',
          created_by: userId ?? null,
        })
        .execute();

      // 8. Create deposit transaction and charge if deposit > 0
      if (dto.security_deposit > 0) {
        await trx
          .insertInto('tenant_charges')
          .values({
            tenant_id: newTenant.id,
            charge_type: 'DEPOSIT',
            amount: dto.security_deposit.toString(),
            due_date: new Date(dto.check_in_date),
            status: 'PENDING',
            created_by: userId ?? null,
          })
          .execute();

        await trx
          .insertInto('tenant_deposit_transactions')
          .values({
            tenant_id: newTenant.id,
            transaction_type: 'DEPOSIT_RECEIVED',
            amount: dto.security_deposit.toString(),
            remarks: 'Security deposit received at check-in',
            created_by: userId ?? null,
          })
          .execute();
      }

      // 9. Create initial agreement
      const agreementEndDate = new Date(dto.check_in_date);
      agreementEndDate.setMonth(agreementEndDate.getMonth() + 11); // default 11 months
      await trx
        .insertInto('tenant_agreements')
        .values({
          tenant_id: newTenant.id,
          agreement_number: `AGR-${newTenant.id.slice(0, 8).toUpperCase()}`,
          start_date: new Date(dto.check_in_date),
          end_date: agreementEndDate,
          rent_amount: dto.monthly_rent.toString(),
          deposit_amount: dto.security_deposit.toString(),
          status: 'ACTIVE',
          created_by: userId ?? null,
        })
        .execute();

      // 10. Generate first Rent Record (compat with existing module)
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

      // 11. Log check-in activity
      await trx
        .insertInto('tenant_activities')
        .values({
          tenant_id: newTenant.id,
          activity_type: 'CHECKIN',
          metadata: JSON.stringify({
            performedBy: userId ?? 'system',
            roomNumber: bed.room_id,
            bedLabel: bed.id,
          }),
        })
        .execute();

      return newTenant.id;
    });

    try {
      await this.mailService.sendMail(
        dto.email,
        'Welcome to NIVASA',
        `Dear ${dto.full_name},\n\nWelcome to NIVASA! Your booking is confirmed.`,
        `<h1>Welcome to NIVASA!</h1><p>Dear ${dto.full_name}, your booking is confirmed.</p>`,
      );
    } catch (e) {
      this.logger.error(`Failed to send welcome email to ${dto.email}`, e);
    }

    return { message: 'Tenant created successfully', id: result };
  }

  async findAll(filterDto: TenantFilterDto) {
    let query = this.db
      .selectFrom('tenants')
      .leftJoin('bookings', (join) =>
        join
          .onRef('bookings.tenant_id', '=', 'tenants.id')
          .on('bookings.status', '=', 'ACTIVE'),
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
        'tenants.status',
        'tenants.kyc_status',
        'tenants.police_verification_status',
        'tenants.created_at',
        'tenants.deleted_at',
        'bookings.id as booking_id',
        'bookings.status as booking_status',
        'bookings.monthly_rent',
        'bookings.check_in_date',
        'beds.bed_label',
        'rooms.room_number',
        'properties.name as property_name',
        'properties.id as property_id',
      ])
      .where('tenants.deleted_at', 'is', null);

    if (filterDto.status && (filterDto.status as string) !== 'ALL') {
      query = query.where('tenants.status', '=', filterDto.status);
    }

    if (filterDto.search) {
      const s = `%${filterDto.search}%`;
      query = query.where((eb) =>
        eb.or([
          eb('tenants.full_name', 'ilike', s),
          eb('tenants.phone', 'ilike', s),
        ]),
      );
    }

    const limit = filterDto.limit || 20;
    const page = filterDto.page || 1;
    const offset = (page - 1) * limit;

    const [items, countResult] = await Promise.all([
      query
        .limit(limit)
        .offset(offset)
        .orderBy('tenants.created_at', 'desc')
        .execute(),
      this.db
        .selectFrom('tenants')
        .select((eb) => eb.fn.countAll<number>().as('total'))
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow(),
    ]);

    // Format money values to avoid decimal types serialization issues
    const formattedItems = items.map((item) => ({
      ...item,
      monthly_rent: item.monthly_rent ? Number(item.monthly_rent) : null,
    }));

    return {
      data: formattedItems,
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

  async update(id: string, dto: UpdateTenantDto, userId?: string) {
    return await this.db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom('tenants')
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!current) {
        throw new NotFoundException('Tenant not found');
      }

      const { dob, blacklist_reason, ...rest } = dto;
      const updateData: any = {
        ...rest,
        updated_at: new Date(),
      };
      if (dob) {
        updateData.date_of_birth = new Date(dob);
      }
      if (dto.status === 'BLACKLISTED') {
        updateData.blacklisted_at = new Date();
        updateData.blacklist_reason = blacklist_reason ?? 'No reason provided';
      }

      await trx
        .updateTable('tenants')
        .set(updateData)
        .where('id', '=', id)
        .execute();

      // Log update activity
      await trx
        .insertInto('tenant_activities')
        .values({
          tenant_id: id,
          activity_type: dto.status === 'BLACKLISTED' ? 'NOTE_ADDED' : 'NOTE_ADDED', // generic notes/logs
          metadata: JSON.stringify({
            performedBy: userId ?? 'system',
            updatedFields: Object.keys(dto),
          }),
        })
        .execute();

      return { message: 'Tenant updated successfully' };
    });
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

  // KPIs
  async getKPIs() {
    const [totalBeds, occupiedBeds, totalTenants, activeTenants, pendingKyc, pendingPolice, expiringAgreements, pendingPayments] = await Promise.all([
      this.db.selectFrom('beds').select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirst(),
      this.db.selectFrom('beds').select((eb) => eb.fn.countAll<number>().as('count')).where('status', '=', 'OCCUPIED').executeTakeFirst(),
      this.db.selectFrom('tenants').select((eb) => eb.fn.countAll<number>().as('count')).where('deleted_at', 'is', null).executeTakeFirst(),
      this.db.selectFrom('tenants').select((eb) => eb.fn.countAll<number>().as('count')).where('status', '=', 'ACTIVE').where('deleted_at', 'is', null).executeTakeFirst(),
      this.db.selectFrom('tenants').select((eb) => eb.fn.countAll<number>().as('count')).where('kyc_status', '!=', 'VERIFIED').where('deleted_at', 'is', null).executeTakeFirst(),
      this.db.selectFrom('tenants').select((eb) => eb.fn.countAll<number>().as('count')).where('police_verification_status', '!=', 'APPROVED').where('deleted_at', 'is', null).executeTakeFirst(),
      this.db.selectFrom('tenant_agreements').select((eb) => eb.fn.countAll<number>().as('count')).where('status', '=', 'ACTIVE').where('end_date', '<=', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).executeTakeFirst(),
      this.db.selectFrom('tenant_charges').select((eb) => eb.fn.sum<string>('amount').as('sum')).where('status', '=', 'PENDING').executeTakeFirst(),
    ]);

    const occupancyRate = totalBeds?.count && Number(totalBeds.count) > 0
      ? Math.round((Number(occupiedBeds?.count || 0) / Number(totalBeds.count)) * 100)
      : 0;

    return {
      occupancyPercent: occupancyRate,
      activeTenants: Number(activeTenants?.count || 0),
      totalTenants: Number(totalTenants?.count || 0),
      pendingKYC: Number(pendingKyc?.count || 0),
      pendingPoliceVerification: Number(pendingPolice?.count || 0),
      agreementsExpiring30Days: Number(expiringAgreements?.count || 0),
      outstandingDues: Number(pendingPayments?.sum || 0),
      vacantBeds: Number(totalBeds?.count || 0) - Number(occupiedBeds?.count || 0),
    };
  }

  // Notes
  async getNotes(tenantId: string) {
    return this.db
      .selectFrom('tenant_notes')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async addNote(tenantId: string, userId: string, dto: AddNoteDto) {
    const note = await this.db
      .insertInto('tenant_notes')
      .values({
        tenant_id: tenantId,
        note: dto.note,
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('tenant_activities')
      .values({
        tenant_id: tenantId,
        activity_type: 'NOTE_ADDED',
        metadata: JSON.stringify({ performedBy: userId, noteId: note.id }),
      })
      .execute();

    return note;
  }

  // Charges
  async getCharges(tenantId: string) {
    return this.db
      .selectFrom('tenant_charges')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('due_date', 'desc')
      .execute();
  }

  async addCharge(tenantId: string, userId: string, dto: AddChargeDto) {
    const charge = await this.db
      .insertInto('tenant_charges')
      .values({
        tenant_id: tenantId,
        charge_type: dto.charge_type,
        amount: dto.amount.toString(),
        due_date: new Date(dto.due_date),
        status: 'PENDING',
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('tenant_activities')
      .values({
        tenant_id: tenantId,
        activity_type: 'CHARGE_ADDED',
        metadata: JSON.stringify({ performedBy: userId, chargeId: charge.id, amount: dto.amount }),
      })
      .execute();

    return charge;
  }

  async updateChargeStatus(tenantId: string, chargeId: string, userId: string, status: string) {
    const charge = await this.db
      .updateTable('tenant_charges')
      .set({ status, updated_by: userId, updated_at: new Date() })
      .where('id', '=', chargeId)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (status === 'WAIVED') {
      await this.db
        .insertInto('tenant_activities')
        .values({
          tenant_id: tenantId,
          activity_type: 'CHARGE_WAIVED',
          metadata: JSON.stringify({ performedBy: userId, chargeId: charge.id }),
        })
        .execute();
    }

    return charge;
  }

  // Payments
  async getPayments(tenantId: string) {
    return this.db
      .selectFrom('tenant_payments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('payment_date', 'desc')
      .execute();
  }

  async addPayment(tenantId: string, userId: string, dto: AddPaymentDto) {
    return await this.db.transaction().execute(async (trx) => {
      const payment = await trx
        .insertInto('tenant_payments')
        .values({
          tenant_id: tenantId,
          amount: dto.amount.toString(),
          payment_type: dto.payment_type,
          payment_mode: dto.payment_mode,
          reference_number: dto.reference_number ?? null,
          payment_date: new Date(dto.payment_date),
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Log payment activity
      await trx
        .insertInto('tenant_activities')
        .values({
          tenant_id: tenantId,
          activity_type: 'PAYMENT_RECEIVED',
          metadata: JSON.stringify({ performedBy: userId, paymentId: payment.id, amount: dto.amount }),
        })
        .execute();

      // Auto-settle oldest pending charges of matching type
      const pendingCharges = await trx
        .selectFrom('tenant_charges')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'PENDING')
        .orderBy('due_date', 'asc')
        .execute();

      let remainingAmount = dto.amount;
      for (const charge of pendingCharges) {
        if (remainingAmount <= 0) break;
        const chargeAmount = Number(charge.amount);
        if (chargeAmount <= remainingAmount) {
          await trx
            .updateTable('tenant_charges')
            .set({ status: 'PAID', updated_by: userId, updated_at: new Date() })
            .where('id', '=', charge.id)
            .execute();
          remainingAmount -= chargeAmount;
        }
      }

      return payment;
    });
  }

  // Deposit Transactions
  async getDepositTransactions(tenantId: string) {
    return this.db
      .selectFrom('tenant_deposit_transactions')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async addDepositTransaction(tenantId: string, userId: string, dto: AddDepositTransactionDto) {
    const tx = await this.db
      .insertInto('tenant_deposit_transactions')
      .values({
        tenant_id: tenantId,
        transaction_type: dto.transaction_type,
        amount: dto.amount.toString(),
        remarks: dto.remarks ?? null,
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('tenant_activities')
      .values({
        tenant_id: tenantId,
        activity_type: 'PAYMENT_RECEIVED',
        metadata: JSON.stringify({ performedBy: userId, depositTxId: tx.id, amount: dto.amount }),
      })
      .execute();

    return tx;
  }

  // Documents
  async getDocuments(tenantId: string) {
    return this.db
      .selectFrom('tenant_documents')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .execute();
  }

  async uploadDocument(tenantId: string, userId: string, file: Express.Multer.File, documentType: string) {
    const fileKey = `tenants/${tenantId}/${Date.now()}-${file.originalname}`;
    const result = await this.storageService.uploadFile(
      file.buffer,
      fileKey,
      file.mimetype,
    );

    const doc = await this.db
      .insertInto('tenant_documents')
      .values({
        tenant_id: tenantId,
        document_type: documentType,
        file_name: file.originalname,
        file_url: result.url,
        file_key: fileKey,
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('tenant_activities')
      .values({
        tenant_id: tenantId,
        activity_type: 'DOCUMENT_UPLOADED',
        metadata: JSON.stringify({ performedBy: userId, documentId: doc.id, documentType }),
      })
      .execute();

    return doc;
  }

  async verifyDocument(tenantId: string, docId: string, userId: string, verified: boolean) {
    const doc = await this.db
      .updateTable('tenant_documents')
      .set({ verified, verified_by: userId, updated_by: userId, updated_at: new Date() })
      .where('id', '=', docId)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('tenant_activities')
      .values({
        tenant_id: tenantId,
        activity_type: 'KYC_VERIFIED',
        metadata: JSON.stringify({ performedBy: userId, documentId: doc.id, verified }),
      })
      .execute();

    return doc;
  }

  // Agreements
  async getAgreements(tenantId: string) {
    return this.db
      .selectFrom('tenant_agreements')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('start_date', 'desc')
      .execute();
  }

  async createAgreement(tenantId: string, userId: string, dto: CreateAgreementDto) {
    const agr = await this.db
      .insertInto('tenant_agreements')
      .values({
        tenant_id: tenantId,
        agreement_number: dto.agreement_number ?? `AGR-${tenantId.slice(0, 8).toUpperCase()}-${Date.now()}`,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        rent_amount: dto.rent_amount.toString(),
        deposit_amount: dto.deposit_amount.toString(),
        document_id: dto.document_id ?? null,
        status: 'ACTIVE',
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('tenant_activities')
      .values({
        tenant_id: tenantId,
        activity_type: 'AGREEMENT_CREATED',
        metadata: JSON.stringify({ performedBy: userId, agreementId: agr.id }),
      })
      .execute();

    return agr;
  }

  // Communications
  async getCommunicationLogs(tenantId: string) {
    return this.db
      .selectFrom('tenant_communication_logs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async logCommunication(tenantId: string, userId: string, dto: LogCommunicationDto) {
    return this.db
      .insertInto('tenant_communication_logs')
      .values({
        tenant_id: tenantId,
        channel: dto.channel,
        direction: dto.direction,
        message: dto.message,
        sent_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // Stays & Room Transfers
  async getStays(tenantId: string) {
    return this.db
      .selectFrom('tenant_stays')
      .leftJoin('properties', 'properties.id', 'tenant_stays.property_id')
      .leftJoin('rooms', 'rooms.id', 'tenant_stays.room_id')
      .leftJoin('beds', 'beds.id', 'tenant_stays.bed_id')
      .select([
        'tenant_stays.id',
        'tenant_stays.start_date',
        'tenant_stays.end_date',
        'properties.name as property_name',
        'rooms.room_number',
        'beds.bed_label',
      ])
      .where('tenant_stays.tenant_id', '=', tenantId)
      .orderBy('tenant_stays.start_date', 'desc')
      .execute();
  }

  async getTransfers(tenantId: string) {
    return this.db
      .selectFrom('tenant_room_transfers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('transferred_at', 'desc')
      .execute();
  }

  async transferRoom(tenantId: string, userId: string, dto: RoomTransferDto) {
    return await this.db.transaction().execute(async (trx) => {
      // 1. Get active booking
      const booking = await trx
        .selectFrom('bookings')
        .select(['id', 'bed_id'])
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'ACTIVE')
        .executeTakeFirst();

      if (!booking) {
        throw new NotFoundException('No active booking found for tenant');
      }

      // 2. Verify new bed is vacant
      const newBed = await trx
        .selectFrom('beds')
        .leftJoin('rooms', 'rooms.id', 'beds.room_id')
        .leftJoin('floors', 'floors.id', 'rooms.floor_id')
        .select(['beds.id', 'beds.room_id', 'beds.status', 'floors.property_id'])
        .where('beds.id', '=', dto.to_bed_id)
        .executeTakeFirst();

      if (!newBed || newBed.status !== 'VACANT') {
        throw new BadRequestException('Target bed is not vacant or not found');
      }

      // 3. Get old bed details
      const oldBed = await trx
        .selectFrom('beds')
        .leftJoin('rooms', 'rooms.id', 'beds.room_id')
        .leftJoin('floors', 'floors.id', 'rooms.floor_id')
        .select(['beds.id', 'beds.room_id', 'floors.property_id'])
        .where('beds.id', '=', booking.bed_id)
        .executeTakeFirst();

      // 4. Update old bed status to VACANT
      await trx
        .updateTable('beds')
        .set({ status: 'VACANT', updated_at: new Date() })
        .where('id', '=', booking.bed_id)
        .execute();

      // 5. Update new bed status to OCCUPIED
      await trx
        .updateTable('beds')
        .set({ status: 'OCCUPIED', updated_at: new Date() })
        .where('id', '=', dto.to_bed_id)
        .execute();

      // 6. Update booking bed_id
      await trx
        .updateTable('bookings')
        .set({ bed_id: dto.to_bed_id, updated_at: new Date() })
        .where('id', '=', booking.id)
        .execute();

      // 7. Update stay history
      await trx
        .updateTable('tenant_stays')
        .set({ end_date: new Date() })
        .where('tenant_id', '=', tenantId)
        .where('end_date', 'is', null)
        .execute();

      await trx
        .insertInto('tenant_stays')
        .values({
          tenant_id: tenantId,
          property_id: newBed.property_id,
          room_id: newBed.room_id,
          bed_id: newBed.id,
          start_date: new Date(),
        })
        .execute();

      // 8. Record room transfer
      await trx
        .insertInto('tenant_room_transfers')
        .values({
          tenant_id: tenantId,
          from_property_id: oldBed?.property_id ?? null,
          from_room_id: oldBed?.room_id ?? null,
          from_bed_id: oldBed?.id ?? null,
          to_property_id: newBed.property_id,
          to_room_id: newBed.room_id,
          to_bed_id: newBed.id,
          reason: dto.reason ?? 'Operational transfer',
          transferred_by: userId,
        })
        .execute();

      // 9. Log activity
      await trx
        .insertInto('tenant_activities')
        .values({
          tenant_id: tenantId,
          activity_type: 'ROOM_TRANSFER',
          metadata: JSON.stringify({
            previousRoom: oldBed?.room_id ?? '',
            newRoom: newBed.room_id,
            performedBy: userId,
          }),
        })
        .execute();

      return { message: 'Room transfer completed successfully' };
    });
  }

  // Checkout Workflow
  async getCheckout(tenantId: string) {
    return this.db
      .selectFrom('tenant_checkouts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
  }

  async updateCheckout(tenantId: string, userId: string, dto: CheckoutDto) {
    return await this.db.transaction().execute(async (trx) => {
      // Find existing checkout
      const existing = await trx
        .selectFrom('tenant_checkouts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      const checkoutData: any = {
        notice_date: dto.notice_date ? new Date(dto.notice_date) : undefined,
        planned_exit_date: dto.planned_exit_date ? new Date(dto.planned_exit_date) : undefined,
        actual_exit_date: dto.actual_exit_date ? new Date(dto.actual_exit_date) : undefined,
        keys_returned: dto.keys_returned,
        room_inspected: dto.room_inspected,
        damage_found: dto.damage_found,
        damage_notes: dto.damage_notes,
        deposit_refunded: dto.deposit_refunded,
        checkout_status: dto.checkout_status,
        updated_by: userId,
        updated_at: new Date(),
      };

      let checkoutId = existing?.id;
      if (existing) {
        await trx
          .updateTable('tenant_checkouts')
          .set(checkoutData)
          .where('id', '=', existing.id)
          .execute();
      } else {
        const insertData = {
          ...checkoutData,
          tenant_id: tenantId,
          created_by: userId,
        };
        const inserted = await trx
          .insertInto('tenant_checkouts')
          .values(insertData)
          .returning('id')
          .executeTakeFirstOrThrow();
        checkoutId = inserted.id;
      }

      // If status changed to COMPLETED, do final check out
      if (dto.checkout_status === 'COMPLETED') {
        const booking = await trx
          .selectFrom('bookings')
          .select(['id', 'bed_id'])
          .where('tenant_id', '=', tenantId)
          .where('status', '=', 'ACTIVE')
          .executeTakeFirst();

        if (booking) {
          await trx
            .updateTable('bookings')
            .set({
              status: 'CHECKED_OUT',
              check_out_date: dto.actual_exit_date ? new Date(dto.actual_exit_date) : new Date(),
              updated_at: new Date(),
            })
            .where('id', '=', booking.id)
            .execute();

          await trx
            .updateTable('beds')
            .set({ status: 'VACANT', updated_at: new Date() })
            .where('id', '=', booking.bed_id)
            .execute();

          await trx
            .updateTable('tenant_stays')
            .set({ end_date: dto.actual_exit_date ? new Date(dto.actual_exit_date) : new Date() })
            .where('tenant_id', '=', tenantId)
            .where('end_date', 'is', null)
            .execute();

          await trx
            .updateTable('tenants')
            .set({ status: 'VACATED', updated_at: new Date() })
            .where('id', '=', tenantId)
            .execute();
        }

        await trx
          .insertInto('tenant_activities')
          .values({
            tenant_id: tenantId,
            activity_type: 'CHECKOUT',
            metadata: JSON.stringify({ performedBy: userId, checkoutId }),
          })
          .execute();
      } else if (dto.checkout_status === 'NOTICE_GIVEN') {
        await trx
          .updateTable('tenants')
          .set({ status: 'NOTICE', updated_at: new Date() })
          .where('id', '=', tenantId)
          .execute();

        await trx
          .insertInto('tenant_activities')
          .values({
            tenant_id: tenantId,
            activity_type: 'NOTICE_ISSUED',
            metadata: JSON.stringify({ performedBy: userId, checkoutId }),
          })
          .execute();
      }

      return { message: 'Checkout workflow status updated' };
    });
  }

  // Tags
  async getTags(tenantId: string) {
    return this.db
      .selectFrom('tenant_tags')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .execute();
  }

  async addTag(tenantId: string, tag: string) {
    return this.db
      .insertInto('tenant_tags')
      .values({ tenant_id: tenantId, tag })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async removeTag(tenantId: string, tagId: string) {
    await this.db
      .deleteFrom('tenant_tags')
      .where('id', '=', tagId)
      .where('tenant_id', '=', tenantId)
      .execute();
    return { message: 'Tag removed' };
  }

  // Activities
  async getActivities(tenantId: string) {
    return this.db
      .selectFrom('tenant_activities')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
  }
}
