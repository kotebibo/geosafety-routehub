# GeoSafety RouteHub - Boards System Features

## Overview
The GeoSafety RouteHub Boards system is a Monday.com-style collaborative workspace for managing routes, companies, inspectors, and inspections. It features real-time collaboration, rich column types, advanced filtering/sorting/grouping, and comprehensive activity tracking.

---

## Core Features

### 1. Column Types (14+ Types)

| Column Type | Purpose | File | Capabilities |
|------------|---------|------|--------------|
| **Text** | Single/multi-line text | `TextCell.tsx` | Basic text editing |
| **Number** | Numeric values | `NumberCell.tsx` | Number formatting, validation |
| **Status** | Colored status labels | `StatusCell.tsx` | Predefined status options (working_on_it, stuck, done, pending) |
| **Date** | Date picker | `DateCell.tsx` | Date selection, validation |
| **Date Range** | Start and end dates | `DateRangeCell.tsx` | Range selection |
| **Person** | Assign people/inspectors | `PersonCell.tsx` | Autocomplete person selection |
| **Route** | Link to a route | `RouteCell.tsx` | Route selection from master data |
| **Company** | Link to a company | `CompanyCell.tsx` | Company selection from master data |
| **Service Type** | Inspection service types | `ServiceTypeCell.tsx` | Service type selection |
| **Checkbox** | Yes/No toggle | `CheckboxCell.tsx` | Boolean toggle |
| **Phone** | Phone numbers | `PhoneCell.tsx` | Phone number display |
| **Files** | File attachments | `FilesCell.tsx` | Upload/download files to Supabase storage |
| **Updates** | Activity/comments | `UpdatesCell.tsx` | Show update/comment count, add comments |
| **Location** | Geographic location | - | Location data storage |

---

### 2. Cell Editing & Data Management

**Files:** `CellRenderer.tsx`, `MondayBoardTable.tsx`, individual cell components

**Capabilities:**
- Inline cell editing with click-to-edit UI
- Cell-level real-time collaboration indicators (see who's editing)
- Type-specific input components and validation
- Dynamic JSONB data storage for flexible columns
- Keyboard navigation (Enter to save, Escape to cancel)
- Undo/Redo support for edits

---

### 3. Groups & Organization

**Files:** `MondayBoardTable.tsx`, `BoardToolbar.tsx`

**Capabilities:**
- Default grouping by status/category
- Custom grouping by any groupable column
- Collapsible group headers
- Color-coded groups
- Group management (create, rename, change color, delete)
- Row reordering within groups via drag-and-drop

**Groupable Columns:** text, number, status, person, date, date_range, company, route, service_type, checkbox

---

### 4. Sorting

**Files:** `BoardToolbar.tsx`, `MondayBoardTable.tsx`

**Capabilities:**
- Sort by any column (ascending/descending)
- Toggle sort direction with repeated clicks
- Clear sort with one click
- Visual indicators showing active sort
- Supports multiple data types (text, numbers, dates)

---

### 5. Filtering

**Files:** `BoardToolbar.tsx`, `MondayBoardTable.tsx`

**Capabilities:**
- Type-specific filter conditions:
  - **Text:** equals, contains, starts_with, ends_with, is_empty, is_not_empty
  - **Number:** equals, greater_than, less_than, is_empty, is_not_empty
  - **Date:** equals, before, after, is_empty, is_not_empty
  - **Status:** equals, not_equals, is_empty, is_not_empty
  - **Person:** equals, is_empty, is_not_empty
  - **Checkbox:** is_checked, is_not_checked
- Multiple simultaneous filters
- Filter chips for visibility
- Clear all filters option

---

### 6. Real-Time Collaboration

**Files:** `ably-presence.service.ts`, `useRealtimeBoard.ts`, presence components

**Capabilities:**
- Live user presence tracking (who's viewing the board)
- Cell-level editing indicators (see who's editing which cell)
- Real-time item change propagation
- Ably-based messaging channel per board
- Connection status indicator
- User avatars with color coding
- Graceful fallback when Ably unavailable

---

### 7. Activity & Updates Tracking

**Files:** `ActivityLog.tsx`, `useActivity.ts`, `activity.service.ts`

**Capabilities:**
- Full change history with timestamps
- User attribution for all changes
- Update types: created, updated, deleted, status_changed, assigned, comment
- Before/after value comparison
- Field-level change tracking
- Rollback capability on eligible changes
- Color-coded update types

---

### 8. Comments (Updates Column)

**Files:** `UpdatesCell.tsx`, `activity.service.ts`

**Capabilities:**
- Add comments to any row
- Comment count display in cell
- Threaded replies
- User attribution
- Timestamps with "time ago" format
- Real-time comment updates

---

### 9. Import/Export

**Files:** `ImportBoardModal.tsx`, `exportBoard.ts`, `importBoard.ts`

**Export Capabilities:**
- CSV export with human-readable headers
- Excel export (.xls XML format)
- Proper escaping for special characters
- UUID to name resolution for relationships

**Import Capabilities:**
- Support for CSV, XLS, XLSX files
- Multi-step import: upload → column mapping → preview → import
- Auto-mapping columns by name
- Data validation before import
- Error reporting

---

### 10. Board Templates

**Files:** `CreateBoardModal.tsx`, `SaveAsTemplateModal.tsx`

**Capabilities:**
- Create board from blank or template
- Pre-built templates with default columns and items
- Save any board as reusable template
- Template categories: Project Management, CRM & Sales, HR, Operations, Marketing
- Featured template highlighting

---

### 11. Undo/Redo

**Files:** `useUndoRedo.ts`

**Capabilities:**
- 50-action history stack
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo)
- Action types tracked:
  - cell_edit, item_create, item_delete, item_duplicate
  - group_create, group_delete, group_rename, group_color_change
  - column_create, column_delete, column_rename, column_reorder
- Human-readable action descriptions

---

### 12. Multi-Selection & Bulk Operations

**Files:** `MondayBoardTable.tsx`

**Capabilities:**
- Multi-select checkbox for each row
- Select-all checkbox
- Selection count display
- Visual highlighting of selected rows
- Bulk delete, duplicate operations

---

### 13. Column Management

**Files:** `AddColumnModal.tsx`, `ColumnConfigPanel.tsx`, `boardsService.ts`

**Capabilities:**
- Add new columns (14+ types available)
- Column visibility toggle
- Column reordering via drag-and-drop
- Column resizing with persistence
- Pin/unpin columns
- Rename columns (double-click header)
- Delete columns

---

### 14. Drag & Drop

**Files:** `MondayBoardTable.tsx`

**Capabilities:**
- Column reordering via drag-and-drop
- Row reordering within groups
- Visual drop indicators (before/after position)
- Position persistence to database

---

### 15. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Enter` | Save cell edit |
| `Escape` | Cancel cell edit |
| `Tab` | Move to next cell |
| `Shift+Tab` | Move to previous cell |

---

### 16. File Attachments

**Files:** `FilesCell.tsx`

**Capabilities:**
- Upload multiple files per cell
- Supported types: images (jpg, png, gif, webp), PDFs, Word docs
- Max 10MB per file
- Supabase Storage integration with signed URLs
- File preview (images show thumbnails)
- Download and delete actions
- File count display in cell

---

### 17. Person/User Picker

**Files:** `PersonCell.tsx`, `UserPicker.tsx`

**Capabilities:**
- Search users by name or email
- User avatar with initials
- Clear selection option
- Portal-based dropdown (avoids clipping)
- Smart positioning (viewport-aware)

---

### 18. Board Settings & Metadata

**Files:** `CreateBoardModal.tsx`, board types

**Capabilities:**
- Board types: routes, companies, inspectors, inspections, custom
- Board name and description
- Icon and color selection
- Public/private visibility
- Folder organization
- Favorite boards

---

### 19. Performance Optimizations

**Implemented:**
- Virtual scrolling for large datasets
- Memoized cell components (`memo()`)
- Custom comparison for cell re-renders
- Pre-computed editing users Map for O(1) lookups
- React Query caching
- Skeleton loading states

---

## Architecture

### Component Hierarchy
```
BoardDetailPage ([id]/page.tsx)
├── BoardToolbar - Sort/Filter/Group controls
├── MondayBoardTable - Main table
│   ├── Group headers (collapsible)
│   ├── Column headers (draggable, resizable)
│   └── CellRenderer → Individual cell components
├── AddColumnModal
├── ImportBoardModal
├── SaveAsTemplateModal
└── ActivityLog
```

### Key Hooks
- `useUserBoards` - User's boards list
- `useBoardColumns` - Column configuration
- `useActivity` - Activity tracking
- `useUndoRedo` - Undo/redo stack
- `useInspectors` - Person data

### Services
- `boardsService` - Board CRUD operations
- `userBoardsService` - Items, groups, reordering
- `activityService` - Activity logging & comments

---

## Database Schema (Key Tables)

- `boards` - Board metadata
- `board_columns` - Column definitions
- `board_items` - Row data (with JSONB `data` field)
- `board_groups` - Group definitions
- `item_comments` - Comments/updates
- `activity_log` - Change history

---

## Summary

The boards system provides a comprehensive Monday.com-style experience with:

- **14+ column types** for diverse data
- **Real-time collaboration** via Ably
- **Advanced filtering, sorting, grouping**
- **Full activity tracking** with undo/redo
- **Import/export** in CSV/Excel formats
- **Template system** for quick board creation
- **File attachments** with cloud storage
- **Performance optimized** for large datasets
