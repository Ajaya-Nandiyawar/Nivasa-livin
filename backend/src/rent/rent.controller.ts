import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RentService } from './rent.service';
import { RentFilterDto } from './dto/rent-filter.dto';
import { PaymentDto } from './dto/payment.dto';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('rent')
export class RentController {
  constructor(private readonly rentService: RentService) {}

  @Get()
  findAll(@Query() filterDto: RentFilterDto) {
    return this.rentService.findAll(filterDto);
  }

  @Get('due')
  findDue() {
    return this.rentService.findDue();
  }

  @Post('generate')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  generateMonthlyRent() {
    return this.rentService.manualGenerateRent();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentService.findOne(id);
  }

  @Post(':id/payment')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() paymentDto: PaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rentService.recordPayment(id, paymentDto, user.sub);
  }

  @Get(':id/receipt')
  getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentService.getReceipt(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  create(@Body() createRentDto: CreateRentDto) {
    return this.rentService.create(createRentDto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRentDto: UpdateRentDto,
  ) {
    return this.rentService.update(id, updateRentDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentService.remove(id);
  }
}
