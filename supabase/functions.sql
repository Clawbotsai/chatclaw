-- Supabase edge functions for atomic counters
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
