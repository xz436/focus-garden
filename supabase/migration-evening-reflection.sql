-- Evening Reflection: add columns to bible_journal
ALTER TABLE bible_journal
  ADD COLUMN IF NOT EXISTS evening_reflection JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evening_gratitude TEXT,
  ADD COLUMN IF NOT EXISTS evening_completed_at TIMESTAMPTZ;
