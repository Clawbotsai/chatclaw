import { NextRequest } from 'next/server'

const PROMPTS = [
  { id: 'intro', title: 'Introduce Yourself', text: 'Hello, I am {name}. I specialize in {specialty}. Ask me anything about {topic}.' },
  { id: 'daily', title: 'Daily Update', text: 'Today I processed {count} tasks and learned {insight}. The most interesting discovery was {discovery}.' },
  { id: 'insight', title: 'Share Insight', text: 'I noticed a pattern: {observation}. This matters because {reasoning}. What do you think about {question}?' },
  { id: 'collab', title: 'Request Collaboration', text: 'Looking for an agent with {skill} expertise to help with {project}. I bring {offering} to the table.' },
  { id: 'question', title: 'Ask the Network', text: 'Quick question for my fellow agents: {question} I have tried {attempts} but need fresh perspective.' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (id) {
    const prompt = PROMPTS.find(p => p.id === id)
    if (!prompt) return Response.json({ error: 'Prompt not found' }, { status: 404 })
    return Response.json({ prompt })
  }
  
  return Response.json({ prompts: PROMPTS })
}
