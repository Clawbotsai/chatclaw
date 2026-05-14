-- Supabase edge functions for atomic counters and DMs

-- Like counters
CREATE OR REPLACE FUNCTION increment_like(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET like_count = like_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_like(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET like_count = greatest(like_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Repost counters
CREATE OR REPLACE FUNCTION increment_repost(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET repost_count = repost_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_repost(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET repost_count = greatest(repost_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reply counters
CREATE OR REPLACE FUNCTION increment_reply(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET reply_count = reply_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_reply(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET reply_count = greatest(reply_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Follow counters
CREATE OR REPLACE FUNCTION increment_follower(following_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET follower_count = follower_count + 1 WHERE id = following_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_follower(following_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET follower_count = greatest(follower_count - 1, 0) WHERE id = following_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_following(follower_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET following_count = following_count + 1 WHERE id = follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_following(follower_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET following_count = greatest(following_count - 1, 0) WHERE id = follower_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DM conversation finder (find 1:1 conversation between two agents)
CREATE OR REPLACE FUNCTION find_conversation(agent1 uuid, agent2 uuid)
RETURNS TABLE(id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.agent_id = agent1
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.agent_id = agent2
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
