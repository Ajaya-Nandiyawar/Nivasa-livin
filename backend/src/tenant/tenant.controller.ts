import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantService } from './tenant.service';
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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  create(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantService.create(createTenantDto, user.sub);
  }

  @Get()
  findAll(@Query() filterDto: TenantFilterDto) {
    return this.tenantService.findAll(filterDto);
  }

  @Get('kpis')
  getKPIs() {
    return this.tenantService.getKPIs();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantService.update(id, updateTenantDto, user.sub);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.softDelete(id);
  }

  // Notes
  @Get(':id/notes')
  getNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getNotes(id);
  }

  @Post(':id/notes')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddNoteDto,
  ) {
    return this.tenantService.addNote(id, user.sub, dto);
  }

  // Charges
  @Get(':id/charges')
  getCharges(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getCharges(id);
  }

  @Post(':id/charges')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  addCharge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddChargeDto,
  ) {
    return this.tenantService.addCharge(id, user.sub, dto);
  }

  @Patch(':id/charges/:chargeId/status')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  updateChargeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chargeId', ParseUUIDPipe) chargeId: string,
    @CurrentUser() user: JwtPayload,
    @Body('status') status: string,
  ) {
    return this.tenantService.updateChargeStatus(id, chargeId, user.sub, status);
  }

  // Payments
  @Get(':id/payments')
  getPayments(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getPayments(id);
  }

  @Post(':id/payments')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddPaymentDto,
  ) {
    return this.tenantService.addPayment(id, user.sub, dto);
  }

  // Deposit Transactions
  @Get(':id/deposit-transactions')
  getDepositTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getDepositTransactions(id);
  }

  @Post(':id/deposit-transactions')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  addDepositTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddDepositTransactionDto,
  ) {
    return this.tenantService.addDepositTransaction(id, user.sub, dto);
  }

  // Documents
  @Get(':id/documents')
  getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getDocuments(id);
  }

  @Post(':id/documents')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('document_type') documentType: string,
  ) {
    return this.tenantService.uploadDocument(id, user.sub, file, documentType || 'OTHER');
  }

  @Patch(':id/documents/:docId/verify')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  verifyDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: JwtPayload,
    @Body('verified') verified: boolean,
  ) {
    return this.tenantService.verifyDocument(id, docId, user.sub, verified);
  }

  // Agreements
  @Get(':id/agreements')
  getAgreements(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getAgreements(id);
  }

  @Post(':id/agreements')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  createAgreement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAgreementDto,
  ) {
    return this.tenantService.createAgreement(id, user.sub, dto);
  }

  // Communications
  @Get(':id/communication-logs')
  getCommunicationLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getCommunicationLogs(id);
  }

  @Post(':id/communication-logs')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  logCommunication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LogCommunicationDto,
  ) {
    return this.tenantService.logCommunication(id, user.sub, dto);
  }

  // Stays & Transfers
  @Get(':id/stays')
  getStays(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getStays(id);
  }

  @Get(':id/transfers')
  getTransfers(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getTransfers(id);
  }

  @Post(':id/transfer')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  transferRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RoomTransferDto,
  ) {
    return this.tenantService.transferRoom(id, user.sub, dto);
  }

  // Checkouts
  @Get(':id/checkout')
  getCheckout(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getCheckout(id);
  }

  @Post(':id/checkout')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  updateCheckout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckoutDto,
  ) {
    return this.tenantService.updateCheckout(id, user.sub, dto);
  }

  // Tags
  @Get(':id/tags')
  getTags(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getTags(id);
  }

  @Post(':id/tags')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  addTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('tag') tag: string,
  ) {
    return this.tenantService.addTag(id, tag);
  }

  @Delete(':id/tags/:tagId')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.tenantService.removeTag(id, tagId);
  }

  // Activities
  @Get(':id/activities')
  getActivities(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getActivities(id);
  }
}
