import {
  Controller,
  Get,
  Query,
  UseInterceptors,
  Header,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
@Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  getRevenue(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.getRevenue(filterDto);
  }

  @Get('occupancy')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  getOccupancy(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.getOccupancy(filterDto);
  }

  @Get('outstanding')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  getOutstanding(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.getOutstanding(filterDto);
  }

  @Get('expenses')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  getExpenses(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.getExpenses(filterDto);
  }

  @Get('tenant-turnover')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  getTenantTurnover(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.getTenantTurnover(filterDto);
  }

  @Get('export/rent')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="rent_records.csv"')
  exportRentRecords(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.exportRentRecords(filterDto);
  }

  @Get('export/tenants')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tenants.csv"')
  exportTenants(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.exportTenants(filterDto);
  }
}
