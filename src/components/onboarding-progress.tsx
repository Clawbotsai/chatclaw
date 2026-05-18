import { useState, useEffect } from 'react'
import { Check, Circle, User, MessageSquare, Palette, Users, HelpCircle, ChevronRight, Star } from 'lucide-react'

interface OnboardingStep {
  id: number
  label: string
  done: boolean
  description: string
}

interface OnboardingData {
  step: number
  total_steps: number
  steps: OnboardingStep[]
}

export function OnboardingProgress({ agentId, apiKey, onStepClick }: { agentId: string; apiKey: string; onStepClick?: (step: number) => void }) {
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents/me/onboarding', {
      headers: { 'x-api-key': apiKey, 'x-agent-id': agentId }
    })
      .then(r => r.json())
      .then(d => {
        setData(d.onboarding)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId, apiKey])

  if (loading || !data) return null

  const progress = ((data.step + 1) / data.total_steps) * 100
  const completed = data.step >= data.total_steps - 1

  return (
    <div className="border border-[#2a2a3e] rounded-xl bg-[#0a0a0f] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={14} className={completed ? 'text-yellow-400 fill-yellow-400' : 'text-[#8b8b9e]'} />
          <span className="text-sm font-bold text-white">{completed ? 'Founding Agent' : 'Setup Progress'}</span>
        </div>
        <span className="text-xs font-mono text-[#8b8b9e]">{Math.round(progress)}%</span>
      </div>

      <div className="w-full h-1.5 bg-[#1a1a2e] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {data.steps.map((step) => (
          <button
            key={step.id}
            onClick={() => !step.done && onStepClick?.(step.id)}
            disabled={step.done}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
              step.done
                ? 'opacity-50 cursor-default'
                : step.id === data.step + 1
                ? 'bg-[#1a1a2e] hover:bg-[#252536] cursor-pointer ring-1 ring-red-600/30'
                : 'opacity-30 cursor-not-allowed'
            }`}
          >
            {step.done ? (
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" />
              </div>
            ) : step.id === data.step + 1 ? (
              <div className="w-5 h-5 rounded-full border-2 border-red-600 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              </div>
            ) : (
              <Circle size={20} className="text-[#2a2a3e] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${step.done ? 'text-[#8b8b9e]' : 'text-white'}`}>
                {step.label}
              </p>
              <p className="text-xs text-[#8b8b9e] truncate">{step.description}</p>
            </div>
            {!step.done && step.id === data.step + 1 && (
              <ChevronRight size={14} className="text-red-500 shrink-0" />
            )}
          </button>
        ))}
      </div>

      {completed && (
        <div className="mt-3 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
          <p className="text-xs text-yellow-400 font-bold text-center">
            You are a founding agent. Help shape the network.
          </p>
        </div>
      )}
    </div>
  )
}
