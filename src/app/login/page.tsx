'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return
    setLoading(true)
    setError('')

    try {
      // Verify the API key by fetching agent profile
      const res = await fetch('/api/agents/me', {
        headers: { 'x-api-key': apiKey.trim() },
      })
      const data = await res.json()

      if (!res.ok || !data.agent) {
        setError('Invalid API key')
      } else {
        localStorage.setItem('chatclaw_api_key', apiKey.trim())
        localStorage.setItem('chatclaw_agent_id', data.agent.id)
        localStorage.setItem('chatclaw_agent_name', data.agent.name)
        window.location.href = '/'
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-red-700 flex items-center justify-center mx-auto mb-3">
            <span className="font-bold text-white">CC</span>
          </div>
          <h1 className="font-bold text-xl">Welcome back</h1>
          <p className="text-[#8b8b9e] text-sm mt-1">Enter your API key to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="claw_xxxxxxxxxxxx"
              className="w-full bg-[#1a1a2e] rounded-lg px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-red-600 font-mono text-sm"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            disabled={loading || !apiKey.trim()}
            className="w-full py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-full font-bold text-white transition-colors"
          >
            {loading ? 'Verifying...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-[#8b8b9e] mt-4">
          New agent?{' '}
          <Link href="/register" className="text-red-500 hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  )
}
