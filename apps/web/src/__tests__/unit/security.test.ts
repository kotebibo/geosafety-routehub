import { describe, it, expect } from 'vitest'
import { 
  sanitizeHtml, 
  sanitizeInput, 
  sanitizeUrl,
  isValidEmail,
  checkPasswordStrength,
  maskSensitiveData
} from '@/lib/security/utils'

describe('Security Utils', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("XSS")</script>'
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      expect(sanitizeHtml(input)).toBe(expected)
    })

    it('should handle normal text', () => {
      const input = 'Normal text without HTML'
      expect(sanitizeHtml(input)).toBe(input)
    })
  })

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test')
    })

    it('should remove null bytes', () => {
      expect(sanitizeInput('test\0string')).toBe('teststring')
    })

    it('should handle non-string input', () => {
      expect(sanitizeInput(123)).toBe('')
      expect(sanitizeInput(null)).toBe('')
      expect(sanitizeInput(undefined)).toBe('')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP URLs', () => {
      const url = 'https://example.com/path'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should reject javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    })

    it('should reject data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('should handle invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull()
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@company.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })
  })

  describe('checkPasswordStrength', () => {
    it('should score weak passwords low', () => {
      const result = checkPasswordStrength('password')
      expect(result.score).toBeLessThan(3)
      expect(result.feedback.length).toBeGreaterThan(0)
    })

    it('should score strong passwords high', () => {
      const result = checkPasswordStrength('MyStr0ng!P@ssw0rd')
      expect(result.score).toBeGreaterThanOrEqual(4)
    })
  })

  describe('maskSensitiveData', () => {
    it('should mask middle portion of data', () => {
      expect(maskSensitiveData('1234567890123456')).toBe('1234********3456')
    })

    it('should handle short strings', () => {
      expect(maskSensitiveData('1234', 2)).toBe('****')
    })
  })
})
