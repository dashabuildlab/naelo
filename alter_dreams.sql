ALTER TABLE dreams ADD COLUMN IF NOT EXISTS why TEXT;
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS deadline TEXT;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dreams' ORDER BY ordinal_position;
