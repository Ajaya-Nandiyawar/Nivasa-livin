import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';
import type { BedStatusEnum } from '../database/types';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAllProperties() {
    return await this.db
      .selectFrom('properties')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async findFloorsByProperty(propertyId: string) {
    return await this.db
      .selectFrom('floors')
      .selectAll()
      .where('property_id', '=', propertyId)
      .where('deleted_at', 'is', null)
      .orderBy('floor_number', 'asc')
      .execute();
  }

  async findRoomsByProperty(propertyId: string) {
    const rooms = await this.db
      .selectFrom('rooms')
      .innerJoin('floors', 'floors.id', 'rooms.floor_id')
      .select([
        'rooms.id',
        'rooms.room_number',
        'rooms.room_type',
        'rooms.monthly_rent',
        'rooms.amenities',
        'rooms.status as room_status',
        'floors.id as floor_id',
        'floors.property_id as property_id',
        'floors.floor_number',
        'floors.floor_name',
      ])
      .where('floors.property_id', '=', propertyId)
      .where('rooms.deleted_at', 'is', null)
      .orderBy('rooms.room_number', 'asc')
      .execute();

    const roomIds = rooms.map((r) => r.id);
    let beds: any[] = [];

    if (roomIds.length > 0) {
      beds = await this.db
        .selectFrom('beds')
        .leftJoin('bookings', (join) =>
          join
            .onRef('bookings.bed_id', '=', 'beds.id')
            .on('bookings.status', '=', 'ACTIVE')
            .on('bookings.deleted_at', 'is', null),
        )
        .leftJoin('tenants', 'tenants.id', 'bookings.tenant_id')
        .select([
          'beds.id',
          'beds.room_id',
          'beds.bed_label',
          'beds.status',
          'tenants.full_name as tenant_name',
        ])
        .where('beds.room_id', 'in', roomIds)
        .where('beds.deleted_at', 'is', null)
        .orderBy('beds.bed_label', 'asc')
        .execute();
    }

    // Map beds to their respective rooms
    return rooms.map((room) => {
      const roomBeds = beds
        .filter((b) => b.room_id === room.id)
        .map((b) => ({
          id: b.id,
          label: b.bed_label,
          status: b.status,
          tenant: b.tenant_name || undefined,
        }));

      // Parse amenities
      let amenitiesList: string[] = [];
      if (room.amenities) {
        if (typeof room.amenities === 'string') {
          try {
            amenitiesList = JSON.parse(room.amenities);
          } catch (e) {
            amenitiesList = [];
          }
        } else if (Array.isArray(room.amenities)) {
          amenitiesList = room.amenities;
        }
      }

      return {
        id: room.id,
        roomNumber: room.room_number,
        type: room.room_type,
        monthlyRent: Number(room.monthly_rent),
        rent: `₹${Number(room.monthly_rent).toLocaleString('en-IN')}`,
        amenities: amenitiesList,
        status: room.room_status,
        floorId: room.floor_id,
        propertyId: room.property_id,
        floorNumber: room.floor_number,
        floorName: room.floor_name,
        beds: roomBeds,
      };
    });
  }

  async createRoom(dto: CreateRoomDto) {
    return await this.db.transaction().execute(async (trx) => {
      const amenitiesJson = Array.isArray(dto.amenities)
        ? JSON.stringify(dto.amenities)
        : JSON.stringify([]);

      const room = await trx
        .insertInto('rooms')
        .values({
          floor_id: dto.floor_id,
          room_number: dto.room_number,
          room_type: dto.room_type,
          monthly_rent: dto.monthly_rent.toString(),
          amenities: amenitiesJson,
          status: 'AVAILABLE',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const numBeds =
        {
          SINGLE: 1,
          DOUBLE: 2,
          TRIPLE: 3,
          DORM: 4,
        }[dto.room_type] || 1;

      for (let i = 0; i < numBeds; i++) {
        const char = String.fromCharCode(65 + i); // A, B, C, D...
        const label = `${dto.room_number}-${char}`;
        await trx
          .insertInto('beds')
          .values({
            room_id: room.id,
            bed_label: label,
            status: 'VACANT',
          })
          .execute();
      }

      return room;
    });
  }

  async addAdditionalBed(roomId: string) {
    return await this.db.transaction().execute(async (trx) => {
      const room = await trx
        .selectFrom('rooms')
        .select(['id', 'room_number'])
        .where('id', '=', roomId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const existingBeds = await trx
        .selectFrom('beds')
        .select('bed_label')
        .where('room_id', '=', roomId)
        .where('deleted_at', 'is', null)
        .execute();

      const nextIndex = existingBeds.length;
      const char = String.fromCharCode(65 + nextIndex); // Next alphabetical character
      const label = `${room.room_number}-${char}`;

      const newBed = await trx
        .insertInto('beds')
        .values({
          room_id: roomId,
          bed_label: label,
          status: 'VACANT',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return newBed;
    });
  }

  async updateRoomRent(roomId: string, dto: UpdateRentDto) {
    const result = await this.db
      .updateTable('rooms')
      .set({
        monthly_rent: dto.monthly_rent.toString(),
        updated_at: new Date(),
      })
      .where('id', '=', roomId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundException('Room not found');
    }

    return { message: 'Room rent updated successfully' };
  }

  async updateBedStatus(bedId: string, dto: UpdateBedStatusDto) {
    const result = await this.db
      .updateTable('beds')
      .set({
        status: dto.status,
        updated_at: new Date(),
      })
      .where('id', '=', bedId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new NotFoundException('Bed not found');
    }

    return { message: 'Bed status updated successfully' };
  }
}
