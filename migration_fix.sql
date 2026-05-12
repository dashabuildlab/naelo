-- Міграція для виправлення відсутніх таблиць та колонок
-- (2026-05-08)

-- 1. Створити profiles (відсутня в production)
CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT PRIMARY KEY,
  name           TEXT,
  score          INTEGER DEFAULT 50,
  streak         INTEGER DEFAULT 0,
  goal           TEXT,
  energy_drains  TEXT,
  drains_text    TEXT,
  concerns       TEXT,
  concerns_text  TEXT,
  givers_text    TEXT,
  energy_givers  TEXT,
  momentum       INTEGER DEFAULT 0,
  last_activity  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Додати колонки які могли бути відсутні
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS momentum INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

-- 3. Створити daily_checkins
CREATE TABLE IF NOT EXISTS daily_checkins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  date       DATE NOT NULL,
  energy     INTEGER NOT NULL DEFAULT 50,
  note       TEXT,
  question   TEXT,
  hints      TEXT,
  delta      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON daily_checkins(user_id, date DESC);

-- 4. Створити practice_logs
CREATE TABLE IF NOT EXISTS practice_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  category     TEXT NOT NULL,
  practice_id  TEXT,
  duration_sec INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_logs_user ON practice_logs(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_logs_completed ON practice_logs(user_id, completed_at DESC);

-- Verify
\dt
