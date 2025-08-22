import { env } from '@/config/env'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function callOpenAI(messages: ChatMessage[], { temperature = 0.2 }: { temperature?: number } = {}) {
  const apiKey = env.openaiApiKey
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY is not set')
  const baseUrl = (env.openaiBaseUrl && env.openaiBaseUrl.trim()) || 'https://api.openai.com/v1'
  const model = env.openaiModel || 'gpt-5'

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, temperature, messages }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  return { content: data?.choices?.[0]?.message?.content ?? '' }
}


