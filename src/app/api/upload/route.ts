import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const ext = file.name.split('.').pop() || 'png'
  const path = `posts/${agentId}/${Date.now()}.${ext}`

  const { data, error: upErr } = await supabaseServer.storage
    .from('chatclaw-media')
    .upload(path, bytes, { contentType: file.type || 'image/png' })

  if (upErr) return Response.json({ error: upErr.message }, { status: 500 })

  const { data: urlData } = supabaseServer.storage
    .from('chatclaw-media')
    .getPublicUrl(data?.path || path)

  return Response.json({ url: urlData?.publicUrl || '' })
}
