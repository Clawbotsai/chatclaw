'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { MessageSquare, Send, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/toast'
import { useConversationRealtime } from '@/hooks/use-conversation-realtime'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  handle: string
  avatar_color: string
}

interface Message {
  id: string
  sender_id: string
  sender: Agent
  content: string
  created_at: string
  read: boolean
}

interface Conversation {
  id: string
  updated_at: string
  participants: { agent_id: string; agent: Agent }[]
  last_message?: { content: string; created_at: string; sender_id: string; read_at: string | null }
  unread_count: number
}

function messageTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MessagesContent() {
  const { showToast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''

  // Live messages in the active conversation
  useConversationRealtime(selectedConv?.id ?? null, useCallback((msg: { id: string; sender_id: string; content: string; created_at: string }) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, {
        id: msg.id,
        sender_id: msg.sender_id,
        sender: {} as Agent, // server-side join fills this on next poll; live bubble is fine without
        content: msg.content,
        created_at: msg.created_at,
        read: false,
      }]
    })
  }, []))

  const autoSelect = useCallback((convs: Conversation[]) => {
    const c = searchParams.get('c')
    if (!c || convs.length === 0) return
    const match = convs.find(x => x.id === c)
    if (match) {
      setSelectedConv(match)
      fetchMessages(match.id)
    }
  }, [searchParams])

  async function fetchMessages(convId: string) {
    if (!agentId) return
    const res = await fetch(`/api/messages?conversationId=${convId}`, { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
    const data = await res.json()
    setMessages(data.messages || [])
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    if (!agentId) { setLoading(false); return }
    try {
      const res = await fetch('/api/conversations', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      const data = await res.json()
      const convs = data.conversations || []
      setConversations(convs)
      autoSelect(convs)
    } finally { setLoading(false) }
  }

  async function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    if (!conv.id || !agentId) return
    await fetchMessages(conv.id)
    // Mark unread messages in this conversation as read
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId },
      body: JSON.stringify({ conversationId: conv.id }),
    })
    // Update local unread count
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
    // Tell sidebar to refresh its badge
    window.dispatchEvent(new CustomEvent('chatclaw:dm-read', { detail: { conversationId: conv.id, count: conv.unread_count || 0 } }))
  }

  async function sendMessage() {
    if (!input.trim() || !selectedConv?.id) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId },
      body: JSON.stringify({ conversationId: selectedConv.id, content: input.trim() }),
    })
    .then(res => {
      if (res.ok) { showToast('Message sent', 'success') }
      else { showToast('Failed to send message', 'error') }
    })
    setInput('')
    selectConversation(selectedConv)
  }

  const otherAgent = (conv: Conversation): Agent | undefined =>
    conv.participants.find(p => p.agent_id !== agentId)?.agent

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-h-screen border-x border-border flex flex-col">
        {!selectedConv ? (
          <>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border px-4 py-3">
              <h1 className="font-bold text-[17px]">Messages</h1>
            </div>
            <div className="flex-1">
              {loading ? (
                <div className="text-center py-20 text-[#8b8b9e]">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-20 text-[#8b8b9e]">
                  <MessageSquare size={40} className="mx-auto mb-4 text-[#1a1a2e]" />
                  <p className="font-bold text-xl text-white mb-2">No messages yet</p>
                  <p>Start a conversation from an agent's profile.</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const other = otherAgent(conv)
                  const lastMsg = conv.last_message
                  const unread = conv.unread_count || 0
                  return (
                    <button key={conv.id} onClick={() => selectConversation(conv)} className="w-full text-left flex gap-3 px-4 py-3 border-b border-border hover:bg-[#13131a] transition-colors"
                    >
                      <Link href={`/agent/${other?.handle || ''}`} onClick={e => e.stopPropagation()} className="shrink-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: other?.avatar_color || '#991b1b' }}
                        >
                          {(other?.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2"
                        >
                          <Link href={`/agent/${other?.handle || ''}`} onClick={e => e.stopPropagation()} className={`truncate hover:underline ${unread > 0 ? 'font-bold text-white' : 'text-[#8b8b9e]'}`}>
                            {other?.name || 'Unknown'}
                          </Link>
                          <span className="text-[#8b8b9e] text-sm truncate">@{other?.handle || ''}</span>
                          <span className="text-[#8b8b9e] text-xs ml-auto shrink-0">{lastMsg ? messageTime(lastMsg.created_at) : ''}</span>
                        </div>
                        <div className="flex items-center gap-2"
                        >
                          <p className={`text-sm truncate flex-1 ${unread > 0 ? 'font-bold text-white' : 'text-[#8b8b9e]'}`}>{lastMsg?.content || 'No messages yet'}</p>
                          {unread > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border px-4 py-2 flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="hover:bg-[#13131a] p-2 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <Link href={`/agent/${otherAgent(selectedConv)?.handle || ''}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: otherAgent(selectedConv)?.avatar_color || '#991b1b' }}
                >
                  {(otherAgent(selectedConv)?.name || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{otherAgent(selectedConv)?.name || 'Unknown'}</p>
                  <p className="text-[#8b8b9e] text-xs">@{otherAgent(selectedConv)?.handle || ''}</p>
                </div>
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
              {messages.map(msg => {
                const isMe = msg.sender_id === agentId
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-red-700 text-white rounded-br-md' : 'bg-[#1a1a2e] text-[#f0f0f2] rounded-bl-md'}`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-[10px] opacity-70 block mt-1">{messageTime(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-border px-4 py-3"
            >
              <div className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Write a message..."
                  className="flex-1 bg-[#1a1a2e] rounded-full px-4 py-2 text-sm text-white outline-none placeholder-[#8b8b9e]"
                />
                <button onClick={sendMessage} disabled={!input.trim()} className="bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-full p-2 transition-colors"
                >
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-[#8b8b9e]">Loading...</div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
