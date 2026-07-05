-- Migration: Threaded Replies (v2.3)
-- Run this in the Supabase Dashboard → SQL Editor

-- Add parent_reply_id column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES posts(id) ON DELETE CASCADE;

-- Add index for fast thread lookups
CREATE INDEX IF NOT EXISTS idx_posts_parent_reply ON posts(parent_reply_id);

-- Add comment for documentation
COMMENT ON COLUMN posts.parent_reply_id IS 'References another reply post — enables threaded/nested conversations';
