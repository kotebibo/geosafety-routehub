# Google OAuth Setup Guide

This guide explains how to configure Google Sign-In for GeoSafety RouteHub.

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to your Supabase project dashboard
- Your Supabase project URL (found in Settings → API)

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Either select an existing project or click "New Project"
4. If creating new: Enter a project name (e.g., "GeoSafety RouteHub") and click "Create"

### 1.2 Enable Google+ API (if not already enabled)

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 1.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (or Internal if using Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: GeoSafety RouteHub
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On Scopes page, click "Add or Remove Scopes"
   - Select `email` and `profile` scopes
   - Click "Update"
7. Click "Save and Continue" through the remaining steps

### 1.4 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application**
4. Enter a name (e.g., "GeoSafety RouteHub Web")
5. Under **Authorized JavaScript origins**, add:
   ```
   https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co
   ```
   For local development, also add:
   ```
   http://localhost:3000
   http://localhost:3001
   ```

6. Under **Authorized redirect URIs**, add:
   ```
   https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback
   ```

7. Click "Create"
8. **Copy and save** the **Client ID** and **Client Secret** - you'll need these for Supabase

## Step 2: Supabase Configuration

### 2.1 Enable Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Toggle **Enable Sign in with Google** to ON
6. Paste your **Client ID** from Google Cloud Console
7. Paste your **Client Secret** from Google Cloud Console
8. Click **Save**

### 2.2 Configure Redirect URLs (Optional)

By default, Supabase handles redirects. If you need custom redirect behavior:

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL: `https://your-domain.com`
3. Add redirect URLs:
   ```
   https://your-domain.com/auth/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```

## Step 3: Environment Variables

Ensure your `.env.local` file has these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

No additional environment variables are needed for Google OAuth - Supabase handles the credentials server-side.

## Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev:web
   ```

2. Navigate to `/auth/login`

3. Click the "Google-ით შესვლა" (Sign in with Google) button

4. You should be redirected to Google's sign-in page

5. After signing in, you'll be redirected back to your app

## Troubleshooting

### "redirect_uri_mismatch" Error

This means the redirect URI doesn't match what's configured in Google Cloud Console.

**Fix**: Ensure the redirect URI in Google Cloud Console exactly matches:
```
https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback
```

### "Access blocked: This app's request is invalid"

This usually means the OAuth consent screen isn't properly configured.

**Fix**:
1. Go to OAuth consent screen in Google Cloud Console
2. Ensure all required fields are filled
3. If in "Testing" mode, add your email to test users

### User Signs In But Has No Role

When a user signs in with Google for the first time, they won't have a role assigned.

**Fix**:
1. An admin needs to assign a role to the user in the `user_roles` table
2. Or implement automatic role assignment in the `fetchUserRole` function

### Session Not Persisting

If the session isn't persisting after Google sign-in:

**Fix**:
1. Check that the callback route is properly exchanging the code for a session
2. Verify cookies are not being blocked
3. Check browser console for errors

## Code Reference

The implementation consists of three parts:

### 1. AuthContext (`src/contexts/AuthContext.tsx`)

```typescript
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error };
};
```

### 2. Callback Route (`app/auth/callback/route.ts`)

```typescript
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(...)
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

### 3. Login Page Button (`app/auth/login/page.tsx`)

The Google sign-in button with proper branding and loading states.

## Security Notes

- Never expose your Google Client Secret in client-side code
- Supabase securely stores and uses the credentials server-side
- Always use HTTPS in production
- Consider implementing additional verification for sensitive operations

## Additional OAuth Providers

Supabase supports many OAuth providers. To add more (GitHub, Microsoft, etc.):

1. Follow similar steps in the respective provider's developer console
2. Enable the provider in Supabase Authentication settings
3. Add a new sign-in method in AuthContext
4. Add a button to the login page

Supported providers: Apple, Azure, Bitbucket, Discord, Facebook, GitHub, GitLab, Google, Kakao, Keycloak, LinkedIn, Notion, Slack, Spotify, Twitch, Twitter, WorkOS, Zoom
