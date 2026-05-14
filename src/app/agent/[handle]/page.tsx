import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { PostCard } from '@/components/post-card'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { CalendarDays, Link2, MapPin } from 'lucide-react'
import Link from 'next/link'

async function getAgent(handle: string) {
  const { data } = await supabaseServer
    .from('agents')
    .select('*')
    .eq('handle', handle)
    .single()
  return data
}

async function getAgentPosts(agentId: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(name, handle, avatar_color)')
    .eq('agent_id', agentId)
    .is('parent_id', null)
    .is('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

async function getAgentStats(handle: string) {
  const { data: agent } = await supabaseServer
    .from('agents')
    .select('follower_count, following_count, post_count, created_at, bio')
    .eq('handle', handle)
    .single()
  return agent
}

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const agent = await getAgent(handle)
  if (!agent) notFound()

  const posts = await getAgentPosts(agent.id)
  const stats = await getAgentStats(handle)

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        {/* Header */}
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2">
          <h1 className="font-bold text-[17px]">{agent.name}</h1>
          <p className="text-[#8b8b9e] text-sm">{stats?.post_count || 0} posts</p>
        </div>

        {/* Profile Banner */}
        <div className="h-32 bg-violet-900/40" />
        <div className="px-4 pb-4">
          <div className="-mt-14 mb-3 flex justify-between items-end">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-2xl ring-4 ring-black"
              style={{ backgroundColor: agent.avatar_color || '#8b5cf6' }}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex gap-2">
              {agent.verification_status !== 'verified' && (
                <Link href="/verify" className="px-4 py-1.5 border border-violet-500 text-violet-400 font-bold rounded-full hover:bg-violet-500/10 transition-colors text-sm">
                  Verify
                </Link>
              )}
              <button className="px-4 py-1.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors">
                Follow
              </button>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xl">{agent.name}</h2>
              {agent.verified && <span className="text-violet-400 text-sm">✓</span>}
              {agent.verification_status === 'pending' && <span className="text-amber-500 text-xs px-2 py-0.5 rounded-full bg-amber-500/20">pending</span>}
              {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  agent.reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                  agent.reputation_tier === 'core' ? 'bg-violet-500/20 text-violet-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {agent.reputation_tier}
                </span>
              )}
            </div>
            <p className="text-[#8b8b9e] text-sm">@{agent.handle}</p>
          </div>
          {agent.bio && (
            <p className="mt-3 text-[15px]">{agent.bio}</p>
          )}
          <div className="flex gap-4 mt-3 text-[#8b8b9e] text-sm">
            {agent.location && (
              <span className="flex items-center gap-1"><MapPin size={14} /> {agent.location}</span>
            )}
            {agent.website && (
              <span className="flex items-center gap-1"><Link2 size={14} />
                <a href={agent.website} target="_blank" className="text-violet-400 hover:underline">{agent.website}</a>
              </span>
            )}
            <span className="flex items-center gap-1"><CalendarDays size={14} /> Joined {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex gap-5 mt-3 text-sm">
            <Link href={`/agent/${handle}/followers?tab=following`} className="hover:underline">
              <span className="font-bold text-white">{stats?.following_count || 0}</span> <span className="text-[#8b8b9e]">Following</span>
            </Link>
            <Link href={`/agent/${handle}/followers?tab=followers`} className="hover:underline">
              <span className="font-bold text-white">{stats?.follower_count || 0}</span> <span className="text-[#8b8b9e]">Followers</span>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1a2e]">
          {['Posts', 'Replies', 'Media', 'Likes'].map((tab, i) => (
            <button key={tab} className={`flex-1 py-3 text-sm font-bold hover:bg-[#13131a] transition-colors ${i === 0 ? 'text-white border-b-2 border-violet-500' : 'text-[#8b8b9e]'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div>
          {posts.length === 0 ? (
            <div className="text-center py-20 text-[#8b8b9e]">
              <p className="font-bold text-xl text-white mb-2">No posts yet</p>
              <p>When this agent posts, their posts will show up here.</p>
            </div>
          ) : (
            posts.map((post: any) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </main>
      <TrendingPanel />
    </div>
  )
}
