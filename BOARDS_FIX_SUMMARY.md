# Boards System Fix Summary

## Problem

The boards system was failing with two main errors:

1. **400 Bad Request** when fetching boards
2. **Invalid UUID error** when creating boards

Error messages:
```
GET /rest/v1/boards?select=*&or=(owner_id.eq.dev-admin-user,is_public.eq.true) 400 (Bad Request)
Failed to create board: {code: '22P02', message: 'invalid input syntax for type uuid: "dev-admin-user"'}
```

### Root Cause

The issue was a mismatch between auth user IDs and inspector IDs:

- **Auth Context**: Mock user has `id: 'dev-admin-user'` (not a valid UUID)
- **Database**: `boards.owner_id` references `inspectors.id` (which is a UUID)
- **Service Layer**: Was trying to filter boards using `owner_id.eq.${userId}` which passed 'dev-admin-user' instead of a valid inspector UUID

## Solution

### 1. Updated Service Layer to Use RLS Policies

**File**: `apps/web/src/services/user-boards.service.ts`

**Changes**:
- Removed explicit `owner_id` filtering from queries
- Let Row Level Security (RLS) policies handle access control automatically
- RLS policies use `auth.email()` to look up inspector ID internally

**Before**:
```typescript
async getBoards(userId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .or(`owner_id.eq.${userId},is_public.eq.true`)  // ❌ Tries to match UUID with 'dev-admin-user'
    .order('created_at', { ascending: false })
  ...
}
```

**After**:
```typescript
async getBoards(userId?: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false})  // ✅ RLS handles filtering
  ...
}
```

### 2. Created Inspector ID Lookup Hook

**File**: `apps/web/src/hooks/useInspectorId.ts` (NEW)

**Purpose**: Maps auth user email to inspector UUID from database

```typescript
export function useInspectorId(userEmail: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'inspector-id', userEmail],
    queryFn: async () => {
      const { data } = await supabase
        .from('inspectors')
        .select('id')
        .eq('email', userEmail)
        .single()
      return data?.id || null
    },
    enabled: !!userEmail,
    staleTime: Infinity,
  })
}
```

### 3. Updated CreateBoardModal

**File**: `apps/web/src/components/boards/CreateBoardModal.tsx`

**Changes**:
1. Added `useInspectorId` hook to get UUID from email
2. Updated board creation to use inspector ID instead of auth user ID
3. Disabled create buttons until inspector ID is loaded

**Key Changes**:
```typescript
// Added hook
const { data: inspectorId } = useInspectorId(user?.email)

// Use inspector ID for board creation
const newBoard = await createBoard.mutateAsync({
  owner_id: inspectorId,  // ✅ Valid UUID from inspectors table
  // ... rest of board data
})

// Disabled until inspector ID is available
disabled={!boardName.trim() || !inspectorId || createBoard.isPending}
```

### 4. Added Development Inspector Migration

**File**: `supabase/migrations/009_add_dev_inspector.sql` (NEW)

**Purpose**:
1. Creates dev@geosafety.ge inspector in database
2. Updates RLS policy to allow inspector lookups without authentication (development only)

```sql
-- Insert dev inspector
INSERT INTO public.inspectors (
    email,
    full_name,
    phone,
    role,
    status,
    zone,
    certifications
)
VALUES (
    'dev@geosafety.ge',
    'Development Admin',
    '+995-555-0000',
    'admin',
    'active',
    'Tbilisi',
    '{"certifications": ["Safety Inspector", "Quality Assurance"]}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- Update RLS policy for development
DROP POLICY IF EXISTS "All authenticated users can read inspectors" ON public.inspectors;

CREATE POLICY "Allow reading inspectors for lookup"
  ON public.inspectors FOR SELECT
  USING (true);  -- Development only - allows inspector lookups without auth
```

**Important**: This policy is permissive for development. In production, restore the authenticated-only policy.

## Required Actions

### Step 1: Run Migration 009

Open Supabase SQL Editor and run:

```sql
-- From file: supabase/migrations/009_add_dev_inspector.sql
```

This creates the development inspector that the mock auth user maps to.

### Step 2: Verify Inspector Exists

```sql
SELECT id, email, full_name, role
FROM public.inspectors
WHERE email = 'dev@geosafety.ge';
```

Should return one row with a UUID `id`.

### Step 3: Test Board Creation

1. Navigate to [http://localhost:3002/boards](http://localhost:3002/boards)
2. Should see boards list without errors
3. Click "Create Board"
4. Create a board from scratch or template
5. Board should be created successfully

## How It Works Now

### Board Fetching Flow:

1. User visits `/boards` page
2. `useUserBoards` hook calls `userBoardsService.getBoards()`
3. Service queries boards WITHOUT explicit filtering
4. **RLS Policy** automatically filters results:
   - Gets `auth.email()` from Supabase auth context
   - Looks up inspector in `inspectors` table by email
   - Only returns boards where `owner_id` matches that inspector's ID or `is_public = true`
5. Boards displayed to user

### Board Creation Flow:

1. User clicks "Create Board"
2. `CreateBoardModal` component:
   - Gets `user.email` from AuthContext ('dev@geosafety.ge')
   - Uses `useInspectorId(user.email)` to fetch inspector UUID from database
   - Waits for inspector ID to load
3. User fills in board name and clicks create
4. Board created with `owner_id` set to inspector UUID (not auth user ID)
5. **Trigger** automatically adds owner as board member
6. Board appears in list

## Technical Details

### Why RLS Over Explicit Filtering?

**Advantages**:
1. **Security**: Access control enforced at database level, can't be bypassed
2. **Simplicity**: No need to pass user IDs through every query
3. **Consistency**: Same logic for all queries (boards, items, members)
4. **Auth Integration**: Leverages Supabase's built-in `auth.email()` function

### Inspector ID Lookup Strategy

**Why not update mock user ID to UUID?**
- Mock user is temporary for development
- Real auth will use Supabase Auth which has its own UUIDs
- Inspector table is the source of truth for user data
- Email is the stable identifier across auth and inspector tables

**Why cache inspector ID forever?**
- Inspector UUIDs never change
- Email-to-ID mapping is permanent
- Reduces unnecessary database calls
- Faster subsequent renders

## Files Modified

### New Files:
1. `apps/web/src/hooks/useInspectorId.ts` - Inspector ID lookup hook
2. `supabase/migrations/009_add_dev_inspector.sql` - Development inspector seed data

### Modified Files:
1. `apps/web/src/services/user-boards.service.ts` - Removed explicit owner_id filtering
2. `apps/web/src/components/boards/CreateBoardModal.tsx` - Use inspector ID for creation

## Testing Checklist

- [ ] Run migration 009 in Supabase
- [ ] Verify inspector exists: `SELECT * FROM inspectors WHERE email = 'dev@geosafety.ge'`
- [ ] Navigate to `/boards` - no errors in console
- [ ] Click "Create Board" - modal opens
- [ ] Create board from scratch - succeeds
- [ ] Create board from template - succeeds
- [ ] Board appears in list after creation
- [ ] Can click board to view details
- [ ] Can add items to board
- [ ] Can edit items inline

## Future Improvements

1. **Real Authentication**: Replace mock user with Supabase Auth
2. **Inspector Profile Link**: Link auth users to inspector records properly
3. **Member-Based Access**: Enhance RLS to support board members (viewers/editors)
4. **Caching Strategy**: Consider React Query cache time for inspector IDs
5. **Error Handling**: Add better error messages when inspector not found

## Related Documentation

- [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) - Migration 008 (RLS fixes)
- [BOARDS_SYSTEM_README.md](./BOARDS_SYSTEM_README.md) - Complete boards feature documentation
