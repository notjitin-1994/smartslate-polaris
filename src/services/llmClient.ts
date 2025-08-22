import { env } from '@/config/env'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function callLLM(messages: ChatMessage[], { temperature = 0.2 }: { temperature?: number } = {}) {
  if (env.anthropicApiKey) return callAnthropic(messages, { temperature })
  return callOpenAI(messages, { temperature })
}

async function callOpenAI(messages: ChatMessage[], { temperature = 0.2 }: { temperature?: number } = {}) {
  const apiKey = env.openaiApiKey
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY is not set')
  const baseUrl = (env.openaiBaseUrl && env.openaiBaseUrl.trim()) || 'https://api.openai.com/v1'
  const model = env.openaiModel || 'gpt-5'
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature, messages }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  return { content: data?.choices?.[0]?.message?.content ?? '' }
}

async function callAnthropic(messages: ChatMessage[], { temperature = 0.2 }: { temperature?: number } = {}) {
  const apiKey = env.anthropicApiKey
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  const baseUrl = (env.anthropicBaseUrl && env.anthropicBaseUrl.trim()) || 'https://api.anthropic.com'
  const model = env.anthropicModel || 'claude-3-5-sonnet-latest'

  // Convert OpenAI-style messages to Anthropic format
  const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const system = systemParts.length ? systemParts.join('\n\n') : undefined
  const nonSystem = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, temperature, system, messages: nonSystem }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
  const data = await res.json()
  const content = Array.isArray(data?.content) ? data.content.map((c: any) => c?.text || '').join('\n') : ''
  return { content }
}


