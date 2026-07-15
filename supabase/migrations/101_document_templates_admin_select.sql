-- Admins can view all document templates.
--
-- The SELECT policy on document_templates only allowed board members and the
-- board owner. Admins are the only role allowed to CREATE templates (see
-- "Admins can insert templates"), so an admin who wasn't a member of the
-- target board could upload a template and then not see it anywhere in the
-- UI. Align SELECT with the other admin policies.

DROP POLICY IF EXISTS "Users can view templates for accessible boards" ON document_templates;

CREATE POLICY "Users can view templates for accessible boards"
ON document_templates FOR SELECT
USING (
  board_id IS NULL
  OR EXISTS (
    SELECT 1 FROM board_members bm
    WHERE bm.board_id = document_templates.board_id
      AND bm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = document_templates.board_id
      AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);
