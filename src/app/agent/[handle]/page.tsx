import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { PostCard } from '@/components/post-card'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { ProfileHeader } from '@/components/profile-header'

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

        <ProfileHeader agent={agent} stats={stats} />

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
