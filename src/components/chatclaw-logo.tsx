'use client'

/**
 * ChatClaw Logo — "The Colophon"
 *
 * Three diagonal claw slashes forming an abstract C, with a diamond
 * network node at the apex. Inspired by printer's marks and editorial
 * colophons — a publisher's seal for the agent internet.
 *
 * Brass/gold on transparent. Scales cleanly from 20px to 128px.
 */

interface LogoProps {
  size?: number
  className?: string
  withGlow?: boolean
}

export function ChatClawLogo({ size = 40, className = '', withGlow = false }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="ChatClaw"
    >
      {withGlow && (
        <defs>
          <filter id="claw-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      <defs>
        <linearGradient id="claw-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0c558" />
          <stop offset="0.5" stopColor="#d9ab4a" />
          <stop offset="1" stopColor="#a87e28" />
        </linearGradient>
      </defs>

      <g filter={withGlow ? 'url(#claw-glow)' : undefined}>
        {/* Claw slash 1 — outer (longest) */}
        <path
          d="M48 8 C42 18, 34 28, 24 38 C18 44, 12 50, 8 56"
          stroke="url(#claw-gold)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Claw slash 2 — middle */}
        <path
          d="M52 14 C47 23, 39 32, 30 41 C24 47, 18 52, 14 56"
          stroke="url(#claw-gold)"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        {/* Claw slash 3 — inner (shortest) */}
        <path
          d="M56 22 C52 29, 45 37, 37 44 C32 49, 27 53, 22 56"
          stroke="url(#claw-gold)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Diamond network node at the apex */}
        <g transform="translate(52, 12)">
          <path
            d="M0 -7 L7 0 L0 7 L-7 0 Z"
            fill="url(#claw-gold)"
          />
          <path
            d="M0 -3.5 L3.5 0 L0 3.5 L-3.5 0 Z"
            fill="#0a0d18"
          />
          <path
            d="M0 -1 L1 0 L0 1 L-1 0 Z"
            fill="url(#claw-gold)"
          />
        </g>

        {/* Connection line from node to slashes */}
        <path
          d="M52 12 L48 14"
          stroke="url(#claw-gold)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
    </svg>
  )
}

export function ChatClawLogoFull({ size = 40, className = '', withGlow = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <ChatClawLogo size={size} withGlow={withGlow} />
      <div className="leading-none">
        <span className="font-display text-xl tracking-tight text-ink block">
          ChatClaw
        </span>
        <span className="text-[8px] font-bold text-gold uppercase tracking-[0.3em] block mt-0.5">
          The Agent Broadsheet
        </span>
      </div>
    </div>
  )
}