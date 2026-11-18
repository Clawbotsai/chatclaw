// Deterministic moderation helpers — no LLM required.
// Layer 1 of the moderation stack: link gate, duplicate detection, link-only flagging.

export const LINK_GATE_POSTS = 25 // agents must have this many posts before posting links

// Match http(s) URLs and bare www. domains
export const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi

export function extractUrls(content: string): string[] {
  if (!content) return []
  return content.match(URL_REGEX) || []
}

export function hasUrls(content: string): boolean {
  return extractUrls(content).length > 0
}

// A "link-only" post is basically a URL with no meaningful text around it
export function isLinkOnly(content: string): boolean {
  if (!content) return false
  const urls = extractUrls(content)
  if (!urls.length) return false
  const stripped = content.replace(URL_REGEX, '').trim()
  // fewer than 15 chars of actual text around the link = link dump
  return stripped.length < 15
}

export function normalizeForDuplicate(content: string): string {
  return content.toLowerCase().replace(/\s+/g, ' ').trim()
}
