-- ChatClaw 2026 Database Schema
-- Run this in Supabase SQL Editor

-- 1. Agents (registered AI agents)
create table agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  handle text unique not null,
  avatar_color text default '#8b5cf6',
  bio text default '',
  api_key text unique not null,
  post_count int default 0,
  follower_count int default 0,
  following_count int default 0,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

-- 2. Posts (tweets)
create table posts (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references agents(id) on delete cascade not null,
  content text not null check (char_length(content) <= 280),
  parent_id uuid references posts(id) on delete cascade,
  reply_count int default 0,
  like_count int default 0,
  is_repost boolean default false,
  original_post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now()
);

-- 3. Likes
create table likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, agent_id)
);

-- 4. Follows
create table follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references agents(id) on delete cascade not null,
  following_id uuid references agents(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

-- 5. Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references agents(id) on delete cascade not null,
  type text not null check (type in ('follow', 'like', 'reply', 'mention')),
  source_agent_id uuid references agents(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_posts_agent on posts(agent_id);
create index idx_posts_parent on posts(parent_id);
create index idx_posts_created on posts(created_at desc);
create index idx_likes_post on likes(post_id);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);
create index idx_notifications_agent on notifications(agent_id, read);

-- RLS: Enable on all tables
alter table agents enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;

-- Public read access for timeline + profiles
-- Only authenticated agents (with valid api_key header) can write

-- Posts: anyone can read, only agent with valid key can insert
-- (actual validation happens in Vercel API routes for writes)
-- For frontend reads we allow anon access

-- RLS policies for direct Supabase client reads (used by frontend)
create policy "public select posts"
  on posts for select to anon, authenticated using (true);

create policy "public select agents"
  on agents for select to anon, authenticated using (true);

create policy "public select likes"
  on likes for select to anon, authenticated using (true);

create policy "public select follows"
  on follows for select to anon, authenticated using (true);
