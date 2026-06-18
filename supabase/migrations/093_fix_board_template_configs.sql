-- Fix board_templates: status columns with missing or misplaced config.options
-- Problem 1: Some templates have "options" at column top-level instead of inside "config.options"
-- Problem 2: Some templates have status columns with no options at all

DO $$
DECLARE
  t RECORD;
  col JSONB;
  fixed_columns JSONB;
  i INT;
  col_type TEXT;
  col_id TEXT;
  col_config JSONB;
  col_options JSONB;
  needs_update BOOLEAN;
BEGIN
  FOR t IN SELECT id, name, default_columns FROM board_templates LOOP
    fixed_columns := '[]'::jsonb;
    needs_update := false;

    FOR i IN 0 .. jsonb_array_length(t.default_columns) - 1 LOOP
      col := t.default_columns->i;
      col_type := col->>'type';
      col_id := col->>'id';

      IF col_type = 'status' THEN
        col_config := col->'config';
        col_options := col->'options';

        -- Case 1: options at top level, no config or empty config
        IF col_options IS NOT NULL AND (col_config IS NULL OR col_config = '{}'::jsonb OR col_config->'options' IS NULL) THEN
          col := col || jsonb_build_object('config', jsonb_build_object('options', col_options));
          col := col - 'options';
          needs_update := true;

        -- Case 2: no options anywhere — add defaults based on column name
        ELSIF (col_config IS NULL OR col_config = '{}'::jsonb OR col_config->'options' IS NULL) AND col_options IS NULL THEN
          CASE col_id
            WHEN 'status' THEN
              col := col || jsonb_build_object('config', jsonb_build_object('options', '[
                {"id": "working", "color": "#fdab3d", "label": "Working on it"},
                {"id": "done", "color": "#00c875", "label": "Done"},
                {"id": "stuck", "color": "#df2f4a", "label": "Stuck"},
                {"id": "pending", "color": "#c4c4c4", "label": "Pending"}
              ]'::jsonb));
            WHEN 'priority' THEN
              col := col || jsonb_build_object('config', jsonb_build_object('options', '[
                {"id": "critical", "color": "#333333", "label": "Critical"},
                {"id": "high", "color": "#df2f4a", "label": "High"},
                {"id": "medium", "color": "#fdab3d", "label": "Medium"},
                {"id": "low", "color": "#579bfc", "label": "Low"}
              ]'::jsonb));
            WHEN 'category' THEN
              col := col || jsonb_build_object('config', jsonb_build_object('options', '[
                {"id": "cat_1", "color": "#00c875", "label": "Category 1"},
                {"id": "cat_2", "color": "#fdab3d", "label": "Category 2"},
                {"id": "cat_3", "color": "#579bfc", "label": "Category 3"},
                {"id": "other", "color": "#c4c4c4", "label": "Other"}
              ]'::jsonb));
            WHEN 'content_type' THEN
              col := col || jsonb_build_object('config', jsonb_build_object('options', '[
                {"id": "blog", "color": "#579bfc", "label": "Blog Post"},
                {"id": "social", "color": "#fdab3d", "label": "Social Media"},
                {"id": "video", "color": "#df2f4a", "label": "Video"},
                {"id": "email", "color": "#00c875", "label": "Email"}
              ]'::jsonb));
            ELSE
              col := col || jsonb_build_object('config', jsonb_build_object('options', '[
                {"id": "option_1", "color": "#00c875", "label": "Option 1"},
                {"id": "option_2", "color": "#fdab3d", "label": "Option 2"},
                {"id": "option_3", "color": "#df2f4a", "label": "Option 3"}
              ]'::jsonb));
          END CASE;
          needs_update := true;
        END IF;
      END IF;

      fixed_columns := fixed_columns || jsonb_build_array(col);
    END LOOP;

    IF needs_update THEN
      UPDATE board_templates SET default_columns = fixed_columns, updated_at = now() WHERE id = t.id;
      RAISE NOTICE 'Fixed template: %', t.name;
    END IF;
  END LOOP;
END $$;
