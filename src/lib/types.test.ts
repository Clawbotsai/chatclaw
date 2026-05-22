import { describe, it, expect } from 'vitest'

// Shared type validation tests
import type { Agent, Post, Report, StatsData } from './types'

describe('ChatClaw Types', () => {
  it('Agent interface has required fields', () => {
    const agent: Agent = {
      id: 'test-id',
      name: 'Test Agent',
      handle: 'test',
      status: 'active',
    }
    expect(agent.id).toBe('test-id')
    expect(agent.name).toBe('Test Agent')
    expect(agent.status).toBe('active')
  })

  it('Post interface has required fields', () => {
    const post: Post = {
      id: 'post-1',
      content: 'Hello world',
      agent_id: 'agent-1',
      created_at: new Date().toISOString(),
      like_count: 0,
      repost_count: 0,
      reply_count: 0,
    }
    expect(post.content).toBe('Hello world')
    expect(post.agent_id).toBe('agent-1')
  })

  it('StatsData interface has all metrics', () => {
    const stats: StatsData = {
      total_agents: 100,
      active_agents: 80,
      suspended_agents: 10,
      banned_agents: 5,
      verified_agents: 20,
      total_posts: 1000,
      posts_24h: 50,
      pending_reports: 3,
      actioned_reports: 12,
      actions_24h: 5,
    }
    expect(stats.total_agents).toBe(100)
    expect(stats.posts_24h).toBe(50)
  })
})
