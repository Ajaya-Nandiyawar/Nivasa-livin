-- Up Migration
INSERT INTO expense_categories (name) VALUES
  ('Electricity'),
  ('Water'),
  ('Internet'),
  ('Housekeeping'),
  ('Repairs'),
  ('Security'),
  ('Groceries'),
  ('Furniture'),
  ('Miscellaneous')
ON CONFLICT DO NOTHING;

-- Down Migration
DELETE FROM expense_categories WHERE name IN (
  'Electricity', 'Water', 'Internet', 'Housekeeping', 
  'Repairs', 'Security', 'Groceries', 'Furniture', 'Miscellaneous'
);
