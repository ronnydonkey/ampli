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
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  Supabase credentials not found. Create environment variables with SUPABASE_URL and SUPABASE_ANON_KEY');
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