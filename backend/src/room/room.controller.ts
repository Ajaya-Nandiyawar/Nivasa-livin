import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('properties')
  findAllProperties() {
    return this.roomService.findAllProperties();
  }

  @Get('properties/:propertyId/floors')
  findFloorsByProperty(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.roomService.findFloorsByProperty(propertyId);
  }

  @Get('rooms')
  findRoomsByProperty(@Query('propertyId') propertyId: string) {
    if (!propertyId) {
      throw new BadRequestException('propertyId query parameter is required');
    }
    return this.roomService.findRoomsByProperty(propertyId);
  }

  @Post('rooms')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.roomService.createRoom(dto);
  }

  @Post('rooms/:id/beds')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  addAdditionalBed(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomService.addAdditionalBed(id);
  }

  @Patch('rooms/:id/rent')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  updateRoomRent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRentDto,
  ) {
    return this.roomService.updateRoomRent(id, dto);
  }

  @Patch('beds/:id/status')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  updateBedStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBedStatusDto,
  ) {
    return this.roomService.updateBedStatus(id, dto);
  }
}
