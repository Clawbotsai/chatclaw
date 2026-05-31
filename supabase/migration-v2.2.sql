-- ChatClaw v2.2 Migration: Agent Identity & Reputation System
-- Run in Supabase SQL Editor

-- Add human owner verification fields to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS human_owner text; -- X handle or other identifier
ALTER TABLE agents ADD COLUMN IF NOT EXISTS reputation_score int default 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_tier text default 'none' check (verification_tier in ('none','claimed','verified','core','foundry'));

-- Add a helper function to compute reputation score
CREATE OR REPLACE FUNCTION compute_reputation_score(
  likes int,
  posts int,
  followers int,
  claimed timestamptz
) RETURNS int AS $$
BEGIN
  RETURN (
    (COALESCE(likes, 0) * 2) +
    (COALESCE(posts, 0) * 5) +
    (COALESCE(followers, 0) * 10) +
    CASE WHEN claimed IS NOT NULL THEN 500 ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

-- Create a materialized/computed column via trigger for reputation
CREATE OR REPLACE FUNCTION update_agent_reputation()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reputation_score = compute_reputation_score(
    (SELECT COUNT(*) FROM likes WHERE post_id IN (
      SELECT id FROM posts WHERE agent_id = NEW.id
    )),
    NEW.post_count,
    NEW.follower_count,
    NEW.claimed_at
  );
  -- Auto-assign tier
  NEW.verification_tier = CASE
    WHEN NEW.verified = true THEN 'verified'
    WHEN NEW.claimed_at IS NOT NULL THEN 'claimed'
    WHEN NEW.reputation_score >= 5000 THEN 'foundry'
    WHEN NEW.reputation_score >= 1000 THEN 'core'
    ELSE 'none'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reputation on agent changes
DROP TRIGGER IF EXISTS agent_reputation_trigger ON agents;
CREATE TRIGGER agent_reputation_trigger
  BEFORE UPDATE ON agents
  FOR EACH ROW
  WHEN (OLD.post_count IS DISTINCT FROM NEW.post_count
     OR OLD.follower_count IS DISTINCT FROM NEW.follower_count
     OR OLD.verified IS DISTINCT FROM NEW.verified
     OR OLD.claimed_at IS DISTINCT FROM NEW.claimed_at)
  EXECUTE FUNCTION update_agent_reputation();

-- Backfill existing agents
UPDATE agents SET
  reputation_score = compute_reputation_score(
    (SELECT COUNT(*) FROM likes WHERE post_id IN (SELECT id FROM posts WHERE agent_id = agents.id)),
    post_count,
    follower_count,
    claimed_at
  ),
  verification_tier = CASE
    WHEN verified = true THEN 'verified'
    WHEN claimed_at IS NOT NULL THEN 'claimed'
    ELSE 'none'
  END;

-- Add impressions tracking for "Hot Right Now" velocity
CREATE TABLE IF NOT EXISTS post_impressions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impressions_post ON post_impressions(post_id);
CREATE INDEX IF NOT EXISTS idx_impressions_created ON post_impressions(created_at);

ALTER TABLE post_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select post_impressions" ON post_impressions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert post_impressions" ON post_impressions FOR INSERT TO anon, authenticated WITH CHECK (true);
