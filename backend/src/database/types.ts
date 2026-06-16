import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

// 1. Enums
export type RoleEnum = 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER';
export type RoomTypeEnum = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORM';
export type RoomStatusEnum = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type BedStatusEnum = 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
export type DocumentTypeEnum =
  | 'AADHAAR'
  | 'PAN'
  | 'PHOTO'
  | 'AGREEMENT'
  | 'OTHER';
export type BookingStatusEnum = 'ACTIVE' | 'CHECKED_OUT' | 'TRANSFERRED';
export type RentStatusEnum = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type PaymentModeEnum = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
export type TicketPriorityEnum = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatusEnum =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CANCELLED';

// 2. Tables
export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  role: Generated<RoleEnum>;
  full_name: string;
  phone: string | null;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
  password_changed_at: Date | null;
}

export interface PropertiesTable {
  id: Generated<string>;
  name: string;
  address: string;
  city: string;
  pincode: string;
  owner_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface FloorsTable {
  id: Generated<string>;
  property_id: string;
  floor_number: number;
  floor_name: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface RoomsTable {
  id: Generated<string>;
  floor_id: string;
  room_number: string;
  room_type: RoomTypeEnum;
  monthly_rent: string;
  amenities: any | null; // jsonb
  status: Generated<RoomStatusEnum>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface BedsTable {
  id: Generated<string>;
  room_id: string;
  bed_label: string;
  status: Generated<BedStatusEnum>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface TenantsTable {
  id: Generated<string>;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  aadhaar_number: string | null;
  pan_number: string | null;
  date_of_birth: Date | null;
  occupation: string | null;
  permanent_address: string | null;
  created_by: string | null;
  status: Generated<string>;
  guardian_name: string | null;
  guardian_mobile: string | null;
  guardian_relation: string | null;
  gender: string | null;
  company_college: string | null;
  kyc_status: Generated<string>;
  police_verification_status: Generated<string>;
  lead_source: string | null;
  referred_by_tenant_id: string | null;
  blacklist_reason: string | null;
  blacklisted_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface TenantDocumentsTable {
  id: Generated<string>;
  tenant_id: string;
  document_type: string;
  file_name: string | null;
  file_url: string;
  file_key: string | null;
  verified: Generated<boolean>;
  verified_by: string | null;
  uploaded_at: Generated<Date>;
  created_at: Generated<Date>;
  created_by: string | null;
  updated_at: Generated<Date>;
  updated_by: string | null;
  deleted_at: Date | null;
}

export interface TenantChargesTable {
  id: Generated<string>;
  tenant_id: string;
  charge_type: string;
  amount: string;
  due_date: Date;
  status: Generated<string>;
  created_at: Generated<Date>;
  created_by: string | null;
  updated_at: Generated<Date>;
  updated_by: string | null;
}

export interface TenantPaymentsTable {
  id: Generated<string>;
  tenant_id: string;
  amount: string;
  payment_type: string;
  payment_mode: string;
  reference_number: string | null;
  payment_date: Date;
  created_at: Generated<Date>;
  created_by: string | null;
}

export interface TenantDepositTransactionsTable {
  id: Generated<string>;
  tenant_id: string;
  transaction_type: string;
  amount: string;
  remarks: string | null;
  created_at: Generated<Date>;
  created_by: string | null;
}

export interface TenantAgreementsTable {
  id: Generated<string>;
  tenant_id: string;
  agreement_number: string | null;
  start_date: Date;
  end_date: Date;
  rent_amount: string;
  deposit_amount: string;
  status: Generated<string>;
  document_id: string | null;
  agreement_alert_sent: Generated<boolean>;
  created_at: Generated<Date>;
  created_by: string | null;
  updated_at: Generated<Date>;
  updated_by: string | null;
}

export interface TenantTagsTable {
  id: Generated<string>;
  tenant_id: string;
  tag: string;
}

export interface TenantCheckoutsTable {
  id: Generated<string>;
  tenant_id: string;
  notice_date: Date | null;
  planned_exit_date: Date | null;
  actual_exit_date: Date | null;
  keys_returned: Generated<boolean>;
  room_inspected: Generated<boolean>;
  damage_found: Generated<boolean>;
  damage_notes: string | null;
  deposit_refunded: Generated<boolean>;
  checkout_status: Generated<string>;
  created_at: Generated<Date>;
  created_by: string | null;
  updated_at: Generated<Date>;
  updated_by: string | null;
}

export interface TenantNotesTable {
  id: Generated<string>;
  tenant_id: string;
  note: string;
  created_at: Generated<Date>;
  created_by: string | null;
  updated_at: Generated<Date>;
  updated_by: string | null;
}

export interface TenantRoomTransfersTable {
  id: Generated<string>;
  tenant_id: string;
  from_property_id: string | null;
  from_room_id: string | null;
  from_bed_id: string | null;
  to_property_id: string | null;
  to_room_id: string | null;
  to_bed_id: string | null;
  reason: string | null;
  transferred_by: string | null;
  transferred_at: Generated<Date>;
}

export interface TenantCommunicationLogsTable {
  id: Generated<string>;
  tenant_id: string;
  channel: string;
  direction: string;
  message: string;
  sent_by: string | null;
  created_at: Generated<Date>;
}

export interface TenantActivitiesTable {
  id: Generated<string>;
  tenant_id: string;
  activity_type: string;
  metadata: any;
  created_at: Generated<Date>;
}

export interface TenantStaysTable {
  id: Generated<string>;
  tenant_id: string;
  property_id: string | null;
  room_id: string | null;
  bed_id: string | null;
  start_date: Date;
  end_date: Date | null;
  created_at: Generated<Date>;
}

export interface BookingsTable {
  id: Generated<string>;
  tenant_id: string;
  bed_id: string;
  check_in_date: Date;
  check_out_date: Date | null;
  monthly_rent: string;
  security_deposit: string;
  billing_date: number;
  status: Generated<BookingStatusEnum>;
  notes: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface RentRecordsTable {
  id: Generated<string>;
  booking_id: string;
  tenant_id: string;
  period_month: number;
  period_year: number;
  rent_amount: string;
  paid_amount: Generated<string>;
  balance: Generated<string>;
  due_date: Date;
  status: Generated<RentStatusEnum>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface PaymentsTable {
  id: Generated<string>;
  rent_record_id: string;
  amount: string;
  payment_date: Generated<Date>;
  payment_mode: PaymentModeEnum;
  reference_number: string | null;
  receipt_url: string | null;
  collected_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface ExpenseCategoriesTable {
  id: Generated<string>;
  name: string;
  property_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface ExpensesTable {
  id: Generated<string>;
  property_id: string;
  category_id: string;
  title: string;
  amount: string;
  expense_date: Date;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface MaintenanceTicketsTable {
  id: Generated<string>;
  property_id: string;
  room_id: string | null;
  bed_id: string | null;
  title: string;
  description: string;
  priority: Generated<TicketPriorityEnum>;
  status: Generated<TicketStatusEnum>;
  reported_by: string | null;
  assigned_to: string | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  cost_incurred: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface VisitorsTable {
  id: Generated<string>;
  property_id: string;
  tenant_id: string | null;
  visitor_name: string;
  visitor_phone: string;
  purpose: string | null;
  check_in_time: Generated<Date>;
  check_out_time: Date | null;
  recorded_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
}

export interface AuditLogsTable {
  id: Generated<string>;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any | null; // jsonb
  new_values: any | null; // jsonb
  ip_address: string | null;
  created_at: Generated<Date>;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// 3. Database Schema Interface
export interface DB {
  users: UsersTable;
  properties: PropertiesTable;
  floors: FloorsTable;
  rooms: RoomsTable;
  beds: BedsTable;
  tenants: TenantsTable;
  tenant_documents: TenantDocumentsTable;
  tenant_charges: TenantChargesTable;
  tenant_payments: TenantPaymentsTable;
  tenant_deposit_transactions: TenantDepositTransactionsTable;
  tenant_agreements: TenantAgreementsTable;
  tenant_tags: TenantTagsTable;
  tenant_checkouts: TenantCheckoutsTable;
  tenant_notes: TenantNotesTable;
  tenant_room_transfers: TenantRoomTransfersTable;
  tenant_communication_logs: TenantCommunicationLogsTable;
  tenant_activities: TenantActivitiesTable;
  tenant_stays: TenantStaysTable;
  bookings: BookingsTable;
  rent_records: RentRecordsTable;
  payments: PaymentsTable;
  expense_categories: ExpenseCategoriesTable;
  expenses: ExpensesTable;
  maintenance_tickets: MaintenanceTicketsTable;
  visitors: VisitorsTable;
  audit_logs: AuditLogsTable;
  refresh_tokens: RefreshTokensTable;
}
