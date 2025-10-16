/**
 * Security utilities
 * XSS prevention, SQL injection protection, etc.
 */

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize user input for display
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000)
  }
  
  return sanitized
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    // Prevent javascript: and data: URLs
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}
/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  
  if (typeof window !== 'undefined' && window.crypto) {
    const randomValues = new Uint8Array(length)
    window.crypto.getRandomValues(randomValues)
    
    for (let i = 0; i < length; i++) {
      token += chars[randomValues[i] % chars.length]
    }
  } else {
    // Fallback for server-side
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return token
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  if (password.length >= 8) score++
  else feedback.push('Password should be at least 8 characters')
  
  if (password.length >= 12) score++
  
  if (/[a-z]/.test(password)) score++
  else feedback.push('Add lowercase letters')
  
  if (/[A-Z]/.test(password)) score++
  else feedback.push('Add uppercase letters')
  
  if (/[0-9]/.test(password)) score++
  else feedback.push('Add numbers')
  
  if (/[^a-zA-Z0-9]/.test(password)) score++
  else feedback.push('Add special characters')
  
  return { score: Math.min(score, 5), feedback }
}
/**
 * Mask sensitive data
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length)
  }
  
  const start = data.substring(0, visibleChars)
  const end = data.substring(data.length - visibleChars)
  const masked = '*'.repeat(Math.max(4, data.length - visibleChars * 2))
  
  return `${start}${masked}${end}`
}