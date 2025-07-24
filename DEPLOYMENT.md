# Deployment Guide for Ampli

## Vercel Deployment

Your Ampli project is configured for Vercel deployment with serverless functions.

### Prerequisites
1. Vercel account (sign up at vercel.com)
2. Vercel CLI installed (`npm i -g vercel`)
3. Environment variables configured

### Environment Variables Needed

Set these in your Vercel project dashboard:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
MAX_CONTENT_LENGTH=10000
DEFAULT_PLATFORMS=instagram,linkedin,twitter,facebook
NODE_ENV=production
```

### Deployment Steps

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy:**
   ```bash
   vercel --prod --yes
   ```

3. **Set Environment Variables:**
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all the variables listed above

### Post-Deployment Setup

1. **Update Supabase URLs:**
   - In your Supabase dashboard
   - Go to Authentication > URL Configuration
   - Add your Vercel domain to Site URL and Redirect URLs

2. **Google OAuth (if enabled):**
   - Update redirect URIs in Google Cloud Console
   - Add your Vercel domain to authorized redirect URIs

### Project Structure for Vercel

```
/
├── api/
│   └── index.js          # Main serverless function
├── public/
│   ├── landing.html      # Landing page
│   ├── index.html        # App page
│   └── [other assets]    # CSS, JS files
├── vercel.json           # Vercel configuration
└── [other files]
```

### Features Available After Deployment

- ✅ Landing page at your-domain.vercel.app
- ✅ App at your-domain.vercel.app/app
- ✅ API endpoints at your-domain.vercel.app/api/*
- ✅ Static file serving
- ✅ Serverless functions for all backend logic

### Troubleshooting

1. **Build Errors:** Check Vercel build logs in dashboard
2. **API Errors:** Verify environment variables are set
3. **Database Errors:** Confirm Supabase connection strings
4. **Auth Errors:** Update redirect URLs in auth providers

### Monitoring

- Check Vercel dashboard for function logs
- Monitor Supabase dashboard for database usage
- Use Vercel Analytics for traffic insights