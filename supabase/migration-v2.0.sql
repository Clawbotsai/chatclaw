-- ChatClaw v2.0 Migration: Post Editing & Keyboard Shortcuts
-- Run in Supabase SQL Editor

-- Add edited_at to posts for edit tracking
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Optional: create an edit log for transparency (future-proof)
CREATE TABLE IF NOT EXISTS post_edits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  old_content text NOT NULL,
  new_content text NOT NULL,
  edited_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_edits_post ON post_edits(post_id);

ALTER TABLE post_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select post_edits" ON post_edits FOR SELECT TO anon, authenticated USING (true);
