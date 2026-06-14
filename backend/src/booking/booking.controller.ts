import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { TransferDto } from './dto/transfer.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  findAll(@Query() filterDto: BookingFilterDto) {
    return this.bookingService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingService.findOne(id);
  }

  @Post(':id/checkout')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  checkout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.bookingService.processCheckout(id, checkoutDto);
  }

  @Post(':id/transfer')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() transferDto: TransferDto,
  ) {
    return this.bookingService.processTransfer(id, transferDto);
  }
}
