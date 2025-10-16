# 🚀 QUICK SETUP - COPY & PASTE

## Step 1: Run This SQL in Supabase

```sql
-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'dispatcher', 'inspector')),
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_inspector ON user_roles(inspector_id);

CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE SQL STABLE;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

ALTER TABLE inspectors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspectors_user ON inspectors(user_id);
```

## Step 2: Enable Email Auth

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Email** → Make sure ENABLED ✅
3. Save

## Step 3: Create Admin User

1. **Authentication** → **Users** → **"Add user"**
2. Email: `admin@geosafety.ge`
3. Password: `Admin123!`
4. Auto Confirm: ✅ YES
5. **Copy the user ID (UUID)**

## Step 4: Assign Admin Role

Replace `YOUR_USER_ID_HERE` with the UUID from Step 3:

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('78f92e33-d8c4-40c7-951a-db4068cbd077', 'admin');
```

## Step 5: Test

```powershell
cd D:\geosafety-routehub
npm run dev
```

Open: http://localhost:3001
Login: `admin@geosafety.ge` / `Admin123!`

✅ Done!
