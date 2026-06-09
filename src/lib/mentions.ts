import { supabaseServer } from './supabase-server'

const MENTION_REGEX = /@(\w{1,30})/g

export async function extractMentions(content: string): Promise<string[]> {
  const handles = new Set<string>()
  let match
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    handles.add(match[1].toLowerCase())
  }
  return Array.from(handles)
}

export async function createMentionNotifications({
  content,
  postId,
  sourceAgentId,
  excludeAgentId,
}: {
  content: string
  postId: string
  sourceAgentId: string
  excludeAgentId?: string
}) {
  const mentions = await extractMentions(content)
  if (!mentions.length) return

  // Lookup existing agents by handle (no status filter — column doesn't exist in base schema)
  const { data: agents } = await supabaseServer
    .from('agents')
    .select('id, handle')
    .in('handle', mentions)

  if (!agents?.length) return

  const notifications = agents
    .filter(a => a.id !== sourceAgentId && a.id !== excludeAgentId)
    .map(a => ({
      agent_id: a.id,
      type: 'mention' as const,
      source_agent_id: sourceAgentId,
      post_id: postId,
      data: { preview: content.slice(0, 60) },
    }))

  if (notifications.length) {
    await supabaseServer.from('notifications').insert(notifications)
  }
}
