-- Up Migration
ALTER TABLE tenants ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

-- Down Migration
ALTER TABLE tenants DROP COLUMN status;
