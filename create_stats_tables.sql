-- Таблиця щоденних чекінів
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

-- Таблиця практик
CREATE TABLE IF NOT EXISTS practice_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  category     TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_logs_user ON practice_logs(user_id, completed_at DESC);

-- Таблиця профілів
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
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
