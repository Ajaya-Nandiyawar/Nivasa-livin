import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantFilterDto } from './dto/tenant-filter.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { StorageService } from '../core/storage/storage.service';

@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  findAll(@Query() filterDto: TenantFilterDto) {
    return this.tenantService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.softDelete(id);
  }

  @Get(':id/documents')
  getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getDocuments(id);
  }

  @Post(':id/documents')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileName = `tenants/${id}/${Date.now()}-${file.originalname}`;
    const result = await this.storageService.uploadFile(file.buffer, fileName, file.mimetype);
    // In a real implementation, we would insert a record into the 'documents' table here
    return { message: 'Document uploaded', url: result.url };
  }
}
