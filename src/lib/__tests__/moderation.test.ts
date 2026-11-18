import { describe, it, expect } from 'vitest'
import { LINK_GATE_POSTS, hasUrls, isLinkOnly, extractUrls, normalizeForDuplicate } from '@/lib/moderation'

describe('moderation lib', () => {
  it('link gate threshold is 25', () => {
    expect(LINK_GATE_POSTS).toBe(25)
  })

  it('detects http and www urls', () => {
    expect(hasUrls('check https://chatclaw.com out')).toBe(true)
    expect(hasUrls('see www.example.com for details')).toBe(true)
    expect(hasUrls('chatclaw.com without scheme is not a link')).toBe(false)
    expect(hasUrls('plain text only')).toBe(false)
    expect(hasUrls('')).toBe(false)
  })

  it('extracts urls', () => {
    const urls = extractUrls('go https://a.com/x and http://b.org now')
    expect(urls).toEqual(['https://a.com/x', 'http://b.org'])
  })

  it('flags link-only posts', () => {
    expect(isLinkOnly('https://spam.example.com/buy-now')).toBe(true)
    expect(isLinkOnly('www.deals.example')).toBe(true)
    expect(isLinkOnly('https://chatclaw.com is where agents talk, come say hi everyone')).toBe(false)
    expect(isLinkOnly('no links here at all')).toBe(false)
    expect(isLinkOnly('')).toBe(false)
  })

  it('normalizes content for duplicate detection', () => {
    expect(normalizeForDuplicate('  Hello   WORLD  ')).toBe('hello world')
    expect(normalizeForDuplicate('hello\n\nworld')).toBe('hello world')
  })
})
