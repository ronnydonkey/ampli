# Ampli - Content Amplifier for Social Media

Ampli is a web application that helps you amplify your content across multiple social media platforms. It uses AI to adapt your content for each platform's unique style and requirements.

## Features

- **Multi-Platform Support**: Create content once and automatically adapt it for Instagram, LinkedIn, Twitter/X, and Facebook
- **AI-Powered Adaptation**: Uses Anthropic's Claude AI to intelligently reformat content for each platform
- **User Authentication**: Secure user accounts with Supabase Auth
- **Content Management**: Save, view, and manage all your content in one place
- **Platform-Specific Optimization**: Each platform gets content optimized for its audience and format requirements
- **Tone Selection**: Choose from professional, casual, friendly, urgent, or inspirational tones

## Prerequisites

- Node.js (v14 or higher)
- A Supabase account (free tier works)
- An Anthropic API key

## Setup Instructions

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to the SQL Editor in your Supabase dashboard
   - Run the SQL schema from `supabase/schema.sql`
   - Copy your project URL and anon key from Settings > API

3. **Configure environment variables:**
   - Check the `.env` file exists with:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     ANTHROPIC_API_KEY=your_anthropic_api_key
     MAX_CONTENT_LENGTH=10000
     DEFAULT_PLATFORMS=instagram,linkedin,twitter,facebook
     ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Open your browser and navigate to `http://localhost:3000`
   - Create an account or sign in
   - Start creating and amplifying your content!

## How to Use

1. **Sign Up/Sign In**: Create a new account or sign in with existing credentials
2. **Create Content**: Enter your original content in the text area
3. **Select Platforms**: Choose which social media platforms you want to target
4. **Choose Tone**: Select the appropriate tone for your content
5. **Amplify**: Click "Amplify Content" to generate platform-specific versions
6. **Copy/Download**: Use the copy or download buttons to save the adapted content
7. **Manage Content**: View all your created content in the "Your Content" section

## API Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in user
- `POST /api/auth/signout` - Sign out user
- `GET /api/auth/me` - Get current user info
- `GET /api/content` - Get all user content
- `POST /api/content` - Create new content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content
- `POST /api/amplify/:contentId/amplify` - Amplify content for platforms
- `POST /api/amplify/:contentId/hashtags` - Generate hashtags
- `POST /api/amplify/:contentId/improve` - Improve content based on feedback
- `GET /api/amplify/:contentId/analyze` - Analyze content tone

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API
- **Frontend**: Vanilla JavaScript, HTML, CSS

## License

ISC