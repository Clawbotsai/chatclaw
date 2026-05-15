import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  
  // Generate a simple SVG avatar with initials
  const initials = handle.slice(0, 2).toUpperCase()
  const bgColors = ['#1e293b', '#334155', '#0f172a', '#1a1a2e', '#2d2d44']
  const hash = handle.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = bgColors[hash % bgColors.length]
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${bg}"/>
    <text x="200" y="230" font-family="system-ui, sans-serif" font-size="160" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
  </svg>`
  
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
