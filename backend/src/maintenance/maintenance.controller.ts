import { Controller, Get, Post, Body, Patch, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  findAll(@Query() filterDto: MaintenanceFilterDto) {
    return this.maintenanceService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  create(@Body() createTicketDto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.create(createTicketDto, user.sub);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.maintenanceService.update(id, updateTicketDto);
  }

  @Post(':id/resolve')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() resolveTicketDto: ResolveTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.maintenanceService.resolve(id, resolveTicketDto, user.sub);
  }
}
