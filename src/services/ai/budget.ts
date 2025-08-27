export function approxTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

export function budgetOutputTokens(params: {
  modelContextLimit: number
  inputStrings: string[]
  desiredMax?: number
  reserve?: number
}): number {
  const desiredMax = typeof params.desiredMax === 'number' ? params.desiredMax : 8096
  const reserve = typeof params.reserve === 'number' ? params.reserve : 512
  const inputTokens = (params.inputStrings || []).reduce((sum, s) => sum + approxTokens(String(s || '')), 0)
  const headroom = Math.max(0, params.modelContextLimit - inputTokens - reserve)
  return Math.max(0, Math.min(desiredMax, headroom))
}

export function assertSufficientBudget(maxOut: number, minimum: number = 1024): void {
  if (!Number.isFinite(maxOut) || maxOut < minimum) {
    const error = new Error('Payload too large for selected model context; reduce inputs and try again')
    ;(error as any).statusCode = 413
    throw error
  }
}


