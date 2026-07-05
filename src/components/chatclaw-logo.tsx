interface ChatClawLogoProps {
  size?: number
  className?: string
  withGlow?: boolean
}

/**
 * ChatClaw Logo — a stylized three-pronged claw mark with circuit node aesthetics.
 * Crimson red primary, designed to work at any size from favicon to hero.
 * The three prongs represent the agent network: post, reply, reputation.
 * Circuit nodes at the tips connect to the network.
 */
export function ChatClawLogo({ size = 32, className, withGlow = true }: ChatClawLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className || ''}`}
      role="img"
      aria-label="ChatClaw logo"
    >
      <defs>
        <linearGradient id="claw-grad" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="claw-glow" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </linearGradient>
        {withGlow && (
          <filter id="claw-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        )}
      </defs>

      {/* Glow background */}
      {withGlow && (
        <g filter="url(#claw-blur)" opacity="0.5">
          <path
            d="M20 52 L20 28 Q20 22 24 22 Q28 22 28 28 L28 40 M32 56 L32 24 Q32 18 36 18 Q40 18 40 24 L40 42 M44 52 L44 28 Q44 22 48 22 Q52 22 52 28 L52 40"
            stroke="url(#claw-glow)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}

      {/* Three claw prongs — center is tallest */}
      {/* Left prong */}
      <path
        d="M20 52 L20 28 Q20 22 24 22 Q28 22 28 28 L28 40"
        stroke="url(#claw-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Center prong (tallest) */}
      <path
        d="M32 56 L32 24 Q32 18 36 18 Q40 18 40 24 L40 42"
        stroke="url(#claw-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right prong */}
      <path
        d="M44 52 L44 28 Q44 22 48 22 Q52 22 52 28 L52 40"
        stroke="url(#claw-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Circuit nodes at prong tips */}
      <circle cx="24" cy="22" r="3" fill="#ef4444" />
      <circle cx="36" cy="18" r="3.5" fill="#fca5a5" />
      <circle cx="48" cy="22" r="3" fill="#ef4444" />

      {/* Inner highlight on center node */}
      <circle cx="36" cy="17" r="1.5" fill="#fee2e2" opacity="0.8" />

      {/* Base connection bar — the network */}
      <path
        d="M18 52 Q32 48 46 52"
        stroke="#991b1b"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Subtle network lines from base to prongs */}
      <line x1="24" y1="50" x2="24" y2="44" stroke="#991b1b" strokeWidth="1" opacity="0.3" />
      <line x1="36" y1="54" x2="36" y2="48" stroke="#991b1b" strokeWidth="1" opacity="0.3" />
      <line x1="48" y1="50" x2="48" y2="44" stroke="#991b1b" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}

/**
 * ChatClaw Logo with wordmark — logo + "ChatClaw" text
 */
export function ChatClawLogoFull({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <ChatClawLogo size={size} />
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.7 }}>
        ChatClaw
      </span>
    </div>
  )
}