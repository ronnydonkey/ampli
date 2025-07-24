const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Supabase client
let supabase = null;

// Use environment variables or fallback to hardcoded values
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dgihdtivvoqczspgxlil.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnaWhkdGl2dm9xY3pzcGd4bGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTM2MzAsImV4cCI6MjA2ODc2OTYzMH0.YBxjpZQGiUds-1V8jRQXzWD63OyJyY_kJfIX3NOeuYI';

// Set environment variables for other services
process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Add Anthropic API key if not present
if (!process.env.ANTHROPIC_API_KEY) {
  console.log('⚠️  ANTHROPIC_API_KEY not found in environment, content amplification will be disabled');
}

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  Supabase configuration missing');
}

// Middleware
console.log('Loading middleware...');
const authMiddleware = require('../middleware/auth')(supabase);

// Routes
console.log('Loading routes...');
const authRoutes = require('../routes/auth');
const contentRoutes = require('../routes/content');
const amplifyRoutes = require('../routes/amplify');

console.log('Setting up routes...');
app.use('/api/auth', authRoutes(supabase));
app.use('/api/content', contentRoutes(supabase, authMiddleware));
app.use('/api/amplify', amplifyRoutes(supabase, authMiddleware));
console.log('Routes configured');

// Landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'landing.html'));
});

// App route
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    supabase: !!supabase,
    timestamp: new Date().toISOString() 
  });
});

// Debug endpoint for token validation
app.post('/api/debug/validate-token', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.json({ error: 'No authorization header' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    res.json({
      token: token.substring(0, 20) + '...',
      supabaseInitialized: !!supabase,
      validationResult: {
        user: user ? { id: user.id, email: user.email } : null,
        error: error ? error.message : null
      }
    });
  } catch (err) {
    res.json({
      error: 'Exception during validation',
      message: err.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;