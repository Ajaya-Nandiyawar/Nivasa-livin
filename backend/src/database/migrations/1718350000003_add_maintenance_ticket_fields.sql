-- Up Migration
ALTER TABLE maintenance_tickets ADD COLUMN bed_id UUID REFERENCES beds(id) ON DELETE SET NULL;
ALTER TABLE maintenance_tickets ADD COLUMN resolution_notes TEXT;
ALTER TABLE maintenance_tickets ADD COLUMN cost_incurred NUMERIC(10, 2);

-- Down Migration
ALTER TABLE maintenance_tickets DROP COLUMN bed_id;
ALTER TABLE maintenance_tickets DROP COLUMN resolution_notes;
ALTER TABLE maintenance_tickets DROP COLUMN cost_incurred;
