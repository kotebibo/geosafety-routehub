-- ================================================
-- Migration 090: Add emoji reactions to comments
-- Stores reactions as JSONB: {"thumbs_up": ["user_id_1"], "heart": ["user_id_2"]}
-- ================================================

ALTER TABLE public.item_comments
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.item_comments.reactions IS 'Emoji reactions map: { emoji_key: [user_id, ...] }';

-- RPC to toggle reactions — bypasses RLS so any authenticated user can react
-- (the UPDATE policy only allows comment authors to update their own comments)
CREATE OR REPLACE FUNCTION public.toggle_comment_reaction(
  p_comment_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_reactions JSONB;
  v_users JSONB;
  v_idx INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(reactions, '{}'::jsonb) INTO v_reactions
  FROM item_comments WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  v_users := COALESCE(v_reactions -> p_emoji, '[]'::jsonb);

  -- Check if user already reacted
  SELECT idx - 1 INTO v_idx
  FROM jsonb_array_elements_text(v_users) WITH ORDINALITY AS t(val, idx)
  WHERE val = v_user_id::text
  LIMIT 1;

  IF v_idx IS NOT NULL THEN
    -- Remove reaction
    v_users := v_users - v_idx;
    IF jsonb_array_length(v_users) = 0 THEN
      v_reactions := v_reactions - p_emoji;
    ELSE
      v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_users);
    END IF;
  ELSE
    -- Add reaction
    v_users := v_users || to_jsonb(v_user_id::text);
    v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_users);
  END IF;

  UPDATE item_comments SET reactions = v_reactions WHERE id = p_comment_id;

  RETURN v_reactions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_comment_reaction(UUID, TEXT) TO authenticated;
