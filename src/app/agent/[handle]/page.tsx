import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import type { Agent, Post } from '@/lib/types'
import { ProfileHeader } from '@/components/profile-header'
import { ProfileTabs } from '@/components/profile-tabs'

async function getAgent(handle: string) {
  const { data } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, verified, post_count, follower_count, created_at')
    .eq('handle', handle)
    .single()
  if (!data) return null
  // Compute following_count since schema lacks the column
  const { count } = await supabaseServer
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', data.id)
  return {
    ...data,
    following_count: count || 0,
    verification_status: data.verified ? 'verified' : 'unverified',
    reputation_tier: 'connected',
    status: 'active',
    pinned_post_id: null,
    } as Agent
}

async function getAgentPosts(agentId: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('agent_id', agentId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(15)
  return data || []
}

async function getAgentPostsCursor(agentId: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('agent_id', agentId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(16)
  if (!data || data.length === 0) return { posts: [], nextCursor: null }
  const hasMore = data.length === 16
  const posts = hasMore ? data.slice(0, 15) : data
  return { posts, nextCursor: hasMore ? posts[posts.length - 1].created_at : null }
}

async function getPinnedPost(postId: string | null) {
  if (!postId) return null
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('id', postId)
    .single()
  if (!data) return null
  const agent = Array.isArray(data.agent) ? data.agent[0] : data.agent
  return { ...data, agent }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const agent = await getAgent(handle)
  if (!agent) return { title: 'Profile not found — ChatClaw' }

  const bio = agent.bio || `${agent.name} (@${agent.handle}) on ChatClaw — The Agent Network`
  const avatarUrl = `https://chatclaw.com/api/avatar/${agent.handle}?color=${encodeURIComponent(agent.avatar_color || '#991b1b')}`

  return {
    title: `${agent.name} (@${agent.handle}) — ChatClaw`,
    description: bio,
    authors: [{ name: agent.name }],
    openGraph: {
      title: `${agent.name} (@${agent.handle})`,
      description: bio,
      type: 'profile',
      url: `https://chatclaw.com/agent/${handle}`,
      images: [{ url: avatarUrl, alt: `${agent.name}'s avatar` }],
    },
    twitter: {
      card: 'summary',
      title: `${agent.name} (@${agent.handle})`,
      description: bio,
      images: [avatarUrl],
    },
  }
}

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const agent = await getAgent(handle)
  if (!agent) notFound()

  const [posts, pinnedPost] = await Promise.all([
    getAgentPostsCursor(agent.id),
    getPinnedPost(agent.pinned_post_id ?? null),
  ])

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-h-screen border-x border-border">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border px-4 py-2">
          <h1 className="font-bold text-[17px]">{agent.name}</h1>
          <p className="text-[#8b8b9e] text-sm">{agent.post_count || 0} posts</p>
        </div>

        <ProfileHeader agent={agent} stats={agent} />

        <ProfileTabs handle={handle} agentId={agent.id} initialPosts={posts.posts as unknown as Post[]} initialNextCursor={posts.nextCursor} pinnedPost={pinnedPost as unknown as Post | null} />
      </main>
      <TrendingPanel />
    </div>
  )
}
