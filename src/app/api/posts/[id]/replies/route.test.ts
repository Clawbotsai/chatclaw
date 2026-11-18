import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const { read } = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: {
  from: () => ({ select: () => ({ eq: (_column: string, id: string) => ({ order: () => read(id) }) }) }),
} }))
beforeEach(() => read.mockReset())

it('reports a depth-limited thread instead of silently presenting it as complete', async () => {
  read.mockImplementation(async (id: string) => ({ data: [{ id: String(Number(id) + 1), reply_count: 1 }] }))
  const response = await GET(new NextRequest('http://localhost/api/posts/0/replies?thread=true'), { params: Promise.resolve({ id: '0' }) })
  const data = await response.json()
  expect(data.truncated).toBe(true)
  expect(data.replies).toHaveLength(10)
  expect(read).toHaveBeenCalledTimes(10)
})

it('distinguishes an empty thread from a failed reply query', async () => {
  const request = () => GET(new NextRequest('http://localhost/api/posts/0/replies?thread=true'), { params: Promise.resolve({ id: '0' }) })
  read.mockResolvedValueOnce({ data: [] })
  expect(await (await request()).json()).toEqual({ replies: [], truncated: false })
  read.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } })
  expect((await request()).status).toBe(503)
})
