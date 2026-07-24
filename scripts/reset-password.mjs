/**
 * Reset a single user's password (Supabase Admin API). Reads apps/web/.env.local.
 *   node scripts/reset-password.mjs <email> <newPassword>
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error('usage: node scripts/reset-password.mjs <email> <newPassword>')
  process.exit(1)
}

const env = {}
for (const line of fs.readFileSync(path.join(ROOT, 'apps', 'web', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const { data: u } = await db.from('users').select('id, email').eq('email', email).maybeSingle()
if (!u) {
  console.error(`No user with email ${email}`)
  process.exit(1)
}
const { error } = await db.auth.admin.updateUserById(u.id, { password })
if (error) {
  console.error('reset failed:', error.message)
  process.exit(1)
}
console.log(`✓ password reset: ${email} → ${password}`)
