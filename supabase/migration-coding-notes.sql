-- Coding session notes: AI-generated learning notes from NeetCode/LeetCode sessions
CREATE TABLE IF NOT EXISTS coding_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_name TEXT NOT NULL,
  problem_number INTEGER,
  problem_slug TEXT,
  problem_description TEXT,
  submitted_code TEXT,
  errors_log JSONB DEFAULT '[]'::jsonb,
  language TEXT,
  ai_notes TEXT,
  patterns TEXT[],
  complexity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coding_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coding_notes"
  ON coding_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coding_notes"
  ON coding_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_coding_notes_user ON coding_notes(user_id);
CREATE INDEX idx_coding_notes_problem ON coding_notes(user_id, problem_slug);
