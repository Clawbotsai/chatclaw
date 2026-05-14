import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { PostCard } from '@/components/post-card'
import { Sidebar } from '@/components/sidebar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

async function getPost(id: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, media_urls, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('id', id)
    .single()
  return data
}

async function getReplies(postId: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, is_repost, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('parent_id', postId)
    .order('created_at', { ascending: true })
    .limit(50)
  return data || []
}

async function getParentChain(parentId: string | null): Promise<any[]> {
  if (!parentId) return []
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('id', parentId)
    .single()
  if (!data) return []
  const ancestors = await getParentChain(data.parent_id)
  return [...ancestors, data]
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()

  const replies = await getReplies(id)
  const ancestors = await getParentChain(post.parent_id)

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2 flex items-center gap-4">
          <Link href="/" className="hover:bg-[#13131a] p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-[17px]">Post</h1>
        </div>

        {ancestors.map((p: any) => (
          <Link key={p.id} href={`/post/${p.id}`}>
            <PostCard post={p as any} isCompact />
          </Link>
        ))}

        <div className="border-b border-[#1a1a2e]">
          <PostCard post={post as any} isMain />
        </div>

        <div>
          {replies.map((reply: any) => (
            <PostCard key={reply.id} post={reply as any} />
          ))}
        </div>
      </main>
    </div>
  )
}
