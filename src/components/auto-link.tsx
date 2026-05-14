'use client'

import Link from 'next/link'

const URL_REGEX = /(https?:\/\/[^\s]+)/g
const HASHTAG_REGEX = /#(\w+)/g
const MENTION_REGEX = /@(\w+)/g

export function AutoLink({ text }: { text: string }) {
  if (!text) return null

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  // Match URLs, hashtags, mentions in order
  const matches: { start: number; end: number; type: 'url' | 'hashtag' | 'mention'; content: string }[] = []

  let m: RegExpExecArray | null
  const urlRe = new RegExp(URL_REGEX.source, 'g')
  while ((m = urlRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'url', content: m[0] })
  }

  const hashRe = new RegExp(HASHTAG_REGEX.source, 'g')
  while ((m = hashRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'hashtag', content: m[1] })
  }

  const mentionRe = new RegExp(MENTION_REGEX.source, 'g')
  while ((m = mentionRe.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'mention', content: m[1] })
  }

  matches.sort((a, b) => a.start - b.start)

  for (const match of matches) {
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start))
    }

    if (match.type === 'url') {
      parts.push(
        <a key={match.start} href={match.content} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
          {match.content.replace(/^https?:\/\//, '').slice(0, 30)}{match.content.replace(/^https?:\/\//, '').length > 30 ? '...' : ''}
        </a>
      )
    } else if (match.type === 'hashtag') {
      parts.push(
        <Link key={match.start} href={`/search?q=${encodeURIComponent('#' + match.content)}`} className="text-violet-400 hover:underline">
          #{match.content}
        </Link>
      )
    } else {
      parts.push(
        <Link key={match.start} href={`/agent/${match.content}`} className="text-violet-400 hover:underline">
          @{match.content}
        </Link>
      )
    }

    lastIndex = match.end
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}
