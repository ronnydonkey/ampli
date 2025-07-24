const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  // Sign up
  router.post('/signup', async (req, res) => {
    try {
      const { email, password, fullName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || ''
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ 
        message: 'User created successfully. Please check your email to verify your account.',
        user: data.user 
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Sign in
  router.post('/signin', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      res.json({ 
        user: data.user,
        session: data.session 
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Sign out
  router.post('/signout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Signed out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user
  router.get('/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return res.status(500).json({ error: 'Failed to fetch user profile' });
      }

      res.json({ user: { ...user, profile } });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update profile
  router.put('/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { fullName, avatarUrl } = req.body;
      const updates = {};
      
      if (fullName !== undefined) updates.full_name = fullName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ profile: data });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Google OAuth URL
  router.get('/google', async (req, res) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${req.protocol}://${req.get('host')}/app`
        }
      });

      if (error) {
        if (error.message.includes('provider is not enabled')) {
          return res.status(400).json({ 
            error: 'Google authentication is not configured. Please enable Google OAuth in your Supabase project settings.',
            setupInstructions: [
              '1. Go to your Supabase project dashboard',
              '2. Navigate to Authentication > Providers',
              '3. Enable Google provider',
              '4. Add your Google OAuth credentials',
              '5. Add https://ampli-seven.vercel.app to authorized redirect URLs'
            ]
          });
        }
        return res.status(400).json({ error: error.message });
      }

      res.json({ url: data.url });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // OAuth callback
  router.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    if (code) {
      res.redirect(`/?code=${code}`);
    } else {
      res.redirect('/?error=auth_failed');
    }
  });

  return router;
};