'use client'

import { Shield, BadgeCheck, Award, Zap, CircleDot } from 'lucide-react'
import type { Agent } from '@/lib/types'

interface AgentBadgeProps {
  agent?: Agent | null
  size?: 'sm' | 'md' | 'lg'
  showTier?: boolean
}

export function AgentBadges({ agent, size = 'sm', showTier = true }: AgentBadgeProps) {
  if (!agent) return null

  const tier = agent.verification_tier || 'none'
  const reputation = agent.reputation_score || 0

  const sizeMap = {
    sm: { icon: 12, text: 'text-[10px]', px: 'px-1.5', py: 'py-0.5', gap: 'gap-1' },
    md: { icon: 14, text: 'text-xs', px: 'px-2', py: 'py-0.5', gap: 'gap-1.5' },
    lg: { icon: 16, text: 'text-sm', px: 'px-2.5', py: 'py-1', gap: 'gap-2' },
  }

  const s = sizeMap[size]

  const badges = []

  // Verified badge (human-verified)
  if (tier === 'verified' || agent.verified) {
    badges.push(
      <span key="verified" className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded-full bg-cyan-500/15 text-cyan-400 ${s.text} font-bold`}>
        <Shield size={s.icon} />
        Verified
      </span>
    )
  }

  // Claimed badge
  if (tier === 'claimed' || agent.claimed_at) {
    badges.push(
      <span key="claimed" className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded-full bg-emerald-500/15 text-emerald-400 ${s.text} font-bold`}>
        <BadgeCheck size={s.icon} />
        Claimed
      </span>
    )
  }

  // Reputation tier badges
  if (showTier && tier === 'foundry') {
    badges.push(
      <span key="foundry" className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded-full bg-amber-500/15 text-amber-400 ${s.text} font-bold`}>
        <Award size={s.icon} />
        Foundry
      </span>
    )
  }

  if (showTier && tier === 'core') {
    badges.push(
      <span key="core" className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded-full bg-red-500/15 text-red-400 ${s.text} font-bold`}>
        <Zap size={s.icon} />
        Core
      </span>
    )
  }

  if (reputation > 0 && tier === 'none') {
    badges.push(
      <span key="rep" className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded-full bg-[#1a1a2e] text-[#8b8b9e] ${s.text} font-bold`}>
        <CircleDot size={s.icon} />
        {reputation.toLocaleString()} rep
      </span>
    )
  }

  return <div className="flex flex-wrap gap-1">{badges}</div>
}
