-- ============================================
-- 113: Chat conversation pins
-- Admins can pin AI assistant conversations to
-- keep them at the top of the history list.
-- ============================================

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_pinned
  ON chat_conversations (user_id, pinned DESC, updated_at DESC);
