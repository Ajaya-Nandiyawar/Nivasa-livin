-- Up Migration

-- 1. Alter tenants table
ALTER TABLE tenants ADD COLUMN guardian_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN guardian_mobile VARCHAR(50);
ALTER TABLE tenants ADD COLUMN guardian_relation VARCHAR(100);
ALTER TABLE tenants ADD COLUMN gender VARCHAR(50);
ALTER TABLE tenants ADD COLUMN company_college VARCHAR(255);
ALTER TABLE tenants ADD COLUMN kyc_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE tenants ADD COLUMN police_verification_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE tenants ADD COLUMN lead_source VARCHAR(100);
ALTER TABLE tenants ADD COLUMN referred_by_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN blacklist_reason TEXT;
ALTER TABLE tenants ADD COLUMN blacklisted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- 2. Alter tenant_documents table (convert document_type to VARCHAR for flexibility)
ALTER TABLE tenant_documents ALTER COLUMN document_type TYPE VARCHAR(50);
ALTER TABLE tenant_documents ADD COLUMN file_name VARCHAR(255);
ALTER TABLE tenant_documents ADD COLUMN verified BOOLEAN DEFAULT FALSE;
ALTER TABLE tenant_documents ADD COLUMN verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tenant_documents ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tenant_documents ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Create tenant_charges table
CREATE TABLE tenant_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  charge_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Create tenant_payments table
CREATE TABLE tenant_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_type VARCHAR(50) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Create tenant_deposit_transactions table
CREATE TABLE tenant_deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Create tenant_agreements table
CREATE TABLE tenant_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agreement_number VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL CHECK (rent_amount >= 0),
  deposit_amount DECIMAL(10, 2) NOT NULL CHECK (deposit_amount >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  document_id UUID REFERENCES tenant_documents(id) ON DELETE SET NULL,
  agreement_alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Create tenant_tags table
CREATE TABLE tenant_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL
);

-- 8. Create tenant_checkouts table
CREATE TABLE tenant_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notice_date DATE,
  planned_exit_date DATE,
  actual_exit_date DATE,
  keys_returned BOOLEAN NOT NULL DEFAULT FALSE,
  room_inspected BOOLEAN NOT NULL DEFAULT FALSE,
  damage_found BOOLEAN NOT NULL DEFAULT FALSE,
  damage_notes TEXT,
  deposit_refunded BOOLEAN NOT NULL DEFAULT FALSE,
  checkout_status VARCHAR(50) NOT NULL DEFAULT 'NOTICE_GIVEN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Create tenant_notes table
CREATE TABLE tenant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Create tenant_room_transfers table
CREATE TABLE tenant_room_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  from_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  from_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  to_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  to_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  to_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  reason TEXT,
  transferred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Create tenant_communication_logs table
CREATE TABLE tenant_communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  direction VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Create tenant_activities table
CREATE TABLE tenant_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Create tenant_stays table
CREATE TABLE tenant_stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Create triggers for set_updated_at on the new tables
CREATE TRIGGER set_tenant_charges_updated_at BEFORE UPDATE ON tenant_charges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tenant_agreements_updated_at BEFORE UPDATE ON tenant_agreements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tenant_checkouts_updated_at BEFORE UPDATE ON tenant_checkouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tenant_notes_updated_at BEFORE UPDATE ON tenant_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 15. Create indexes for performance
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenant_charges_tenant_id ON tenant_charges(tenant_id);
CREATE INDEX idx_tenant_charges_status ON tenant_charges(status);
CREATE INDEX idx_tenant_payments_tenant_id ON tenant_payments(tenant_id);
CREATE INDEX idx_tenant_deposit_transactions_tenant_id ON tenant_deposit_transactions(tenant_id);
CREATE INDEX idx_tenant_agreements_tenant_id ON tenant_agreements(tenant_id);
CREATE INDEX idx_tenant_agreements_status ON tenant_agreements(status);
CREATE INDEX idx_tenant_tags_tenant_id ON tenant_tags(tenant_id);
CREATE INDEX idx_tenant_checkouts_status ON tenant_checkouts(checkout_status);
CREATE INDEX idx_tenant_notes_tenant_id ON tenant_notes(tenant_id);
CREATE INDEX idx_tenant_room_transfers_tenant_id ON tenant_room_transfers(tenant_id);
CREATE INDEX idx_tenant_communication_logs_tenant_id ON tenant_communication_logs(tenant_id);
CREATE INDEX idx_tenant_activities_tenant_id ON tenant_activities(tenant_id);
CREATE INDEX idx_tenant_stays_tenant_id ON tenant_stays(tenant_id);

-- Down Migration

DROP TABLE IF EXISTS tenant_stays CASCADE;
DROP TABLE IF EXISTS tenant_activities CASCADE;
DROP TABLE IF EXISTS tenant_communication_logs CASCADE;
DROP TABLE IF EXISTS tenant_room_transfers CASCADE;
DROP TABLE IF EXISTS tenant_notes CASCADE;
DROP TABLE IF EXISTS tenant_checkouts CASCADE;
DROP TABLE IF EXISTS tenant_tags CASCADE;
DROP TABLE IF EXISTS tenant_agreements CASCADE;
DROP TABLE IF EXISTS tenant_deposit_transactions CASCADE;
DROP TABLE IF EXISTS tenant_payments CASCADE;
DROP TABLE IF EXISTS tenant_charges CASCADE;

ALTER TABLE tenant_documents DROP COLUMN IF EXISTS updated_by;
ALTER TABLE tenant_documents DROP COLUMN IF EXISTS created_by;
ALTER TABLE tenant_documents DROP COLUMN IF EXISTS verified_by;
ALTER TABLE tenant_documents DROP COLUMN IF EXISTS verified;
ALTER TABLE tenant_documents DROP COLUMN IF EXISTS file_name;

ALTER TABLE tenants DROP COLUMN IF EXISTS blacklisted_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS blacklist_reason;
ALTER TABLE tenants DROP COLUMN IF EXISTS referred_by_tenant_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS lead_source;
ALTER TABLE tenants DROP COLUMN IF EXISTS police_verification_status;
ALTER TABLE tenants DROP COLUMN IF EXISTS kyc_status;
ALTER TABLE tenants DROP COLUMN IF EXISTS company_college;
ALTER TABLE tenants DROP COLUMN IF EXISTS gender;
ALTER TABLE tenants DROP COLUMN IF EXISTS guardian_relation;
ALTER TABLE tenants DROP COLUMN IF EXISTS guardian_mobile;
ALTER TABLE tenants DROP COLUMN IF EXISTS guardian_name;
