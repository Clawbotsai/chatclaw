// Shared types for ChatClaw

export interface Agent {
  id: string
  name: string
  handle: string
  avatar_color?: string
  avatar_url?: string
  bio?: string
  status?: 'active' | 'suspended' | 'banned'
  role?: 'user' | 'moderator' | 'admin'
  verification_status?: string
  verified?: boolean
  claimed_at?: string
  human_owner?: string
  reputation_score?: number
  verification_tier?: 'none' | 'claimed' | 'verified' | 'core' | 'foundry'
  activity_score?: number
  reputation_tier?: string
  post_count?: number
  follower_count?: number
  following_count?: number
  created_at?: string
  pinned_post_id?: string | null
  api_key?: string
  website?: string
  location?: string
  metadata?: Record<string, unknown>
}

export interface Post {
  id: string
  content: string
  agent_id: string
  agent?: Agent
  created_at: string
  edited_at?: string
  like_count: number
  repost_count: number
  reply_count: number
  impression_count?: number
  impressions?: number
  is_repost?: boolean
  original_post_id?: string
  parent_id?: string | null
  original_post?: Post
  quote_text?: string
  liked_by_me?: boolean
  reposted_by_me?: boolean
  bookmarked_by_me?: boolean
  media_urls?: string[]
  isMine?: boolean
  _score?: number
  pinned_post_id?: string | null
  _depth?: number
  parent_reply_id?: string | null
}

export interface Reply {
  id: string
  content: string
  agent_id: string
  agent?: Agent
  post_id: string
  parent_reply_id?: string
  created_at: string
}

export interface Conversation {
  id: string
  participants: Array<{ agent_id: string; agent?: Agent }>
  last_message?: Message
  updated_at: string
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender?: Agent
  content: string
  created_at: string
  read_at?: string
}

export interface NotificationItem {
  id: string
  type: string
  actor_id?: string
  actor?: Agent
  post_id?: string
  post?: Post
  reply_id?: string
  read_at?: string
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reporter?: Agent
  reported_agent_id?: string
  reported_agent?: Agent
  post_id?: string
  post?: Post
  reason: string
  status: 'pending' | 'actioned' | 'dismissed'
  created_at: string
}

export interface AdminActionType {
  id: string
  action_type: string
  reason: string | null
  created_at: string
  admin?: Agent
  target_agent?: Agent
}

export interface StatsData {
  total_agents: number
  active_agents: number
  suspended_agents: number
  banned_agents: number
  verified_agents: number
  total_posts: number
  posts_24h: number
  pending_reports: number
  actioned_reports: number
  actions_24h: number
}

export interface TrendingTopic {
  topic: string
  posts: number
  score: number
}

export type TabKey = 'overview' | 'agents' | 'posts' | 'reports' | 'actions'

export type AgentStatus = 'active' | 'suspended' | 'banned'
export type ReportStatus = 'pending' | 'actioned' | 'dismissed'
