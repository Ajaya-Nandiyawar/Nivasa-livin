-- Up Migration

-- 1. Create Enums
CREATE TYPE role_enum AS ENUM ('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER', 'VIEWER');
CREATE TYPE room_type_enum AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'DORM');
CREATE TYPE room_status_enum AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE bed_status_enum AS ENUM ('VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');
CREATE TYPE document_type_enum AS ENUM ('AADHAAR', 'PAN', 'PHOTO', 'AGREEMENT', 'OTHER');
CREATE TYPE booking_status_enum AS ENUM ('ACTIVE', 'CHECKED_OUT', 'TRANSFERRED');
CREATE TYPE rent_status_enum AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');
CREATE TYPE payment_mode_enum AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');
CREATE TYPE ticket_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE ticket_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Tables

-- 1. users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role role_enum NOT NULL DEFAULT 'VIEWER',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE TRIGGER set_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. floors
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  floor_number INTEGER NOT NULL,
  floor_name VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_floors_property_id ON floors(property_id);
CREATE TRIGGER set_floors_updated_at BEFORE UPDATE ON floors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE RESTRICT,
  room_number VARCHAR(50) NOT NULL,
  room_type room_type_enum NOT NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL CHECK (monthly_rent >= 0),
  amenities JSONB,
  status room_status_enum NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_rooms_floor_id ON rooms(floor_id);
CREATE INDEX idx_rooms_property ON rooms(floor_id);
CREATE TRIGGER set_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. beds
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  bed_label VARCHAR(50) NOT NULL,
  status bed_status_enum NOT NULL DEFAULT 'VACANT',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_beds_room_id ON beds(room_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE TRIGGER set_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) UNIQUE NOT NULL,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  aadhaar_number VARCHAR(50),
  pan_number VARCHAR(50),
  date_of_birth DATE,
  occupation VARCHAR(255),
  permanent_address TEXT,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_tenants_created_by ON tenants(created_by);
CREATE INDEX idx_tenants_phone ON tenants(phone);
CREATE INDEX idx_tenants_aadhaar ON tenants(aadhaar_number);
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. tenant_documents
CREATE TABLE tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  document_type document_type_enum NOT NULL,
  file_url TEXT NOT NULL,
  file_key VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_tenant_documents_tenant_id ON tenant_documents(tenant_id);
CREATE TRIGGER set_tenant_docs_updated_at BEFORE UPDATE ON tenant_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL CHECK (monthly_rent >= 0),
  security_deposit DECIMAL(10, 2) NOT NULL CHECK (security_deposit >= 0),
  billing_date INTEGER NOT NULL CHECK (billing_date >= 1 AND billing_date <= 28),
  status booking_status_enum NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_bed_id ON bookings(bed_id);
CREATE INDEX idx_bookings_bed ON bookings(bed_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE TRIGGER set_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. rent_records
CREATE TABLE rent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL CHECK (rent_amount >= 0),
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status rent_status_enum NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_rent_records_booking_id ON rent_records(booking_id);
CREATE INDEX idx_rent_records_tenant_id ON rent_records(tenant_id);
CREATE INDEX idx_rent_period ON rent_records(period_year, period_month);
CREATE INDEX idx_rent_status ON rent_records(status);
CREATE INDEX idx_rent_due ON rent_records(due_date) WHERE status != 'PAID';
CREATE TRIGGER set_rent_records_updated_at BEFORE UPDATE ON rent_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10. payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_record_id UUID NOT NULL REFERENCES rent_records(id) ON DELETE RESTRICT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  payment_mode payment_mode_enum NOT NULL,
  reference_number VARCHAR(255),
  receipt_url TEXT,
  collected_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_payments_rent_record_id ON payments(rent_record_id);
CREATE INDEX idx_payments_collected_by ON payments(collected_by);
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. expense_categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_expense_cats_property_id ON expense_categories(property_id);
CREATE TRIGGER set_expense_cats_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 12. expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_date ON expenses(property_id, expense_date);
CREATE TRIGGER set_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. maintenance_tickets
CREATE TABLE maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_id UUID REFERENCES rooms(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority_enum NOT NULL DEFAULT 'MEDIUM',
  status ticket_status_enum NOT NULL DEFAULT 'OPEN',
  reported_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE RESTRICT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_maintenance_property_id ON maintenance_tickets(property_id);
CREATE INDEX idx_maintenance_room_id ON maintenance_tickets(room_id);
CREATE INDEX idx_maintenance_reported_by ON maintenance_tickets(reported_by);
CREATE INDEX idx_maintenance_assigned_to ON maintenance_tickets(assigned_to);
CREATE INDEX idx_maintenance_prop_status ON maintenance_tickets(property_id, status);
CREATE TRIGGER set_maintenance_updated_at BEFORE UPDATE ON maintenance_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(50) NOT NULL,
  purpose VARCHAR(255),
  check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMP NULL,
  recorded_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_visitors_property_id ON visitors(property_id);
CREATE INDEX idx_visitors_tenant_id ON visitors(tenant_id);
CREATE INDEX idx_visitors_recorded_by ON visitors(recorded_by);
CREATE TRIGGER set_visitors_updated_at BEFORE UPDATE ON visitors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 15. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);

-- 16. refresh_tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE TRIGGER set_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE refresh_tokens;
DROP TABLE audit_logs;
DROP TABLE visitors;
DROP TABLE maintenance_tickets;
DROP TABLE expenses;
DROP TABLE expense_categories;
DROP TABLE payments;
DROP TABLE rent_records;
DROP TABLE bookings;
DROP TABLE tenant_documents;
DROP TABLE tenants;
DROP TABLE beds;
DROP TABLE rooms;
DROP TABLE floors;
DROP TABLE properties;
DROP TABLE users;

DROP FUNCTION set_updated_at();

DROP TYPE ticket_status_enum;
DROP TYPE ticket_priority_enum;
DROP TYPE payment_mode_enum;
DROP TYPE rent_status_enum;
DROP TYPE booking_status_enum;
DROP TYPE document_type_enum;
DROP TYPE bed_status_enum;
DROP TYPE room_status_enum;
DROP TYPE room_type_enum;
DROP TYPE role_enum;
