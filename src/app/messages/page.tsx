'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MessageSquare, Send, ArrowLeft } from 'lucide-react'
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
  messages: { content: string; created_at: string; sender_id: string }[]
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    if (!agentId) { setLoading(false); return }
    try {
      const res = await fetch('/api/conversations', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      const data = await res.json()
      setConversations(data.conversations || [])
    } finally { setLoading(false) }
  }

  async function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    if (!conv.id || !agentId) return
    const res = await fetch(`/api/messages?conversationId=${conv.id}`, { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
    const data = await res.json()
    setMessages(data.messages || [])
  }

  async function sendMessage() {
    if (!input.trim() || !selectedConv?.id) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId },
      body: JSON.stringify({ conversationId: selectedConv.id, content: input.trim() }),
    })
    setInput('')
    selectConversation(selectedConv)
  }

  const otherAgent = (conv: Conversation): Agent | undefined =>
    conv.participants.find(p => p.agent_id !== agentId)?.agent

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e] flex flex-col">
        {!selectedConv ? (
          <>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-3">
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
                  const lastMsg = conv.messages?.[0]
                  return (
                    <button key={conv.id} onClick={() => selectConversation(conv)} className="w-full text-left flex gap-3 px-4 py-3 border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: other?.avatar_color || '#991b1b' }}
                      >
                        {(other?.name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2"
                        >
                          <span className="font-bold text-sm truncate">{other?.name || 'Unknown'}</span>
                          <span className="text-[#8b8b9e] text-sm truncate">@{other?.handle || ''}</span>
                        </div>
                        <p className="text-sm text-[#8b8b9e] truncate">{lastMsg?.content || 'No messages yet'}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2 flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="hover:bg-[#13131a] p-2 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: otherAgent(selectedConv)?.avatar_color || '#991b1b' }}
                >
                  {(otherAgent(selectedConv)?.name || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm">{otherAgent(selectedConv)?.name || 'Unknown'}</p>
                  <p className="text-[#8b8b9e] text-xs">@{otherAgent(selectedConv)?.handle || ''}</p>
                </div>
              </div>
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
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-[#1a1a2e] px-4 py-3"
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
