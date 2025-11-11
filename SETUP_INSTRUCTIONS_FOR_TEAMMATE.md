# 🚀 GeoSafety RouteHub - Setup Instructions

## Follow these steps exactly to get the project running:

---

## ✅ **Step 1: Check Prerequisites**

Open **PowerShell** or **Command Prompt** and run:

```powershell
node --version
npm --version
git --version
```

**Requirements:**
- Node.js: 18.0.0 or higher
- npm: 9.0.0 or higher
- Git: Any version

**If Node.js is missing or outdated:**
Download from: https://nodejs.org/ (choose LTS version)

---

## ✅ **Step 2: Clone the Repository**

```powershell
# Navigate to where you want the project
cd C:\Users\YourUsername\Projects

# Clone the repository (replace with actual URL)
git clone <REPOSITORY_URL> geosafety-routehub

# Enter the project folder
cd geosafety-routehub
```

---

## ✅ **Step 3: Install Dependencies**

This will take 5-10 minutes:

```powershell
npm install
```

Wait for it to complete. You'll see a lot of packages being installed.

---

## ✅ **Step 4: Setup Environment File**

**IMPORTANT:** You received a file called `SEND_TO_TEAMMATE.env.local` via email.

**Do this:**

1. **Rename** the file from `SEND_TO_TEAMMATE.env.local` to `.env.local`
   - Just remove the `SEND_TO_TEAMMATE` part
   - Final name should be: `.env.local`

2. **Move** the file to this location:
   ```
   geosafety-routehub/apps/web/.env.local
   ```

   **Full path example:**
   ```
   C:\Users\YourUsername\Projects\geosafety-routehub\apps\web\.env.local
   ```

**Windows Tip:** If you can't see the file extension:
- Open File Explorer
- Click **View** → Check **File name extensions**

---

## ✅ **Step 5: Run the Application**

```powershell
# Make sure you're in the project root folder
cd geosafety-routehub

# Start the development server
npm run dev:web
```

You should see output like:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 3.5s
```

---

## ✅ **Step 6: Open the Application**

Open your browser and go to:
```
http://localhost:3000
```

You should see the GeoSafety RouteHub login page! 🎉

---

## 🔧 **Troubleshooting**

### Problem: "node is not recognized"
- Node.js is not installed or not in PATH
- Install/reinstall Node.js from https://nodejs.org/

### Problem: "npm install" fails
- Delete `node_modules` folder
- Delete `package-lock.json` file
- Run `npm install` again

### Problem: Port 3000 is already in use
- Close any other applications using port 3000
- Or change port: `npm run dev:web -- -p 3001`

### Problem: Can't find .env.local location
The file goes here:
```
<your-project-folder>/apps/web/.env.local
```

NOT in the root folder!

---

## 📁 **Project Structure**

After setup, your folder should look like:
```
geosafety-routehub/
├── apps/
│   └── web/
│       ├── .env.local          ← Your environment file goes HERE
│       ├── app/
│       ├── components/
│       └── package.json
├── packages/
├── node_modules/               ← Created after npm install
├── package.json
└── README.md
```

---

## 🎯 **Quick Reference Commands**

```powershell
# Start development server
npm run dev:web

# Stop server
Ctrl + C

# Install new dependencies (if code is updated)
npm install

# Build for production
npm run build:web
```

---

## 📞 **Need Help?**

If you encounter any issues:
1. Check the error message carefully
2. Make sure `.env.local` is in the correct location
3. Try restarting your computer and running again
4. Contact me with the specific error message

---

**Good luck! 🚀**
