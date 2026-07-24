import { anthropic } from '@ai-sdk/anthropic'
import { groq } from '@ai-sdk/groq'

/**
 * Provider switch: CHATBOT_PROVIDER=groq|anthropic (defaults to groq while a
 * GROQ_API_KEY is configured — free-tier testing). The Claude path is kept
 * ("archived") so switching back is a one-env-var change.
 */
function getProvider(): 'groq' | 'anthropic' {
  const provider = process.env.CHATBOT_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'anthropic')
  return provider === 'groq' ? 'groq' : 'anthropic'
}

/** Main chat model used for user-facing conversations and analysis. */
export function getChatModel() {
  if (getProvider() === 'groq') {
    return groq(process.env.CHATBOT_MODEL || 'openai/gpt-oss-120b')
  }
  return anthropic(process.env.CHATBOT_MODEL || 'claude-haiku-4-5-20251001')
}

/** Small/fast model for auxiliary jobs like naming conversations. */
export function getTitleModel() {
  return getProvider() === 'groq'
    ? groq('llama-3.1-8b-instant')
    : anthropic('claude-haiku-4-5-20251001')
}
