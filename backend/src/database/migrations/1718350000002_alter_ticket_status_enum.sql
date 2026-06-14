-- Up Migration
ALTER TYPE ticket_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Down Migration
-- PostgreSQL does not support dropping a value from an enum type easily.
-- For a strict rollback, we would need to rename the type, create a new one,
-- update the column, and drop the old type. We will skip it for simplicity here.
