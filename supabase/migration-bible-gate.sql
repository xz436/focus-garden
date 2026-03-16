-- Bible Gate feature: reading plan + journal tables
-- Run this migration in Supabase SQL Editor

-- 1. Bible reading plan (30-day Gospel of John)
CREATE TABLE IF NOT EXISTS bible_reading_plan (
  day_number INTEGER PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_start INTEGER NOT NULL,
  verse_end INTEGER NOT NULL,
  reference TEXT NOT NULL
);

-- 2. Bible journal (daily gate completion records)
CREATE TABLE IF NOT EXISTS bible_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_number INTEGER NOT NULL REFERENCES bible_reading_plan(day_number),
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_start INTEGER NOT NULL,
  verse_end INTEGER NOT NULL,
  passage_text TEXT,
  quiz_answers JSONB DEFAULT '[]'::jsonb,
  reflection_chat JSONB DEFAULT '[]'::jsonb,
  journal_entry TEXT,
  artwork_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE bible_reading_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_journal ENABLE ROW LEVEL SECURITY;

-- Reading plan is public read
CREATE POLICY "Anyone can read bible_reading_plan"
  ON bible_reading_plan FOR SELECT
  USING (true);

-- Journal: users can only access their own entries
CREATE POLICY "Users can read own bible_journal"
  ON bible_journal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bible_journal"
  ON bible_journal FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bible_journal"
  ON bible_journal FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_bible_journal_user_date ON bible_journal(user_id, date);

-- 3. Populate the 30-day Gospel of John reading plan
INSERT INTO bible_reading_plan (day_number, book, chapter, verse_start, verse_end, reference) VALUES
  (1,  'John', 1, 1, 5,   'John 1:1-5'),
  (2,  'John', 1, 6, 14,  'John 1:6-14'),
  (3,  'John', 1, 15, 28, 'John 1:15-28'),
  (4,  'John', 1, 29, 42, 'John 1:29-42'),
  (5,  'John', 1, 43, 51, 'John 1:43-51'),
  (6,  'John', 2, 1, 12,  'John 2:1-12'),
  (7,  'John', 2, 13, 25, 'John 2:13-25'),
  (8,  'John', 3, 1, 15,  'John 3:1-15'),
  (9,  'John', 3, 16, 21, 'John 3:16-21'),
  (10, 'John', 3, 22, 36, 'John 3:22-36'),
  (11, 'John', 4, 1, 14,  'John 4:1-14'),
  (12, 'John', 4, 15, 30, 'John 4:15-30'),
  (13, 'John', 4, 31, 54, 'John 4:31-54'),
  (14, 'John', 5, 1, 18,  'John 5:1-18'),
  (15, 'John', 5, 19, 30, 'John 5:19-30'),
  (16, 'John', 5, 31, 47, 'John 5:31-47'),
  (17, 'John', 6, 1, 15,  'John 6:1-15'),
  (18, 'John', 6, 16, 29, 'John 6:16-29'),
  (19, 'John', 6, 30, 51, 'John 6:30-51'),
  (20, 'John', 6, 52, 71, 'John 6:52-71'),
  (21, 'John', 7, 1, 24,  'John 7:1-24'),
  (22, 'John', 7, 25, 52, 'John 7:25-52'),
  (23, 'John', 8, 1, 20,  'John 8:1-20'),
  (24, 'John', 8, 21, 36, 'John 8:21-36'),
  (25, 'John', 8, 37, 59, 'John 8:37-59'),
  (26, 'John', 9, 1, 23,  'John 9:1-23'),
  (27, 'John', 9, 24, 41, 'John 9:24-41'),
  (28, 'John', 10, 1, 21, 'John 10:1-21'),
  (29, 'John', 10, 22, 42,'John 10:22-42'),
  (30, 'John', 11, 1, 27, 'John 11:1-27')
ON CONFLICT (day_number) DO NOTHING;
