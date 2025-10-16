# 🔧 TROUBLESHOOTING GUIDE

## ❌ Current Issue: Environment Variable / Chunk Loading Errors

### **Problem:**
The app is throwing errors about missing environment variables or webpack chunk loading failures.

### **Quick Fixes:**

## **Fix 1: Clean Restart (RECOMMENDED)**

1. **Close ALL browser tabs with localhost**
2. **Kill all Node processes:**
   ```powershell
   # In PowerShell
   Get-Process -Name node | Stop-Process -Force
   ```

3. **Clean and restart:**
   ```bash
   cd D:\geosafety-routehub\apps\web
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run dev
   ```

4. **Wait for "✓ Ready" message** (may take 30-60 seconds)

5. **Open fresh browser tab:** http://localhost:3000

---

## **Fix 2: Check Environment Variables**

1. **Verify `.env.local` exists:**
   ```
   D:\geosafety-routehub\apps\web\.env.local
   ```

2. **Should contain:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://rjnraabxbpvonhowdfuc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_MAP_PROVIDER=openstreetmap
   ```

3. **If missing, copy from `.env.example`**

---

## **Fix 3: Alternative - Use Mock Env**

If environment loading is still problematic, temporarily disable strict validation:

1. **Edit `src/config/env.ts`:**
   Change line 17-18 to:
   ```typescript
   if (!value) {
     console.warn(`Missing environment variable: ${key}, using default`)
     return defaultValue || 'MISSING_ENV_VAR'
   }
   ```

2. **Restart dev server**

---

## **Fix 4: Clear Browser Cache**

1. Open browser DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use Incognito/Private mode

---

## **Fix 5: Check for Port Conflicts**

If you see "Port XXXX is in use":

1. **Find processes using ports:**
   ```powershell
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   netstat -ano | findstr :3002
   ```

2. **Kill specific process:**
   ```powershell
   taskkill /PID <process_id> /F
   ```

---

## **Fix 6: Verify Supabase Connection**

1. **Test Supabase URL:**
   Open in browser: https://rjnraabxbpvonhowdfuc.supabase.co

2. **Should see:** Supabase API response (not 404)

---

## **Common Errors & Solutions:**

### **Error: "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"**
**Solution:** Follow Fix 1 or Fix 2 above

### **Error: "ChunkLoadError: Loading chunk app/layout failed"**
**Solution:** 
- Clear .next folder
- Clear browser cache
- Wait longer for compilation
- Check browser console for actual error

### **Error: "Cannot remove item .next/trace: Access denied"**
**Solution:** This is normal - just means the dev server is holding the file. Ignore it.

### **Error: "Port XXXX is in use"**
**Solution:** The server will automatically try the next port. Just use the port it shows.

---

## **Still Having Issues?**

### **Nuclear Option - Complete Reset:**

```powershell
# 1. Kill all Node processes
Get-Process -Name node | Stop-Process -Force

# 2. Delete all build artifacts
cd D:\geosafety-routehub\apps\web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# 3. Reinstall dependencies
npm install

# 4. Start fresh
npm run dev
```

---

## **Verify Installation:**

Once the server starts successfully, you should see:

```
✓ Ready in X.Xs
- Local:        http://localhost:3000
```

Then open the URL and you should see the GeoSafety RouteHub homepage.

---

## **Development Tips:**

1. **Always check the terminal** for "✓ Ready" before opening browser
2. **Wait for compilation** - first load can take 30-60 seconds
3. **Use Incognito mode** to avoid cache issues during development
4. **Check browser console** (F12) for client-side errors
5. **Check terminal** for server-side errors

---

## **Current Known Issues:**

✅ **Environment variables are configured correctly**  
✅ **Supabase credentials are valid**  
⚠️ **Webpack compilation may be slow on first load**  
⚠️ **Multiple port conflicts (3000-3003 in use)**  

---

## **Next Steps After Success:**

1. ✅ Homepage loads
2. ✅ Test login (if you have test user)
3. ✅ Test navigation
4. ✅ Check for console errors
5. ✅ Test company creation
6. ✅ Test route builder

---

*Troubleshooting Guide - October 10, 2025*
