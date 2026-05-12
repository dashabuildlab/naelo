-- Додаткові колонки для practice_logs
ALTER TABLE practice_logs ADD COLUMN IF NOT EXISTS practice_id TEXT;
ALTER TABLE practice_logs ADD COLUMN IF NOT EXISTS duration_sec INTEGER DEFAULT 0;

-- Індекс для швидкого пошуку практик за датою
CREATE INDEX IF NOT EXISTS idx_practice_logs_completed ON practice_logs(user_id, completed_at DESC);
