# Google Authentication Setup for Ampli

To enable Google authentication in your Ampli application, you need to configure it in both Google Cloud Console and Supabase.

## Step 1: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
     - `http://localhost:3001/api/auth/callback` (for local development)
   - Save and copy your Client ID and Client Secret

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Google" in the list and click "Enable"
5. Enter your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
6. Save the configuration

## Step 3: Update Redirect URLs

1. In Supabase Dashboard, go to "Authentication" > "URL Configuration"
2. Add your site URL to "Site URL": `http://localhost:3001` (for local development)
3. Add to "Redirect URLs":
   - `http://localhost:3001`
   - `http://localhost:3001/api/auth/callback`
   - Your production URLs when deploying

## Step 4: Test the Integration

1. Restart your server: `npm start`
2. Click "Continue with Google" on the login page
3. You should be redirected to Google's OAuth consent screen
4. After authorization, you'll be redirected back to your app

## Troubleshooting

If you see "Unsupported provider: provider is not enabled":
- Double-check that Google provider is enabled in Supabase
- Ensure you've saved the configuration after adding credentials
- Wait a few minutes for changes to propagate

If authentication succeeds but redirect fails:
- Verify your redirect URLs match exactly in both Google and Supabase
- Check that your Site URL is correctly set in Supabase

## Security Notes

- Never commit your `.env` file with API keys
- Use environment variables for all sensitive credentials
- Restrict your Google OAuth to specific domains in production