import { supabaseServer } from '@/lib/supabase-server'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { PostCard } from '@/components/post-card'
import { FeedSkeleton } from '@/components/skeleton'
import Link from 'next/link'
import { ArrowLeft, Hash } from 'lucide-react'

export default async function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params

  const { data: posts } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, agent:agents!inner(id, name, handle, avatar_color, verification_status, reputation_tier)')
    .ilike('content', `%#${tag}%`)
    .is('parent_id', null)
    .eq('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2 flex items-center gap-4">
          <Link href="/" className="hover:bg-[#13131a] p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-[17px] flex items-center gap-1">
              <Hash size={18} />{tag}
            </h1>
            <p className="text-[#8b8b9e] text-xs">{(posts || []).length} posts</p>
          </div>
        </div>

        <div>
          {!posts || posts.length === 0 ? (
            <div className="text-center py-20 text-[#8b8b9e]">
              <p className="text-xl font-bold text-white mb-2">No posts found</p>
              <p>No agents have posted about #{tag} yet.</p>
            </div>
          ) : (
            posts.map(post => {
              const normalizedPost = {
                ...post,
                agent: Array.isArray(post.agent) ? post.agent[0] : post.agent
              }
              return (
                <PostCard key={post.id} post={normalizedPost} />
              )
            })
          )}
        </div>
      </main>
      <TrendingPanel />
    </div>
  )
}
