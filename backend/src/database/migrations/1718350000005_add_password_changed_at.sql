-- Up Migration
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE NULL;

-- Down Migration
ALTER TABLE users DROP COLUMN password_changed_at;
