const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./server/config/database');

// Initialize Cloudinary for avatars and images
require('./server/config/cloudinary');

// Run migrations on startup (non-blocking)
const { Pool } = require('pg');
const migrationPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Add assigned_by column to user_tags if missing
    try {
      const checkAssignedBy = await migrationPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_tags' AND column_name = 'assigned_by'
      `);

      if (checkAssignedBy.rows.length === 0) {
        await migrationPool.query(`
          ALTER TABLE user_tags
          ADD COLUMN assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('✅ Added assigned_by column to user_tags table');
      } else {
        console.log('✅ user_tags table already has assigned_by column');
      }
    } catch (err) {
      console.log('❌ assigned_by column check/add error:', err.message);
    }

    // Fix notifications table column name if needed
    try {
      const checkColumn = await migrationPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'read_status'
      `);

      if (checkColumn.rows.length > 0) {
        await migrationPool.query(`
          ALTER TABLE notifications
          RENAME COLUMN read_status TO is_read
        `);
        console.log('✅ Fixed notifications table column name (read_status -> is_read)');
      } else {
        console.log('✅ Notifications table already has correct column name');
      }
    } catch (err) {
      console.log('❌ Column rename check error:', err.message);
    }

    console.log('Migrations completed successfully');
    await migrationPool.end();
  } catch (error) {
    console.error('❌ Migration error:', error);
    await migrationPool.end();
  }
}

// Run migrations but don't block server startup
runMigrations().catch(err => {
  console.error('Migration failed, server starting anyway:', err);
});

// Start online status checker after database is initialized
// Temporarily disabled due to PostgreSQL migration issues
// setTimeout(() => {
//   require('./server/utils/onlineStatus');
// }, 2000);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render (specific IPs only, not permissive)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for trusted proxies in production
    return process.env.NODE_ENV === 'production' && req.ip === '127.0.0.1';
  }
});
app.use('/api/', limiter);

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/', require('./server/routes/index'));
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/saves', require('./server/routes/saves'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api/admin/marketplace', require('./server/routes/adminMarketplace'));
app.use('/api/tags', require('./server/routes/tags'));
app.use('/api/marketplace', require('./server/routes/marketplace'));
app.use('/api/marketplace-advanced', require('./server/routes/marketplaceAdvanced'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('=== ERROR ===');
  console.error('URL:', req.url);
  console.error('Method:', req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('=============');
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`KIRA SAVE server running on http://localhost:${PORT}`);
});
