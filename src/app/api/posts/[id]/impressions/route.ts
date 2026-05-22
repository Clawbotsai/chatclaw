import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { error } = await supabaseServer.rpc('increment_impression', { post_uuid: id })

  if (error) {
    // Fallback if RPC doesn't exist (safety)
    const { error: upErr } = await supabaseServer
      .from('posts')
      .update({ impressions: supabaseServer.rpc('increment_impression', { post_uuid: id }) } as Record<string, unknown>)
      .eq('id', id)
    if (upErr) return Response.json({ error: upErr.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
