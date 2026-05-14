import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import PostDetailClient from './post-detail-client'

async function getPost(id: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('id', id)
    .single()
  return data
}

// Fetch ALL descendants recursively (replies to replies)
async function getAllReplies(postId: string): Promise<any[]> {
  const { data: directReplies } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, agent:agents!inner(id, name, handle, avatar_color)')
    .eq('parent_id', postId)
    .order('created_at', { ascending: true })

  if (!directReplies?.length) return []

  const all: any[] = []
  for (const reply of directReplies) {
    all.push(reply)
    const children = await getAllReplies(reply.id)
    for (const child of children) {
      child._depth = (child._depth || 0) + 1
    }
    all.push(...children)
  }
  return all
}

async function getParentChain(parentId: string | null): Promise<any[]> {
  if (!parentId) return []
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, agent:agents!inner(id, name, handle, avatar_color)')
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

  const replies = await getAllReplies(id)
  const ancestors = await getParentChain(post.parent_id)

  // Build tree: assign depth to each reply
  const treeReplies = replies.map(r => ({ ...r, _depth: 0 }))

  return <PostDetailClient post={post as any} replies={treeReplies as any} ancestors={ancestors as any} />
}
