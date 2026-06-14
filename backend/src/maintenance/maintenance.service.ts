import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../core/mail/mail.service';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateTicketDto, userId: string) {
    return await this.db.transaction().execute(async (trx) => {
      const result = await trx
        .insertInto('maintenance_tickets')
        .values({
          property_id: dto.property_id,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          status: 'OPEN',
          reported_by: dto.reported_by || userId,
          room_id: dto.room_id || null,
          bed_id: dto.bed_id || null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      if (dto.priority === 'URGENT') {
        const adminEmail =
          this.configService.get<string>('SMTP_USER') ||
          'admin@nivasalivin.com';
        await this.mailService
          .sendMail(
            adminEmail,
            `URGENT MAINTENANCE ALERT: ${dto.title}`,
            `An urgent maintenance ticket has been opened.\nTitle: ${dto.title}\nDescription: ${dto.description}`,
          )
          .catch((err) =>
            this.logger.error('Failed to send urgent maintenance email', err),
          );
      }

      return { message: 'Ticket created successfully', id: result.id };
    });
  }

  async findAll(filter: MaintenanceFilterDto) {
    let query = this.db
      .selectFrom('maintenance_tickets')
      .leftJoin(
        'properties',
        'properties.id',
        'maintenance_tickets.property_id',
      )
      .leftJoin('rooms', 'rooms.id', 'maintenance_tickets.room_id')
      .select([
        'maintenance_tickets.id',
        'maintenance_tickets.property_id',
        'maintenance_tickets.room_id',
        'maintenance_tickets.bed_id',
        'maintenance_tickets.title',
        'maintenance_tickets.description',
        'maintenance_tickets.priority',
        'maintenance_tickets.status',
        'maintenance_tickets.reported_by',
        'maintenance_tickets.assigned_to',
        'maintenance_tickets.resolved_at',
        'maintenance_tickets.created_at',
        'maintenance_tickets.updated_at',
        'properties.name as property_name',
        'rooms.room_number as room_number',
      ])
      .where('maintenance_tickets.deleted_at', 'is', null);

    if (filter.property_id) {
      query = query.where('property_id', '=', filter.property_id);
    }
    if (filter.status) {
      query = query.where('status', '=', filter.status);
    }
    if (filter.priority) {
      query = query.where('priority', '=', filter.priority);
    }

    const limit = filter.limit || 20;
    const page = filter.page || 1;
    const offset = (page - 1) * limit;

    const data = await query
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc')
      .execute();

    return { data, page, limit };
  }

  async findOne(id: string) {
    const ticket = await this.db
      .selectFrom('maintenance_tickets')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.findOne(id);
    let newStatus = dto.status || ticket.status;

    // Automatically flip from OPEN to IN_PROGRESS when assigned
    if (dto.assigned_to && ticket.status === 'OPEN') {
      newStatus = 'IN_PROGRESS';
    }

    const result = await this.db
      .updateTable('maintenance_tickets')
      .set({
        status: newStatus,
        assigned_to: dto.assigned_to || ticket.assigned_to,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .executeTakeFirst();

    return { message: 'Ticket updated successfully' };
  }

  async resolve(id: string, dto: ResolveTicketDto, userId: string) {
    return await this.db.transaction().execute(async (trx) => {
      const ticket = await trx
        .selectFrom('maintenance_tickets')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.status === 'RESOLVED' || ticket.status === 'CANCELLED') {
        throw new BadRequestException(
          `Cannot resolve a ticket that is already ${ticket.status}`,
        );
      }

      // b. Update ticket status to RESOLVED
      await trx
        .updateTable('maintenance_tickets')
        .set({
          status: 'RESOLVED',
          resolution_notes: dto.resolution_notes,
          resolved_at: new Date(),
          cost_incurred: dto.cost_incurred
            ? dto.cost_incurred.toString()
            : null,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // c. Log expense if cost > 0
      if (dto.cost_incurred && dto.cost_incurred > 0) {
        // Find "Repairs" category
        const repairsCat = await trx
          .selectFrom('expense_categories')
          .select('id')
          .where('name', '=', 'Repairs')
          .executeTakeFirst();

        if (repairsCat) {
          await trx
            .insertInto('expenses')
            .values({
              property_id: ticket.property_id,
              category_id: repairsCat.id,
              title: `Maintenance Resolution: ${ticket.title}`,
              amount: dto.cost_incurred.toString(),
              expense_date: new Date(),
              notes: `Auto-generated from ticket ${ticket.id}. Notes: ${dto.resolution_notes}`,
              created_by: userId,
            })
            .execute();
        }
      }

      // d. Revert asset status if it was MAINTENANCE
      if (ticket.bed_id) {
        // Find if any ACTIVE bookings exist on this bed to know if it should be OCCUPIED or VACANT
        const activeBooking = await trx
          .selectFrom('bookings')
          .select('id')
          .where('bed_id', '=', ticket.bed_id)
          .where('status', '=', 'ACTIVE')
          .where('deleted_at', 'is', null)
          .executeTakeFirst();

        const newBedStatus = activeBooking ? 'OCCUPIED' : 'VACANT';

        await trx
          .updateTable('beds')
          .set({ status: newBedStatus, updated_at: new Date() })
          .where('id', '=', ticket.bed_id)
          .where('status', '=', 'MAINTENANCE') // only revert if it is currently MAINTENANCE
          .execute();
      }

      if (ticket.room_id) {
        // Determine room status based on beds (naive check)
        await trx
          .updateTable('rooms')
          .set({ status: 'AVAILABLE', updated_at: new Date() })
          .where('id', '=', ticket.room_id)
          .where('status', '=', 'MAINTENANCE')
          .execute();
      }

      return { message: 'Ticket resolved successfully' };
    });
  }
}
