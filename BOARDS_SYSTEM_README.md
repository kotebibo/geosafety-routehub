# User Boards System - Complete Implementation Guide

## Overview

The user boards system allows users to create custom boards similar to Monday.com. This implementation includes board creation from templates or scratch, inline editing, activity tracking, and access control.

## Architecture

### Database Schema

#### Tables Created (Migration 007)

1. **`boards`** - User-created board instances
   - Stores board metadata (name, description, color, icon)
   - Supports board types: routes, companies, inspectors, inspections, custom
   - Settings stored as JSONB (permissions, default view, features)
   - Links to owner via `owner_id` → `inspectors.id`

2. **`board_items`** - Rows/items within boards
   - Dynamic data storage using JSONB `data` field
   - Standard fields: name, status, assigned_to, due_date, priority
   - Position-based ordering
   - Links to board via `board_id` → `boards.id`

3. **`board_members`** - Access control for boards
   - Roles: owner, editor, viewer
   - Composite primary key: (board_id, user_id)
   - Auto-populated with board owner on creation

4. **`board_templates`** - Pre-built board templates
   - Default column configurations stored as JSONB
   - Categories for organization
   - Featured templates support

### Row Level Security (RLS)

**Current Implementation (Migration 008)**:
- Boards: Owner-only access + public boards
- Board Items: Based on board ownership
- Board Members: Can view if owner or member

**Note**: Simplified to avoid circular dependencies. Future enhancements can add member-based permissions.

## Features Implemented

### 1. Board Creation UI

**Component**: [CreateBoardModal.tsx](apps/web/src/components/boards/CreateBoardModal.tsx)

**Features**:
- 3-step wizard interface
- Step 1: Choose creation method (scratch or template)
- Step 2: Template selection with preview
- Step 3: Customize name and color
- Color picker with 6 preset colors
- Template categories and descriptions

**Usage**:
```typescript
import { CreateBoardModal } from '@/components/boards'

<CreateBoardModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onBoardCreated={(boardId) => router.push(`/boards/${boardId}`)}
/>
```

### 2. Boards Listing Page

**Route**: [/boards](apps/web/app/boards/page.tsx)

**Features**:
- Grid layout of board cards
- Board color bars
- Hover menus for actions (duplicate, delete, open in new tab)
- Empty state for new users
- Stats panel (total boards, shared boards, owned boards)
- Create new board card

**Access**: Navigate to `http://localhost:3002/boards`

### 3. Board Detail Page

**Route**: [/boards/[id]](apps/web/app/boards/[id]/page.tsx)

**Features**:
- Board header with color-coded icon
- Toolbar with "New Item" button
- Selection counter when items selected
- BoardTable integration with inline editing
- Back navigation to boards list
- Share and Settings buttons (UI only, functionality pending)

**Access**: Click any board card or navigate to `http://localhost:3002/boards/{board-id}`

### 4. BoardTable Integration

The existing BoardTable component is fully integrated:
- Displays board items as rows
- Columns configured based on board type
- Inline editing for all cell types
- Row selection for bulk actions
- Virtualization for performance

### 5. Service Layer

**File**: [user-boards.service.ts](apps/web/src/services/user-boards.service.ts)

**Methods** (30+ total):

**Boards**:
- `getBoards(userId)` - Get all accessible boards
- `getBoardsByType(boardType, userId)` - Filter by type
- `getBoard(boardId)` - Get single board
- `createBoard(board)` - Create new board
- `updateBoard(boardId, updates)` - Update board
- `deleteBoard(boardId)` - Delete board
- `duplicateBoard(boardId, newName, ownerId)` - Clone board

**Board Items**:
- `getBoardItems(boardId)` - Get all items in board
- `getBoardItem(itemId)` - Get single item
- `createBoardItem(item)` - Add new item
- `updateBoardItem(itemId, updates)` - Update item
- `updateBoardItemField(itemId, fieldName, value)` - Update JSONB field
- `deleteBoardItem(itemId)` - Remove item
- `reorderBoardItems(boardId, itemIds)` - Change order

**Board Members**:
- `getBoardMembers(boardId)` - Get all members
- `addBoardMember(member)` - Add member
- `updateBoardMemberRole(boardId, userId, role)` - Change role
- `removeBoardMember(boardId, userId)` - Remove member

**Templates**:
- `getBoardTemplates()` - Get all templates
- `getTemplate(templateId)` - Get single template
- `createBoardFromTemplate(templateId, name, ownerId)` - Create from template

**Search**:
- `searchBoards(query, userId)` - Search by name/description

### 6. React Query Hooks

**File**: [useUserBoards.ts](apps/web/src/hooks/board/useUserBoards.ts)

**Board Hooks**:
- `useUserBoards(userId)` - Query user's boards
- `useBoardsByType(boardType, userId)` - Query by type
- `useBoard(boardId)` - Query single board
- `useCreateBoard(userId)` - Mutation with optimistic update
- `useUpdateBoard(boardId)` - Mutation with optimistic update
- `useDeleteBoard(userId)` - Mutation with cache invalidation

**Item Hooks**:
- `useBoardItems(boardId)` - Query board items
- `useCreateBoardItem(boardId)` - Mutation with optimistic update
- `useUpdateBoardItem(boardId)` - Mutation with optimistic update
- `useDeleteBoardItem(boardId)` - Mutation with optimistic update

**Member Hooks**:
- `useBoardMembers(boardId)` - Query board members
- `useAddBoardMember(boardId)` - Mutation
- `useRemoveBoardMember(boardId)` - Mutation

**Template Hooks**:
- `useBoardTemplates()` - Query all templates
- `useCreateBoardFromTemplate(userId)` - Mutation

**Features**:
- Automatic cache invalidation
- Optimistic updates for instant UI feedback
- Error rollback on failure
- Loading and error states

## Pre-built Templates

### 1. Project Management
- **Icon**: Briefcase
- **Color**: Blue
- **Columns**:
  - Task Name (text)
  - Status (status)
  - Owner (person)
  - Due Date (date)
  - Priority (status)

### 2. CRM Pipeline
- **Icon**: Users
- **Color**: Green
- **Columns**:
  - Lead Name (text)
  - Company (text)
  - Stage (status)
  - Deal Value (number)
  - Owner (person)
  - Close Date (date)

### 3. Task Tracker
- **Icon**: Check Square
- **Color**: Purple
- **Columns**:
  - Task (text)
  - Status (status)
  - Assigned To (person)
  - Due Date (date)

## Usage Examples

### Creating a Board from Scratch

```typescript
import { useCreateBoard } from '@/hooks/board'
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user } = useAuth()
  const createBoard = useCreateBoard(user?.id || '')

  const handleCreate = async () => {
    const board = await createBoard.mutateAsync({
      owner_id: user.id,
      board_type: 'custom',
      name: 'My Custom Board',
      description: 'Track my projects',
      icon: 'board',
      color: 'blue',
      is_template: false,
      is_public: false,
      settings: {
        allowComments: true,
        allowActivityFeed: true,
        defaultView: 'table',
        permissions: {
          canEdit: [],
          canView: [],
        },
      },
    })

    console.log('Created board:', board.id)
  }

  return <button onClick={handleCreate}>Create Board</button>
}
```

### Creating from Template

```typescript
import { useCreateBoardFromTemplate } from '@/hooks/board'

function MyComponent() {
  const { user } = useAuth()
  const createFromTemplate = useCreateBoardFromTemplate(user?.id || '')

  const handleCreate = async (templateId: string) => {
    const board = await createFromTemplate.mutateAsync({
      templateId,
      name: 'My Project Board',
    })

    console.log('Created from template:', board.id)
  }

  return <button onClick={() => handleCreate('template-id')}>
    Use Template
  </button>
}
```

### Adding Items to a Board

```typescript
import { useCreateBoardItem } from '@/hooks/board'

function BoardComponent({ boardId }: { boardId: string }) {
  const { user } = useAuth()
  const createItem = useCreateBoardItem(boardId)

  const handleAddItem = async () => {
    await createItem.mutateAsync({
      board_id: boardId,
      position: 1,
      name: 'New Task',
      status: 'working_on_it',
      data: {
        customField1: 'value1',
        customField2: 'value2',
      },
      priority: 1,
      created_by: user.id,
    })
  }

  return <button onClick={handleAddItem}>Add Item</button>
}
```

### Inline Editing

```typescript
import { useUpdateBoardItem } from '@/hooks/board'

function BoardTableWrapper({ boardId }: { boardId: string }) {
  const updateItem = useUpdateBoardItem(boardId)

  const handleCellEdit = async (rowId: string, columnId: string, value: any) => {
    await updateItem.mutateAsync({
      itemId: rowId,
      updates: {
        [columnId]: value,
      },
    })
  }

  return (
    <BoardTable
      onCellEdit={handleCellEdit}
      // ... other props
    />
  )
}
```

## Type Definitions

### Board
```typescript
interface Board {
  id: string
  owner_id: string
  board_type: 'routes' | 'companies' | 'inspectors' | 'inspections' | 'custom'
  name: string
  name_ka?: string
  description?: string
  icon?: string
  color?: string
  is_template: boolean
  is_public: boolean
  folder_id?: string
  settings: BoardSettings
  created_at: string
  updated_at: string
}
```

### BoardItem
```typescript
interface BoardItem {
  id: string
  board_id: string
  position: number
  data: Record<string, any> // Dynamic JSONB storage
  name: string
  status: StatusType
  assigned_to?: string
  due_date?: string
  priority: number
  created_by?: string
  created_at: string
  updated_at: string
}
```

### BoardMember
```typescript
interface BoardMember {
  board_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  added_by?: string
  added_at: string
}
```

### BoardSettings
```typescript
interface BoardSettings {
  allowComments: boolean
  allowActivityFeed: boolean
  defaultView: 'table' | 'kanban' | 'calendar' | 'gantt'
  permissions: {
    canEdit: string[]
    canView: string[]
  }
}
```

## Activity Tracking

Board items automatically track changes via database triggers:

**Tracked Events**:
- Item creation
- Status changes (old → new)
- Assignment changes
- Reassignments

**Integration**: Uses existing `item_updates` table with `item_type = 'board_item'`

## Pending Features

### High Priority
1. **Member Management UI**
   - Add/remove board members
   - Change member roles
   - Member picker component

2. **Board Settings Panel**
   - Toggle comments/activity feed
   - Set default view
   - Configure permissions
   - Board deletion confirmation

3. **Bulk Actions**
   - Delete selected items
   - Update status for multiple items
   - Assign multiple items

### Medium Priority
4. **Board Folders**
   - Organize boards into folders
   - Folder navigation
   - Drag-and-drop organization

5. **Board Search & Filter**
   - Search items within board
   - Filter by status, assignee, date
   - Save filter presets

6. **Board Views**
   - Kanban board view
   - Calendar view
   - Gantt chart view

7. **Board Duplication**
   - Implement duplicate functionality
   - Copy items option
   - Copy members option

### Low Priority
8. **Advanced Templates**
   - More template categories
   - Custom template creation
   - Template marketplace

9. **Board Analytics**
   - Item completion rates
   - Time tracking
   - Team performance metrics

10. **Import/Export**
    - Export to CSV/Excel
    - Import from other tools
    - Backup/restore functionality

## Testing the Implementation

### Manual Testing Checklist

1. **Navigation**
   - [ ] Navigate to `/boards` page
   - [ ] See empty state if no boards exist
   - [ ] See board grid if boards exist

2. **Board Creation**
   - [ ] Click "Create Board" button
   - [ ] Modal opens with two options
   - [ ] Select "Start from Scratch"
   - [ ] Enter board name
   - [ ] Select color
   - [ ] Click "Create Board"
   - [ ] Redirected to new board

3. **Template Creation**
   - [ ] Click "Create Board"
   - [ ] Select "Use a Template"
   - [ ] See 3 templates
   - [ ] Select a template
   - [ ] Enter board name
   - [ ] Click "Create Board"
   - [ ] Board created with template columns

4. **Board Detail Page**
   - [ ] Click board card
   - [ ] Board loads without errors
   - [ ] Board name displayed
   - [ ] "New Item" button visible
   - [ ] Board table visible

5. **Adding Items**
   - [ ] Click "New Item"
   - [ ] New row appears with "New Item" name
   - [ ] Can edit name inline
   - [ ] Can change status
   - [ ] Can assign to user

6. **Inline Editing**
   - [ ] Click any cell
   - [ ] Cell becomes editable
   - [ ] Make change
   - [ ] Press Enter or click away
   - [ ] Change saved automatically

7. **Row Selection**
   - [ ] Click checkbox on row
   - [ ] Row highlighted
   - [ ] Selection count updates
   - [ ] Multiple selection works

## Troubleshooting

### Issue: "infinite recursion detected in policy"
**Solution**: Run migration 008 to fix RLS policies. See [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md)

### Issue: Boards not loading
**Causes**:
1. Migration 007 or 008 not applied
2. User not authenticated
3. RLS policies blocking access

**Debug**:
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
AND tablename IN ('boards', 'board_items', 'board_members');

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'boards';
```

### Issue: Can't create board items
**Causes**:
1. Board columns not configured
2. RLS policy blocking INSERT
3. Missing required fields

**Debug**: Check browser console for specific error messages

### Issue: Inline editing not working
**Causes**:
1. Cell type not editable
2. Update mutation failing
3. Optimistic update issue

**Debug**: Check Network tab for failed requests

## Performance Considerations

- **BoardTable Virtualization**: Only renders visible rows
- **React Query Caching**: Reduces API calls
- **Optimistic Updates**: Instant UI feedback
- **JSONB Indexing**: Fast queries on dynamic data
- **Pagination**: Consider for boards with 1000+ items

## Monday.com Design Compliance

The implementation follows Monday.com's design system:

- **Colors**: Monday.com color palette (`bg-monday-primary`, `bg-status-done`, etc.)
- **Typography**: Figtree font family
- **Spacing**: Monday.com spacing scale
- **Components**: Button, Input, Modal match Monday.com style
- **Animations**: Smooth transitions and hover effects
- **Icons**: Lucide icons similar to Monday.com's iconography

## Next Steps

After applying migration 008, you should:

1. Test board creation from the UI
2. Verify inline editing works
3. Test with multiple users to validate RLS
4. Implement member management UI
5. Add board settings panel
6. Implement bulk actions

## Resources

- [Monday.com Boards Documentation](https://support.monday.com/hc/en-us/sections/200390085-Boards)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
