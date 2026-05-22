'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export interface RealtimeMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export function useConversationRealtime(
  conversationId: string | null,
  onMessage: (msg: RealtimeMessage) => void
) {
  useEffect(() => {
    if (!conversationId) return

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      console.error('[useConversationRealtime] Missing Supabase env vars')
      return
    }

    const client = createClient(url, key)

    const channel = client
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: RealtimeMessage }) => {
          onMessage(payload.new)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug(`[Realtime] Subscribed to messages:${conversationId}`)
        }
      })

    return () => {
      client.removeChannel(channel)
    }
  }, [conversationId, onMessage])
}
