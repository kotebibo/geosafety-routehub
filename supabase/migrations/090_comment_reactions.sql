-- ================================================
-- Migration 090: Add emoji reactions to comments
-- Stores reactions as JSONB: {"thumbs_up": ["user_id_1"], "heart": ["user_id_2"]}
-- ================================================

ALTER TABLE public.item_comments
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.item_comments.reactions IS 'Emoji reactions map: { emoji_key: [user_id, ...] }';
