# 🔧 ERROR 500 TROUBLESHOOTING GUIDE

## Common Causes and Solutions

When your coworker gets an Error 500, it usually means one of these issues:

---

## ✅ **Issue #1: Missing or Incorrect .env.local File**

### Symptoms:
- Error 500 when opening http://localhost:3000
- Console shows: "Invalid Supabase credentials" or similar

### Solution:

1. **Check if .env.local exists:**
   ```powershell
   # Go to web app directory
   cd D:\geosafety-routehub\apps\web
   
   # Check if file exists
   dir .env.local
   ```

2. **Verify file location:**
   - ❌ WRONG: `D:\geosafety-routehub\.env.local` (root folder)
   - ✅ CORRECT: `D:\geosafety-routehub\apps\web\.env.local` (inside apps/web)

3. **Verify file contents:**
   ```powershell
   # Open the file and check
   notepad apps\web\.env.local
   ```
   
   Should contain:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://rjnraabxbpvonhowdfuc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_KEY=eyJhbGc...
   NEXT_PUBLIC_MAP_PROVIDER=openstreetmap
   ```

4. **Copy from root if missing:**
   ```powershell
   # If you have .env.local in root, copy it to web folder
   copy .env.local apps\web\.env.local
   ```

---

## ✅ **Issue #2: Server Not Restarted After Adding .env.local**

### Symptoms:
- You added/fixed .env.local but still getting Error 500

### Solution:

1. **Stop the server:**
   - Press `Ctrl + C` in the terminal running `npm run dev:web`

2. **Restart the server:**
   ```powershell
   npm run dev:web
   ```

3. **Hard refresh browser:**
   - Press `Ctrl + Shift + R` or `Ctrl + F5`

---

## ✅ **Issue #3: Dependencies Not Installed**

### Symptoms:
- Error 500 with "Module not found" errors in console
- Missing packages errors

### Solution:

```powershell
# From project root
cd D:\geosafety-routehub

# Clean install
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/web/.next
rm package-lock.json

# Reinstall everything (takes 5-10 minutes)
npm install

# Start server
npm run dev:web
```

---

## ✅ **Issue #4: Node/npm Version Mismatch**

### Symptoms:
- Weird errors during npm install
- "engine" version errors

### Solution:

1. **Check versions:**
   ```powershell
   node --version    # Should be >= 18.0.0
   npm --version     # Should be >= 9.0.0
   ```

2. **Update if needed:**
   - Download from: https://nodejs.org/
   - Install LTS version
   - Restart terminal
   - Reinstall dependencies

---

## ✅ **Issue #5: Port 3000 Already in Use**

### Symptoms:
- "Port 3000 is already in use"
- Server fails to start

### Solution:

**Option 1: Kill the process using port 3000**
```powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Kill it (replace <PID> with actual number)
taskkill /PID <PID> /F
```

**Option 2: Use different port**
```powershell
npm run dev:web -- -p 3001
# Then open: http://localhost:3001
```

---

## ✅ **Issue #6: Supabase Connection Issues**

### Symptoms:
- Error 500 specifically when loading data
- "Failed to fetch" errors in console

### Solution:

1. **Test Supabase connection:**
   ```powershell
   # From web directory
   cd apps\web
   
   # Create test file
   notepad test-supabase.js
   ```

2. **Paste this code:**
   ```javascript
   require('dotenv').config({ path: '.env.local' });
   const { createClient } = require('@supabase/supabase-js');

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );

   async function test() {
     const { data, error } = await supabase
       .from('companies')
       .select('count')
       .limit(1);
     
     if (error) {
       console.log('❌ Supabase Error:', error);
     } else {
       console.log('✅ Supabase Connected!', data);
     }
   }

   test();
   ```

3. **Run test:**
   ```powershell
   node test-supabase.js
   ```

   - If ✅: Supabase works, problem is elsewhere
   - If ❌: Check .env.local credentials

---

## ✅ **Issue #7: Windows Path Issues**

### Symptoms:
- Errors with slashes or paths
- "Cannot find module" errors

### Solution:

```powershell
# Make sure you're in correct directory
cd /d D:\geosafety-routehub

# Use forward slashes in commands
npm run dev:web
```

---

## 🔍 **Quick Diagnostic Checklist**

Run these commands and check each result:

```powershell
# 1. Check Node version
node --version
# ✅ Should show: v18.0.0 or higher

# 2. Check if in correct directory
pwd
# ✅ Should show: D:\geosafety-routehub

# 3. Check if .env.local exists in correct place
dir apps\web\.env.local
# ✅ Should show the file

# 4. Check if dependencies installed
dir node_modules
# ✅ Should show folders

# 5. Check if web dependencies installed
dir apps\web\node_modules
# ✅ Should show folders

# 6. Try running
npm run dev:web
# ✅ Should show "Ready" message
```

---

## 📝 **Getting Detailed Error Information**

If still having issues, get the FULL error message:

1. **Open browser console:**
   - Press `F12` or `Ctrl + Shift + I`
   - Click "Console" tab

2. **Refresh page:**
   - Press `Ctrl + F5`

3. **Look for RED errors:**
   - Copy the FULL error message
   - Send to me with screenshot

4. **Check terminal output:**
   - Look at the terminal running `npm run dev:web`
   - Copy any error messages shown there

---

## 🚨 **Still Not Working? Gather This Info:**

Send me this information:

1. **Environment:**
   ```powershell
   node --version
   npm --version
   ```

2. **File check:**
   ```powershell
   dir apps\web\.env.local
   ```

3. **Console errors:**
   - F12 → Console tab → screenshot

4. **Terminal output:**
   - Screenshot of terminal running npm run dev:web

5. **Any error messages:**
   - Full text of any errors seen

---

## ⚡ **Nuclear Option: Complete Reset**

If nothing else works:

```powershell
# 1. Stop all Node processes
taskkill /F /IM node.exe

# 2. Delete everything
cd D:\geosafety-routehub
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/web/.next
rm -rf packages/*/node_modules
rm package-lock.json
rm apps/web/package-lock.json

# 3. Reinstall Node.js
# Download fresh from: https://nodejs.org/

# 4. Reinstall dependencies (takes 10 minutes)
npm install

# 5. Verify .env.local is in correct place
copy .env.local apps\web\.env.local

# 6. Start fresh
npm run dev:web
```

---

## 📞 **Contact Me With:**

- Screenshots of errors
- Output of diagnostic commands above
- What you tried already
- Operating system version

I'll help you get it working! 🚀
