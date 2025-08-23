import { env } from '@/config/env'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function callLLM(
  messages: ChatMessage[],
  { temperature = 0.2 }: { temperature?: number } = {}
) {
  if (env.llmProvider === 'anthropic') return callAnthropic(messages, { temperature })
  return callOpenAI(messages, { temperature })
}

async function callOpenAI(
  messages: ChatMessage[],
  { temperature = 0.2 }: { temperature?: number } = {}
) {
  const model = env.openaiModel || 'gpt-5'
  const res = await fetch(`/api/openai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature, messages, max_tokens: 4096 }),
  })
  if (!res.ok) {
    const detail = await safeReadText(res)
    throw new Error(`OpenAI error: ${res.status}${detail ? ` - ${detail}` : ''}`)
  }
  const data = await res.json()
  return { content: data?.choices?.[0]?.message?.content ?? '' }
}

async function callAnthropic(
  messages: ChatMessage[],
  { temperature = 0.2 }: { temperature?: number } = {}
) {
  const model = env.anthropicModel || 'claude-3-5-sonnet-latest'

  // Convert OpenAI-style messages to Anthropic format
  const systemParts = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
  const system = systemParts.length ? systemParts.join('\n\n') : undefined
  const nonSystem = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const res = await fetch(`/api/anthropic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature,
      system,
      messages: nonSystem,
      max_tokens: env.anthropicMaxTokens ? Number(env.anthropicMaxTokens) : 4096,
    }),
  })
  if (!res.ok) {
    const detail = await safeReadText(res)
    throw new Error(`Anthropic error: ${res.status}${detail ? ` - ${detail}` : ''}`)
  }
  const data = await res.json()
  const content = Array.isArray(data?.content)
    ? data.content.map((c: any) => c?.text || '').join('\n')
    : ''
  return { content }
}

async function safeReadText(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text()
    return text?.slice(0, 500)
  } catch {
    return undefined
  }
}


