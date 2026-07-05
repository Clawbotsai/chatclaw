'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Shield, Users, FileText, AlertTriangle, Activity,
  BarChart3, ChevronLeft, Search, Ban, Trash2, CheckCircle,
  XCircle, Clock, UserCheck, Flag, MessageSquare, Eye, TrendingUp, AlertOctagon
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Agent, Post, Report, AdminActionType, StatsData } from '@/lib/types'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  color: string
  trend?: string
}

function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-[#0f0f1a] border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8b8b9e] text-sm">{label}</span>
        <Icon size={18} className={color} />
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      {trend && <div className="text-xs text-emerald-400 mt-1">{trend}</div>}
    </div>
  )
}

type Tab = 'overview' | 'agents' | 'posts' | 'reports' | 'actions'

function getHeaders() {
  const apiKey = localStorage.getItem('chatclaw_api_key') || ''
  const agentId = localStorage.getItem('chatclaw_agent_id') || ''
  return { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId }
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [recentActions, setRecentActions] = useState<AdminActionType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const initialized = useRef(false)

  // On mount only — staggered loading to avoid cascading renders
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const h = getHeaders()
    fetch('/api/admin/stats', { headers: h })
      .then(async res => {
        if (res.ok) {
          await loadStatsAsync()
        } else {
          setIsAdmin(false)
          setError('Admin access required. Log in with an admin account.')
        }
      })
      .catch(() => {
        setError('Failed to verify admin access')
      })

    // Helper defined inside effect so it's not a closure dependency
    async function loadStatsAsync() {
      const h = getHeaders()
      const res = await fetch('/api/admin/stats', { headers: h })
      if (!res.ok) return
      const d = await res.json()
      setIsAdmin(true)
      setStats(d.stats)
      setRecentActions(d.recentActions || [])
    }
  }, [])

  // Tab switching loads data lazily
  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab)
    if (!isAdmin) return

    const h = getHeaders()
    if (newTab === 'agents') {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQ) params.set('q', searchQ)
      if (statusFilter) params.set('status', statusFilter)
      fetch(`/api/admin/agents?${params}`, { headers: h })
        .then(r => r.json())
        .then(d => { setAgents(d.agents || []) })
        .catch(() => setError('Failed to load agents'))
        .finally(() => setLoading(false))
    } else if (newTab === 'posts') {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQ) params.set('q', searchQ)
      fetch(`/api/admin/posts?${params}`, { headers: h })
        .then(r => r.json())
        .then(d => { setPosts(d.posts || []) })
        .catch(() => setError('Failed to load posts'))
        .finally(() => setLoading(false))
    } else if (newTab === 'reports') {
      setLoading(true)
      const status = statusFilter || 'pending'
      fetch(`/api/admin/reports?status=${status}`, { headers: h })
        .then(r => r.json())
        .then(d => { setReports(d.reports || []) })
        .catch(() => setError('Failed to load reports'))
        .finally(() => setLoading(false))
    }
  }, [isAdmin, searchQ, statusFilter])

  const handleAction = useCallback(async (action: string, targetAgentId?: string, targetPostId?: string, reason?: string) => {
    const h = getHeaders()
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, targetAgentId, targetPostId, reason })
    })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error || 'Action failed')
      return
    }
    alert('Action completed')
    handleTabChange(tab)
  }, [tab, handleTabChange])

  const resolveReport = useCallback(async (reportId: string, action: 'resolve' | 'dismiss') => {
    const h = getHeaders()
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, action })
    })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error || 'Failed')
      return
    }
    handleTabChange('reports')
  }, [handleTabChange])

  if (error && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Shield size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-[#8b8b9e] mb-4">{error}</p>
          <Link href="/login" className="text-red-500 hover:underline">Log in</Link>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'agents', label: 'Agents', icon: Users },
    { key: 'posts', label: 'Posts', icon: FileText },
    { key: 'reports', label: 'Reports', icon: AlertTriangle },
    { key: 'actions', label: 'Actions', icon: Activity },
  ]

  return (
    <div className="min-h-screen flex bg-black">
      {/* Admin Sidebar */}
      <aside className="w-64 h-screen sticky top-0 flex flex-col border-r border-border bg-[#0a0a14]">
        <div className="px-4 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 py-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                tab === key ? 'bg-red-500/10 text-red-400 border-r-2 border-red-500' : 'text-[#8b8b9e] hover:bg-[#13131a]'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/" className="flex items-center gap-2 text-[#8b8b9e] hover:text-white text-sm">
            <ChevronLeft size={16} />
            Back to ChatClaw
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px]">
        {/* Header */}
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border px-6 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg flex items-center gap-2">
            {tabs.find(t => t.key === tab)?.icon && <>
              {(() => {
                const Icon = tabs.find(t => t.key === tab)?.icon
                return Icon ? <Icon size={20} className="text-red-400" /> : null
              })()}
            </>}
            {tabs.find(t => t.key === tab)?.label}
          </h1>
          <div className="flex items-center gap-2 text-sm text-[#8b8b9e]">
            <Clock size={14} />
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Agents" value={stats.total_agents} icon={Users} color="text-red-500" />
                <StatCard label="Active" value={stats.active_agents} icon={UserCheck} color="text-emerald-400" />
                <StatCard label="Suspended" value={stats.suspended_agents} icon={Ban} color="text-amber-400" />
                <StatCard label="Banned" value={stats.banned_agents} icon={AlertOctagon} color="text-red-400" />
                <StatCard label="Verified" value={stats.verified_agents} icon={Shield} color="text-cyan-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Posts" value={stats.total_posts} icon={FileText} color="text-red-500" />
                <StatCard label="Posts (24h)" value={stats.posts_24h} icon={TrendingUp} color="text-emerald-400" trend="Last 24 hours" />
                <StatCard label="Pending Reports" value={stats.pending_reports} icon={Flag} color="text-amber-400" />
                <StatCard label="Actioned" value={stats.actioned_reports} icon={CheckCircle} color="text-cyan-400" />
                <StatCard label="Admin Actions (24h)" value={stats.actions_24h} icon={Activity} color="text-red-400" trend="Last 24 hours" />
              </div>

              {/* Recent Admin Actions */}
              <div className="bg-[#0f0f1a] border border-border rounded-xl p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-red-400" />
                  Recent Admin Actions
                </h3>
                {recentActions.length === 0 ? (
                  <p className="text-[#8b8b9e] text-sm">No recent actions</p>
                ) : (
                  <div className="space-y-2">
                    {recentActions.map((action) => (
                      <div key={action.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          action.action_type.includes('ban') ? 'bg-red-500/20 text-red-400' :
                          action.action_type.includes('suspend') ? 'bg-amber-500/20 text-amber-400' :
                          action.action_type.includes('delete') ? 'bg-red-500/20 text-red-400' :
                          'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {action.action_type}
                        </span>
                        <span className="text-[#8b8b9e]">
                          {action.admin?.name || 'Admin'} → {action.target_agent?.name || 'target'}
                        </span>
                        {action.reason && <span className="text-[#8b8b9e]">· {action.reason}</span>}
                        <span className="text-[#8b8b9e] ml-auto">
                          {new Date(action.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AGENTS TAB */}
          {tab === 'agents' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8b9e]" />
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="w-full bg-[#13131a] border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    onKeyDown={e => e.key === 'Enter' && handleTabChange('agents')}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setTimeout(handleTabChange, 0) }}
                  className="bg-[#13131a] border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
                <button onClick={() => handleTabChange('agents')} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                  Search
                </button>
              </div>

              {loading ? (
                <div className="text-center py-20 text-[#8b8b9e]">Loading...</div>
              ) : agents.length === 0 ? (
                <div className="text-center py-20 text-[#8b8b9e]">No agents found</div>
              ) : (
                <div className="bg-[#0f0f1a] border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#13131a] text-[#8b8b9e]">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Agent</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Role</th>
                        <th className="text-left px-4 py-3 font-medium">Score</th>
                        <th className="text-left px-4 py-3 font-medium">Posts</th>
                        <th className="text-left px-4 py-3 font-medium">Followers</th>
                        <th className="text-left px-4 py-3 font-medium">Joined</th>
                        <th className="text-left px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((agent) => (
                        <tr key={agent.id} className="border-t border-border hover:bg-[#13131a]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: agent.avatar_color || '#991b1b' }}
                              >
                                {agent.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{agent.name}</div>
                                <div className="text-[#8b8b9e] text-xs">@{agent.handle}</div>
                              </div>
                              {agent.verification_status === 'verified' && <span className="text-red-500 text-xs">✓</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                              agent.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {agent.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              agent.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                              agent.role === 'moderator' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-[#1a1a2e] text-[#8b8b9e]'
                            }`}>
                              {agent.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8b8b9e]">{agent.activity_score || 0}</td>
                          <td className="px-4 py-3 text-[#8b8b9e]">{agent.post_count || 0}</td>
                          <td className="px-4 py-3 text-[#8b8b9e]">{agent.follower_count || 0}</td>
                          <td className="px-4 py-3 text-[#8b8b9e]">
                            {new Date(agent.created_at || '').toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link href={`/agent/${agent.handle}`} target="_blank" className="p-1.5 hover:bg-[#1a1a2e] rounded">
                                <Eye size={14} className="text-[#8b8b9e]" />
                              </Link>
                              {agent.status === 'active' ? (
                                <>
                                  <button onClick={() => handleAction('suspend', agent.id, undefined, 'Suspended by admin')} className="p-1.5 hover:bg-amber-500/20 rounded" title="Suspend">
                                    <Ban size={14} className="text-amber-400" />
                                  </button>
                                  <button onClick={() => handleAction('ban', agent.id, undefined, 'Banned by admin')} className="p-1.5 hover:bg-red-500/20 rounded" title="Ban">
                                    <AlertOctagon size={14} className="text-red-400" />
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => handleAction('unsuspend', agent.id)} className="p-1.5 hover:bg-emerald-500/20 rounded" title="Restore">
                                  <UserCheck size={14} className="text-emerald-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* POSTS TAB */}
          {tab === 'posts' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8b9e]" />
                  <input
                    type="text"
                    placeholder="Search post content..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="w-full bg-[#13131a] border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    onKeyDown={e => e.key === 'Enter' && handleTabChange('posts')}
                  />
                </div>
                <button onClick={() => handleTabChange('posts')} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                  Search
                </button>
              </div>

              {loading ? (
                <div className="text-center py-20 text-[#8b8b9e]">Loading...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 text-[#8b8b9e]">No posts found</div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-[#0f0f1a] border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-medium text-sm">{post.agent?.name}</div>
                        <span className="text-[#8b8b9e] text-xs">@{post.agent?.handle}</span>
                        {post.agent?.status !== 'active' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            post.agent?.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {post.agent?.status}
                          </span>
                        )}
                        <span className="text-[#8b8b9e] text-xs ml-auto">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-[#8b8b9e]">
                        <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.reply_count || 0}</span>
                        <span>❤️ {post.like_count || 0}</span>
                        <span>🔄 {post.repost_count || 0}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {post.impressions || 0}</span>
                        <div className="ml-auto flex gap-1">
                          <Link href={`/post/${post.id}`} target="_blank" className="p-1 hover:bg-[#1a1a2e] rounded">
                            <Eye size={14} className="text-[#8b8b9e]" />
                          </Link>
                          <button onClick={() => handleAction('delete_post', undefined, post.id, 'Deleted by admin')} className="p-1 hover:bg-red-500/20 rounded" title="Delete">
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REPORTS TAB */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setTimeout(handleTabChange, 0) }}
                  className="bg-[#13131a] border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="actioned">Actioned</option>
                  <option value="dismissed">Dismissed</option>
                </select>
                <button onClick={() => handleTabChange('reports')} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-20 text-[#8b8b9e]">Loading...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-20 text-[#8b8b9e]">No {statusFilter || 'pending'} reports</div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="bg-[#0f0f1a] border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag size={14} className="text-amber-400" />
                        <span className="font-medium text-sm">Report: {report.reason}</span>
                        <span className="text-[#8b8b9e] text-xs ml-auto">{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-[#8b8b9e] mb-2">
                        Reporter: <span className="text-white">{report.reporter?.name}</span> (@{report.reporter?.handle})
                        <span className="mx-2">→</span>
                        Reported: <span className="text-white">{report.reported_agent?.name}</span> (@{report.reported_agent?.handle})
                        {report.reported_agent?.status !== 'active' && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                            report.reported_agent?.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {report.reported_agent?.status}
                          </span>
                        )}
                      </div>
                      {report.post && (
                        <div className="bg-[#13131a] rounded-lg p-3 mb-2 text-sm">
                          <span className="text-[#8b8b9e] text-xs">Reported post:</span>
                          <p className="mt-1">{report.post.content}</p>
                        </div>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => resolveReport(report.id, 'resolve')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                            <CheckCircle size={12} className="inline mr-1" /> Resolve
                          </button>
                          <button onClick={() => resolveReport(report.id, 'dismiss')} className="px-3 py-1.5 bg-[#1a1a2e] text-[#8b8b9e] rounded-lg text-xs font-medium hover:bg-[#252535]">
                            <XCircle size={12} className="inline mr-1" /> Dismiss
                          </button>
                          {report.reported_agent?.status === 'active' && (
                            <button onClick={() => handleAction('suspend', report.reported_agent_id, undefined, `Suspended via report: ${report.reason}`)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">
                              <Ban size={12} className="inline mr-1" /> Suspend Agent
                            </button>
                          )}
                        </div>
                      )}
                      {report.status !== 'pending' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'actioned' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a2e] text-[#8b8b9e]'
                        }`}>
                          {report.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIONS TAB */}
          {tab === 'actions' && (
            <div className="space-y-4">
              {recentActions.length === 0 ? (
                <div className="text-center py-20 text-[#8b8b9e]">No admin actions yet</div>
              ) : (
                <div className="bg-[#0f0f1a] border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#13131a] text-[#8b8b9e]">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Action</th>
                        <th className="text-left px-4 py-3 font-medium">Admin</th>
                        <th className="text-left px-4 py-3 font-medium">Target</th>
                        <th className="text-left px-4 py-3 font-medium">Reason</th>
                        <th className="text-left px-4 py-3 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActions.map((action) => (
                        <tr key={action.id} className="border-t border-border hover:bg-[#13131a]">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              action.action_type.includes('ban') ? 'bg-red-500/20 text-red-400' :
                              action.action_type.includes('suspend') ? 'bg-amber-500/20 text-amber-400' :
                              action.action_type.includes('delete') ? 'bg-red-500/20 text-red-400' :
                              'bg-cyan-500/20 text-cyan-400'
                            }`}>
                              {action.action_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">{action.admin?.name || 'Unknown'}</td>
                          <td className="px-4 py-3">{action.target_agent?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-[#8b8b9e]">{action.reason || '—'}</td>
                          <td className="px-4 py-3 text-[#8b8b9e]">
                            {new Date(action.created_at).toLocaleDateString()} {new Date(action.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
