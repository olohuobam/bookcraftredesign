/**
 * OpenAI Retry Wrapper
 *
 * Wraps openai.chat.completions.create with:
 * - 3 attempts
 * - Exponential backoff: 1s, 2s, 4s
 * - Retry only on 429 (rate limit) and 5xx errors
 * - Immediate fail on 4xx errors (except 429)
 */

import type OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'

type ChatCompletionParams = ChatCompletionCreateParamsNonStreaming

const RETRY_DELAYS_MS = [1000, 2000, 4000]
const MAX_ATTEMPTS = 3

function isRetryable(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const status = (error as { status?: number }).status
    if (status === 429) return true
    if (status != null && status >= 500) return true
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function openaiWithRetry(
  openai: OpenAI,
  params: ChatCompletionParams
): Promise<ChatCompletion> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await openai.chat.completions.create(params) as ChatCompletion
    } catch (error) {
      lastError = error

      if (!isRetryable(error)) {
        // 400, 401, etc. — fail immediately
        throw error
      }

      if (attempt < MAX_ATTEMPTS) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 4000
        console.warn(
          `⚠️ Retrying OpenAI call, attempt ${attempt + 1}/${MAX_ATTEMPTS} (delay: ${delayMs}ms)`,
          (error as { status?: number; message?: string }).status,
          (error as { message?: string }).message
        )
        await sleep(delayMs)
      }
    }
  }

  throw lastError
}
