const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  Supabase credentials not found. Create a .env file with SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Middleware
console.log('Loading middleware...');
const authMiddleware = require('./middleware/auth')(supabase);

// Routes
console.log('Loading routes...');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const amplifyRoutes = require('./routes/amplify');

console.log('Setting up routes...');
app.use('/api/auth', authRoutes(supabase));
app.use('/api/content', contentRoutes(supabase, authMiddleware));
app.use('/api/amplify', amplifyRoutes(supabase, authMiddleware));
console.log('Routes configured');

// Landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// App route
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
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

// Config endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    supabase: {
      initialized: !!supabase,
      url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET'
    }
  });
});

console.log('🚀 Ampli Server Starting...');
console.log('📊 Dashboard will be available at: http://localhost:' + PORT);

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Ampli running on port ${PORT}`);
    console.log(`🔗 Open: http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use!`);
    }
    process.exit(1);
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  });

} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Keep the Node.js process alive
setInterval(() => {}, 1 << 30);

