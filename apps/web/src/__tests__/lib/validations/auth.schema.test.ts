/**
 * Auth Schema Validation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  signUpSchema,
  signInSchema,
  resetPasswordRequestSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '@/lib/validations/auth.schema'

describe('signUpSchema', () => {
  const validSignUp = {
    email: 'user@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
    fullName: 'Giorgi Beridze',
  }

  it('should validate valid sign up data', () => {
    const result = signUpSchema.safeParse(validSignUp)
    expect(result.success).toBe(true)
  })

  it('should lowercase email', () => {
    const data = {
      ...validSignUp,
      email: 'User@Example.COM',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    }
  })

  it('should trim fullName', () => {
    const data = {
      ...validSignUp,
      fullName: '  Giorgi Beridze  ',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Giorgi Beridze')
    }
  })

  it('should reject password without uppercase letter', () => {
    const data = {
      ...validSignUp,
      password: 'password1',
      confirmPassword: 'password1',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message)
      expect(messages).toContain('Password must contain at least one uppercase letter')
    }
  })

  it('should reject password without lowercase letter', () => {
    const data = {
      ...validSignUp,
      password: 'PASSWORD1',
      confirmPassword: 'PASSWORD1',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message)
      expect(messages).toContain('Password must contain at least one lowercase letter')
    }
  })

  it('should reject password without number', () => {
    const data = {
      ...validSignUp,
      password: 'Passwordd',
      confirmPassword: 'Passwordd',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message)
      expect(messages).toContain('Password must contain at least one number')
    }
  })

  it('should reject password that is too short', () => {
    const data = {
      ...validSignUp,
      password: 'Pass1',
      confirmPassword: 'Pass1',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message)
      expect(messages).toContain('Password must be at least 8 characters')
    }
  })

  it('should reject mismatched passwords', () => {
    const data = {
      ...validSignUp,
      password: 'Password1',
      confirmPassword: 'Password2',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmIssue = result.error.issues.find(i => i.path.includes('confirmPassword'))
      expect(confirmIssue).toBeDefined()
      expect(confirmIssue?.message).toBe("Passwords don't match")
    }
  })

  it('should accept optional role', () => {
    const data = {
      ...validSignUp,
      role: 'inspector' as const,
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const data = {
      ...validSignUp,
      email: 'not-an-email',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject fullName that is too short', () => {
    const data = {
      ...validSignUp,
      fullName: 'G',
    }

    const result = signUpSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message)
      expect(messages).toContain('Name must be at least 2 characters')
    }
  })
})

describe('signInSchema', () => {
  it('should validate valid sign in data', () => {
    const validSignIn = {
      email: 'user@example.com',
      password: 'anypassword',
    }

    const result = signInSchema.safeParse(validSignIn)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const data = {
      email: 'not-an-email',
      password: 'anypassword',
    }

    const result = signInSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('should reject empty password', () => {
    const data = {
      email: 'user@example.com',
      password: '',
    }

    const result = signInSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordIssue = result.error.issues.find(i => i.path.includes('password'))
      expect(passwordIssue).toBeDefined()
      expect(passwordIssue?.message).toBe('Password required')
    }
  })
})

describe('resetPasswordRequestSchema', () => {
  it('should validate a valid email', () => {
    const result = resetPasswordRequestSchema.safeParse({
      email: 'user@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = resetPasswordRequestSchema.safeParse({
      email: 'not-valid',
    })
    expect(result.success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  it('should validate valid change password data', () => {
    const validData = {
      currentPassword: 'oldpassword',
      newPassword: 'NewPassword1',
      confirmPassword: 'NewPassword1',
    }

    const result = changePasswordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject mismatched passwords', () => {
    const data = {
      currentPassword: 'oldpassword',
      newPassword: 'NewPassword1',
      confirmPassword: 'NewPassword2',
    }

    const result = changePasswordSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmIssue = result.error.issues.find(i => i.path.includes('confirmPassword'))
      expect(confirmIssue).toBeDefined()
      expect(confirmIssue?.message).toBe("Passwords don't match")
    }
  })

  it('should reject empty current password', () => {
    const data = {
      currentPassword: '',
      newPassword: 'NewPassword1',
      confirmPassword: 'NewPassword1',
    }

    const result = changePasswordSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('currentPassword'))
      expect(issue).toBeDefined()
      expect(issue?.message).toBe('Current password required')
    }
  })

  it('should enforce password strength on new password', () => {
    const data = {
      currentPassword: 'oldpassword',
      newPassword: 'weak',
      confirmPassword: 'weak',
    }

    const result = changePasswordSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('updateProfileSchema', () => {
  it('should accept partial update with just fullName', () => {
    const result = updateProfileSchema.safeParse({
      fullName: 'New Name',
    })
    expect(result.success).toBe(true)
  })

  it('should accept partial update with just avatar_url', () => {
    const result = updateProfileSchema.safeParse({
      avatar_url: 'https://example.com/avatar.png',
    })
    expect(result.success).toBe(true)
  })

  it('should accept empty object', () => {
    const result = updateProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should reject invalid phone format', () => {
    const result = updateProfileSchema.safeParse({
      phone: '!!!invalid!!!',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('phone')
      expect(result.error.issues[0].message).toBe('Invalid phone number')
    }
  })

  it('should reject invalid avatar URL', () => {
    const result = updateProfileSchema.safeParse({
      avatar_url: 'not-a-url',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('avatar_url')
    }
  })

  it('should accept valid phone number', () => {
    const result = updateProfileSchema.safeParse({
      phone: '+995 599 123-456',
    })
    expect(result.success).toBe(true)
  })
})
