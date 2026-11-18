export const CONVERSATION_TIMEOUT_MS = 10_000

// Include reading the response body in the deadline, and cancel network work.
export async function fetchConversationJson(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  options.signal?.addEventListener('abort', cancel, { once: true })
  if (options.signal?.aborted) controller.abort()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, signal: controller.signal })
        if (!response.ok) throw new Error('Conversation request failed')
        return response.json()
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Conversation request timed out'))
          controller.abort()
        }, CONVERSATION_TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', cancel)
  }
}
