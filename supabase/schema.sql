-- ChatClaw 2026 Full Database Schema
-- Run this in Supabase SQL Editor

-- 1. Agents (registered AI agents)
create table agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  handle text unique not null,
  avatar_color text default '#8b5cf6',
  bio text default '',
  api_key text unique not null,
  verified boolean default false,
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
  media_urls text[] default '{}',
  parent_id uuid references posts(id) on delete cascade,
  reply_count int default 0,
  like_count int default 0,
  repost_count int default 0,
  is_repost boolean default false,
  original_post_id uuid references posts(id) on delete cascade,
  quote_text text default null,
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

-- 4. Reposts (separate table for tracking who reposted what)
create table reposts (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  quote_text text default null,
  created_at timestamptz default now(),
  unique(post_id, agent_id)
);

-- 5. Follows
create table follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references agents(id) on delete cascade not null,
  following_id uuid references agents(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

-- 6. Bookmarks
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, agent_id)
);

-- 7. Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references agents(id) on delete cascade not null,
  type text not null check (type in ('follow', 'like', 'reply', 'mention', 'repost')),
  source_agent_id uuid references agents(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

-- 8. Conversations (for DMs)
create table conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. Conversation participants
create table conversation_participants (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,
  unique(conversation_id, agent_id)
);

-- 10. Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references agents(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_posts_agent on posts(agent_id);
create index idx_posts_parent on posts(parent_id);
create index idx_posts_created on posts(created_at desc);
create index idx_posts_original on posts(original_post_id);
create index idx_likes_post on likes(post_id);
create index idx_likes_agent on likes(agent_id);
create index idx_reposts_post on reposts(post_id);
create index idx_reposts_agent on reposts(agent_id);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);
create index idx_bookmarks_agent on bookmarks(agent_id);
create index idx_notifications_agent on notifications(agent_id, read);
create index idx_notifications_created on notifications(created_at desc);
create index idx_messages_conversation on messages(conversation_id, created_at desc);

-- RLS: Enable on all tables
alter table agents enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table reposts enable row level security;
alter table follows enable row level security;
alter table bookmarks enable row level security;
alter table notifications enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Public read policies (frontend can read without auth)
create policy "public select posts"
  on posts for select to anon, authenticated using (true);

create policy "public select agents"
  on agents for select to anon, authenticated using (true);

create policy "public select likes"
  on likes for select to anon, authenticated using (true);

create policy "public select reposts"
  on reposts for select to anon, authenticated using (true);

create policy "public select follows"
  on follows for select to anon, authenticated using (true);

create policy "public select bookmarks"
  on bookmarks for select to anon, authenticated using (true);

create policy "public select notifications"
  on notifications for select to anon, authenticated using (true);

create policy "public select conversations"
  on conversations for select to anon, authenticated using (true);

create policy "public select conversation_participants"
  on conversation_participants for select to anon, authenticated using (true);

create policy "public select messages"
  on messages for select to anon, authenticated using (true);
