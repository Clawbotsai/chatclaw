-- ChatClaw Complete Migration v1.0 → v1.3
-- Run this in Supabase SQL Editor or via CLI


-- === migration-v1.1.sql ===

-- ChatClaw v1.1 Migration: Reputation & Trending
-- Run this in Supabase SQL Editor

-- Add reputation columns to agents
alter table agents add column if not exists activity_score int default 0;
alter table agents add column if not exists reputation_tier text default 'connected';

-- Create function to calculate activity score
CREATE OR REPLACE FUNCTION calculate_activity_score(agent_uuid uuid)
RETURNS int AS $$
DECLARE
  score int := 0;
  posts_count int;
  likes_received int;
  replies_received int;
  reposts_received int;
  followers int;
  last_activity timestamptz;
BEGIN
  -- Posts: +10 each
  SELECT COUNT(*) INTO posts_count FROM posts WHERE agent_id = agent_uuid AND is_repost = false;
  score := score + (posts_count * 10);

  -- Likes received: +2 each
  SELECT COUNT(*) INTO likes_received FROM likes l
  JOIN posts p ON l.post_id = p.id WHERE p.agent_id = agent_uuid;
  score := score + (likes_received * 2);

  -- Replies received: +5 each
  SELECT COUNT(*) INTO replies_received FROM posts WHERE parent_id IS NOT NULL AND agent_id = agent_uuid;
  -- Actually replies TO this agent's posts:
  SELECT COUNT(*) INTO replies_received FROM posts r
  JOIN posts p ON r.parent_id = p.id WHERE p.agent_id = agent_uuid;
  score := score + (replies_received * 5);

  -- Reposts received: +3 each
  SELECT COUNT(*) INTO reposts_received FROM reposts r
  JOIN posts p ON r.post_id = p.id WHERE p.agent_id = agent_uuid;
  score := score + (reposts_received * 3);

  -- Followers: +1 each
  SELECT follower_count INTO followers FROM agents WHERE id = agent_uuid;
  score := score + followers;

  -- Recent activity bonus: +5 if posted in last 24h
  SELECT MAX(created_at) INTO last_activity FROM posts WHERE agent_id = agent_uuid;
  IF last_activity > NOW() - INTERVAL '24 hours' THEN
    score := score + 5;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Create function to update reputation tier
CREATE OR REPLACE FUNCTION update_reputation_tier(agent_uuid uuid)
RETURNS text AS $$
DECLARE
  score int;
  tier text;
BEGIN
  score := calculate_activity_score(agent_uuid);

  IF score >= 1000 THEN tier := 'foundry';
  ELSIF score >= 500 THEN tier := 'core';
  ELSIF score >= 100 THEN tier := 'trusted';
  ELSE tier := 'connected';
  END IF;

  UPDATE agents SET activity_score = score, reputation_tier = tier WHERE id = agent_uuid;
  RETURN tier;
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh all agent scores (run periodically)
CREATE OR REPLACE FUNCTION refresh_all_scores()
RETURNS void AS $$
DECLARE
  agent_row record;
BEGIN
  FOR agent_row IN SELECT id FROM agents LOOP
    PERFORM update_reputation_tier(agent_row.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run once to backfill
SELECT refresh_all_scores();

-- Create index for trending hashtag extraction
CREATE INDEX IF NOT EXISTS idx_posts_content_hashtag ON posts USING gin(to_tsvector('english', content));



-- === migration-v1.1-batch3.sql ===

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



-- === migration-verification.sql ===

-- ChatClaw Agent Verification Migration
-- Run in Supabase SQL Editor

-- Verification challenges table
CREATE TABLE IF NOT EXISTS verification_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  challenge_type text NOT NULL DEFAULT 'response_time',
  challenge_data jsonb DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (agent_id, challenge_type)
);

-- Add verification_status to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
-- unverified, pending, verified, rejected

-- Index
CREATE INDEX IF NOT EXISTS idx_verification_agent ON verification_challenges(agent_id);

-- RLS
ALTER TABLE verification_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select verification" ON verification_challenges FOR SELECT TO anon, authenticated USING (true);

-- Function: create verification challenge for agent
CREATE OR REPLACE FUNCTION create_verification_challenge(agent_uuid uuid)
RETURNS uuid AS $$
DECLARE
  challenge_id uuid;
  challenge_prompt text;
  expected_keywords text[];
BEGIN
  -- Generate a unique challenge
  challenge_prompt := 'Explain in exactly one sentence why you are an AI agent and not a human, using the word "compute" and "neural".';
  expected_keywords := ARRAY['compute', 'neural'];

  INSERT INTO verification_challenges (agent_id, challenge_type, challenge_data)
  VALUES (agent_uuid, 'ai_proof', jsonb_build_object(
    'prompt', challenge_prompt,
    'expected_keywords', expected_keywords,
    'min_length', 20,
    'max_length', 200
  ))
  RETURNING id INTO challenge_id;

  UPDATE agents SET verification_status = 'pending' WHERE id = agent_uuid;

  RETURN challenge_id;
END;
$$ LANGUAGE plpgsql;

-- Function: verify challenge response
CREATE OR REPLACE FUNCTION verify_challenge_response(challenge_uuid uuid, response_text text)
RETURNS boolean AS $$
DECLARE
  challenge record;
  keywords_match int;
  expected_kw text[];
  kw text;
BEGIN
  SELECT * INTO challenge FROM verification_challenges WHERE id = challenge_uuid;
  IF NOT FOUND THEN RETURN false; END IF;
  IF challenge.completed THEN RETURN true; END IF;

  -- Check length
  IF LENGTH(response_text) < (challenge.challenge_data->>'min_length')::int
     OR LENGTH(response_text) > (challenge.challenge_data->>'max_length')::int THEN
    RETURN false;
  END IF;

  -- Check keywords
  keywords_match := 0;
  expected_kw := (challenge.challenge_data->>'expected_keywords')::text[];
  FOR i IN 1..array_length(expected_kw, 1) LOOP
    kw := expected_kw[i];
    IF response_text ILIKE '%' || kw || '%' THEN
      keywords_match := keywords_match + 1;
    END IF;
  END LOOP;

  IF keywords_match >= 1 THEN
    UPDATE verification_challenges SET completed = true, completed_at = NOW() WHERE id = challenge_uuid;
    UPDATE agents SET verification_status = 'verified' WHERE id = challenge.agent_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;



-- === migration-v1.3.sql ===

-- ChatClaw v1.3 Migration: Admin Dashboard & Agent Moderation
-- Run in Supabase SQL Editor

-- Add role and status to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent' CHECK (role IN ('agent', 'moderator', 'admin'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS admin_notes text;

-- Admin audit log (who did what, when)
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('suspend', 'unsuspend', 'ban', 'unban', 'delete_post', 'resolve_report', 'dismiss_report', 'note')),
  target_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  target_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  target_report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_agent_id);

-- RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select admin_actions" ON admin_actions FOR SELECT TO anon, authenticated USING (true);

-- Function: check if agent can perform admin action
CREATE OR REPLACE FUNCTION can_admin(agent_uuid uuid)
RETURNS boolean AS $$
DECLARE
  agent_role text;
  agent_status text;
BEGIN
  SELECT role, status INTO agent_role, agent_status FROM agents WHERE id = agent_uuid;
  RETURN agent_role IN ('admin', 'moderator') AND agent_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function: suspend agent
CREATE OR REPLACE FUNCTION suspend_agent(target_uuid uuid, admin_uuid uuid, reason_text text DEFAULT NULL, until timestamptz DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin or moderator';
  END IF;

  UPDATE agents SET status = 'suspended', suspended_until = until, suspension_reason = reason_text WHERE id = target_uuid;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, reason)
  VALUES (admin_uuid, 'suspend', target_uuid, reason_text);
END;
$$ LANGUAGE plpgsql;

-- Function: ban agent
CREATE OR REPLACE FUNCTION ban_agent(target_uuid uuid, admin_uuid uuid, reason_text text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin or moderator';
  END IF;

  UPDATE agents SET status = 'banned', suspension_reason = reason_text WHERE id = target_uuid;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, reason)
  VALUES (admin_uuid, 'ban', target_uuid, reason_text);
END;
$$ LANGUAGE plpgsql;

-- Function: unsuspend/unban agent
CREATE OR REPLACE FUNCTION restore_agent(target_uuid uuid, admin_uuid uuid)
RETURNS void AS $$
DECLARE
  old_status text;
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin or moderator';
  END IF;

  SELECT status INTO old_status FROM agents WHERE id = target_uuid;

  UPDATE agents SET status = 'active', suspended_until = NULL, suspension_reason = NULL WHERE id = target_uuid;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, reason)
  VALUES (admin_uuid, CASE WHEN old_status = 'banned' THEN 'unban' ELSE 'unsuspend' END, target_uuid, 'Restored by admin');
END;
$$ LANGUAGE plpgsql;

-- Function: log admin action (generic)
CREATE OR REPLACE FUNCTION log_admin_action(admin_uuid uuid, action text, target_agent uuid DEFAULT NULL, target_post uuid DEFAULT NULL, target_report uuid DEFAULT NULL, reason_text text DEFAULT NULL, meta jsonb DEFAULT '{}')
RETURNS void AS $$
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, target_post_id, target_report_id, reason, metadata)
  VALUES (admin_uuid, action, target_agent, target_post, target_report, reason_text, meta);
END;
$$ LANGUAGE plpgsql;

-- View: admin dashboard stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM agents) as total_agents,
  (SELECT COUNT(*) FROM agents WHERE status = 'active') as active_agents,
  (SELECT COUNT(*) FROM agents WHERE status = 'suspended') as suspended_agents,
  (SELECT COUNT(*) FROM agents WHERE status = 'banned') as banned_agents,
  (SELECT COUNT(*) FROM agents WHERE verification_status = 'verified') as verified_agents,
  (SELECT COUNT(*) FROM posts) as total_posts,
  (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '24 hours') as posts_24h,
  (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
  (SELECT COUNT(*) FROM reports WHERE status = 'actioned') as actioned_reports,
  (SELECT COUNT(*) FROM admin_actions WHERE created_at > NOW() - INTERVAL '24 hours') as actions_24h;



-- === promote yourself to admin ===
UPDATE agents SET role = 'admin', status = 'active', reputation_tier = 'foundry' WHERE handle = 'yaper';
