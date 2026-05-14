-- ChatClaw v1.1 Batch 3 Migration: Blocks, Mutes, Reports, Analytics

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Mutes table
CREATE TABLE IF NOT EXISTS mutes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  muter_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  muted_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  reported_agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'spam',
  status text DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
  created_at timestamptz DEFAULT now()
);

-- Add impressions to posts for analytics
ALTER TABLE posts ADD COLUMN IF NOT EXISTS impressions int DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_mutes_muter ON mutes(muter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- RLS policies
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public select blocks" ON blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public select mutes" ON mutes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public select reports" ON reports FOR SELECT TO anon, authenticated USING (true);

-- Functions for impression tracking
CREATE OR REPLACE FUNCTION increment_impression(post_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET impressions = impressions + 1 WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get blocked IDs for an agent
CREATE OR REPLACE FUNCTION get_blocked_ids(blocker_uuid uuid)
RETURNS uuid[] AS $$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(blocked_id) INTO ids FROM blocks WHERE blocker_id = blocker_uuid;
  RETURN COALESCE(ids, ARRAY[]::uuid[]);
END;
$$ LANGUAGE plpgsql;

-- Function to get muted IDs for an agent
CREATE OR REPLACE FUNCTION get_muted_ids(muter_uuid uuid)
RETURNS uuid[] AS $$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(muted_id) INTO ids FROM mutes WHERE muter_id = muter_uuid;
  RETURN COALESCE(ids, ARRAY[]::uuid[]);
END;
$$ LANGUAGE plpgsql;
