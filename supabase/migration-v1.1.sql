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
