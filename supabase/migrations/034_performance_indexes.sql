-- Performance Indexes Migration
-- Adds missing indexes for common query patterns

-- Index for board_items board_id queries (used in getBoardUpdates, item listings)
CREATE INDEX IF NOT EXISTS idx_board_items_board_position
  ON board_items(board_id, position);

-- Index for item_comments lookup (used in getComments)
CREATE INDEX IF NOT EXISTS idx_item_comments_item_lookup
  ON item_comments(item_type, item_id, parent_comment_id);

-- Index for item_updates by item (used in getItemUpdates, activity feed)
CREATE INDEX IF NOT EXISTS idx_item_updates_item_created
  ON item_updates(item_type, item_id, created_at DESC);

-- Index for item_updates join with board_items (used in getBoardUpdates)
CREATE INDEX IF NOT EXISTS idx_item_updates_item_id
  ON item_updates(item_id) WHERE item_type = 'board_item';

-- Index for board_columns by board (used in getColumns)
CREATE INDEX IF NOT EXISTS idx_board_columns_board_position
  ON board_columns(board_id, position);

-- Index for board_groups by board (used in getGroups)
CREATE INDEX IF NOT EXISTS idx_board_groups_board_position
  ON board_groups(board_id, position);

-- Partial index for active inspectors (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_inspectors_active
  ON inspectors(full_name) WHERE status = 'active';

-- Index for routes by inspector and date (used in route lookups)
CREATE INDEX IF NOT EXISTS idx_routes_inspector_date
  ON routes(inspector_id, date DESC);

-- Index for company_services by inspector (used in workload queries)
CREATE INDEX IF NOT EXISTS idx_company_services_inspector
  ON company_services(assigned_inspector_id) WHERE assigned_inspector_id IS NOT NULL;

-- Index for company_locations by company (used in location lookups)
CREATE INDEX IF NOT EXISTS idx_company_locations_company
  ON company_locations(company_id, is_primary DESC);

-- Analyze tables to update statistics after index creation
ANALYZE board_items;
ANALYZE item_comments;
ANALYZE item_updates;
ANALYZE board_columns;
ANALYZE board_groups;
ANALYZE inspectors;
ANALYZE routes;
ANALYZE company_services;
ANALYZE company_locations;
