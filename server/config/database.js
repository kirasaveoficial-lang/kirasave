const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use PostgreSQL in production (Render), SQLite for development
const isProduction = process.env.NODE_ENV === 'production';

let pool;
let pgPool; // Store actual PostgreSQL pool separately

if (isProduction && process.env.DATABASE_URL) {
  // Use PostgreSQL in production (Render)
  console.log('DATABASE_URL found:', process.env.DATABASE_URL.substring(0, 20) + '...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Connected to PostgreSQL (Render)');

  // Initialize PostgreSQL tables
  initializePostgreSQLTables(pgPool);

  // Create wrapper for PostgreSQL that mimics SQLite API
  pool = {
    run: (sql, params, callback) => {
      // Convert SQLite ? to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

      // Convert double quotes to single quotes for string literals (only for non-identifier strings)
      pgSql = pgSql.replace(/"([^"]+)"/g, (match, content) => {
        // Don't convert if it's followed by common SQL keywords (table/column identifiers)
        const keywords = ['approved', 'pending', 'draft', 'published', 'active', 'inactive'];
        if (keywords.includes(content)) {
          return `'${content}'`;
        }
        return match;
      });

      // Handle INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
      if (pgSql.trim().toUpperCase().startsWith('INSERT OR IGNORE')) {
        pgSql = pgSql.replace(/INSERT OR IGNORE/gi, 'INSERT');
        // Add ON CONFLICT DO NOTHING if it's an INSERT into a table with unique constraints
        if (pgSql.includes('tags') || pgSql.includes('users')) {
          pgSql += ' ON CONFLICT DO NOTHING';
        }
      }

      // Add RETURNING clause to INSERT statements to get the inserted ID
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }

      // Handle case where params is actually the callback (no params provided)
      const actualParams = Array.isArray(params) ? params : [];
      const actualCallback = typeof params === 'function' ? params : callback;

      pgPool.query(pgSql, actualParams, (err, result) => {
        if (err) {
          if (actualCallback) actualCallback(err);
          return;
        }

        const lastId = result.rows[0] ? result.rows[0].id : null;
        const changes = result.rowCount;

        if (actualCallback) {
          // Call callback with 'this' context containing lastID (SQLite compatibility)
          actualCallback.call({ lastID: lastId, changes: changes }, null, { lastID: lastId, changes: changes });
        }
      });
    },

    get: (sql, params, callback) => {
      // Convert SQLite ? to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

      // Convert double quotes to single quotes for string literals (only for specific keywords)
      const keywords = ['approved', 'pending', 'draft', 'published', 'active', 'inactive', 'rejected', 'resolved'];
      pgSql = pgSql.replace(/"([^"]+)"/g, (match, content) => {
        if (keywords.includes(content)) {
          return `'${content}'`;
        }
        return match;
      });

      // Convert SQLite CURRENT_TIMESTAMP to PostgreSQL NOW()
      pgSql = pgSql.replace(/CURRENT_TIMESTAMP/g, 'NOW()');

      // Convert integer 1/0 to TRUE/FALSE for boolean columns
      pgSql = pgSql.replace(/\b(is_online|is_read|is_admin|is_banned|is_cover)\s*=\s*1\b/g, '$1 = TRUE');
      pgSql = pgSql.replace(/\b(is_online|is_read|is_admin|is_banned|is_cover)\s*=\s*0\b/g, '$1 = FALSE');

      // Convert read_status to is_read (for backwards compatibility with old schema)
      pgSql = pgSql.replace(/\bread_status\b/g, 'is_read');

      // Convert double-quoted string literals ONLY (not identifiers)
      // PostgreSQL uses double quotes for identifiers (table/column names)
      // We only want to convert string literals like "approved" to 'approved'
      const stringLiteralKeywords = ['approved', 'pending', 'draft', 'published', 'active', 'inactive', 'rejected', 'resolved', 'failed', 'success'];
      pgSql = pgSql.replace(/"([^"]+)"/g, (match, content) => {
        // If it's a known keyword, convert to single quote (string literal)
        if (stringLiteralKeywords.includes(content)) {
          return `'${content}'`;
        }
        // Otherwise, keep as double quote (identifier)
        return match;
      });

      // Handle case where params is actually the callback (no params provided)
      const actualParams = Array.isArray(params) ? params : [];
      const actualCallback = typeof params === 'function' ? params : callback;

      pgPool.query(pgSql, actualParams, (err, result) => {
        if (err) {
          if (actualCallback) actualCallback(err);
          return;
        }

        const row = result.rows[0] || null;

        if (actualCallback) {
          actualCallback(null, row);
        }
      });
    },

    all: (sql, params, callback) => {
      // Convert SQLite ? to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

      // Convert double quotes to single quotes for string literals (only for specific keywords)
      const keywords = ['approved', 'pending', 'draft', 'published', 'active', 'inactive', 'rejected', 'resolved'];
      pgSql = pgSql.replace(/"([^"]+)"/g, (match, content) => {
        if (keywords.includes(content)) {
          return `'${content}'`;
        }
        return match;
      });

      // Convert SQLite CURRENT_TIMESTAMP to PostgreSQL NOW()
      pgSql = pgSql.replace(/CURRENT_TIMESTAMP/g, 'NOW()');

      // Convert integer 1/0 to TRUE/FALSE for boolean columns
      pgSql = pgSql.replace(/\b(is_online|is_read|is_admin|is_banned|is_cover)\s*=\s*1\b/g, '$1 = TRUE');
      pgSql = pgSql.replace(/\b(is_online|is_read|is_admin|is_banned|is_cover)\s*=\s*0\b/g, '$1 = FALSE');

      // Convert read_status to is_read (for backwards compatibility with old schema)
      pgSql = pgSql.replace(/\bread_status\b/g, 'is_read');

      // Convert double-quoted string literals ONLY (not identifiers)
      // PostgreSQL uses double quotes for identifiers (table/column names)
      // We only want to convert string literals like "approved" to 'approved'
      const stringLiteralKeywords = ['approved', 'pending', 'draft', 'published', 'active', 'inactive', 'rejected', 'resolved', 'failed', 'success'];
      pgSql = pgSql.replace(/"([^"]+)"/g, (match, content) => {
        // If it's a known keyword, convert to single quote (string literal)
        if (stringLiteralKeywords.includes(content)) {
          return `'${content}'`;
        }
        // Otherwise, keep as double quote (identifier)
        return match;
      });

      // Handle case where params is actually the callback (no params provided)
      const actualParams = Array.isArray(params) ? params : [];
      const actualCallback = typeof params === 'function' ? params : callback;

      pgPool.query(pgSql, actualParams, (err, result) => {
        if (err) {
          console.error('Database error:', err);
          if (actualCallback) actualCallback(err);
          return;
        }

        const rows = result.rows || [];

        if (actualCallback) {
          actualCallback(null, rows);
        }
      });
    },

    query: (sql, params, callback) => {
      pool.all(sql, params, callback);
    }
  };
} else {
  // Use SQLite for development
  const dbPath = path.join(__dirname, '../../kira-save.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
      initializeSQLiteTables(db);
    }
  });

  pool = {
    query: db.all.bind(db),
    run: db.run.bind(db),
    get: db.get.bind(db),
    all: db.all.bind(db)
  };
}

function initializeSQLiteTables(db) {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT 'default-avatar.png',
        bio TEXT,
        birth_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_admin INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        is_online INTEGER DEFAULT 0,
        last_seen DATETIME,
        username_changed_at DATETIME
      )
    `);

    // Games table
    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        cover_image TEXT,
        description TEXT,
        platform TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Saves table
    db.run(`
      CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        thumbnail TEXT,
        user_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        category TEXT,
        download_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        rating_avg REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `);

    // Ratings table
    db.run(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id),
        UNIQUE(user_id, save_id)
      )
    `);

    // Comments table
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id),
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Comment likes
    db.run(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        comment_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        UNIQUE(user_id, comment_id)
      )
    `);

    // Favorites table
    db.run(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
        UNIQUE(user_id, save_id)
      )
    `);

    // Downloads table
    db.run(`
      CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        save_id INTEGER NOT NULL,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id)
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Activity logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Tags table
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        icon TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User tags relationship
    db.run(`
      CREATE TABLE IF NOT EXISTS user_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(user_id, tag_id)
      )
    `);

    // Reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id)
      )
    `);

    // Warnings table
    db.run(`
      CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);

    // Username changes
    db.run(`
      CREATE TABLE IF NOT EXISTS username_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Bans table
    db.run(`
      CREATE TABLE IF NOT EXISTS bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        banned_by INTEGER NOT NULL,
        reason TEXT NOT NULL,
        ip_address TEXT,
        country TEXT,
        city TEXT,
        region TEXT,
        isp TEXT,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (banned_by) REFERENCES users(id)
      )
    `);

    // Save images table
    db.run(`
      CREATE TABLE IF NOT EXISTS save_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        is_cover INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE
      )
    `);

    console.log('SQLite tables initialized');
  });
}

async function initializePostgreSQLTables(pool) {
  try {
    const createTables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) DEFAULT 'default-avatar.png',
        bio TEXT,
        birth_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_admin BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP,
        username_changed_at TIMESTAMP
      )`,

      // Games table
      `CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        cover_image VARCHAR(500),
        description TEXT,
        platform VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Saves table
      `CREATE TABLE IF NOT EXISTS saves (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        thumbnail VARCHAR(500),
        user_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        platform VARCHAR(100) NOT NULL,
        category VARCHAR(100),
        download_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        rating_avg DECIMAL(3,2) DEFAULT 0.00,
        rating_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )`,

      // Ratings table
      `CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id),
        UNIQUE(user_id, save_id)
      )`,

      // Comments table
      `CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id),
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )`,

      // Comment likes
      `CREATE TABLE IF NOT EXISTS comment_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        comment_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        UNIQUE(user_id, comment_id)
      )`,

      // Favorites table
      `CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE,
        UNIQUE(user_id, save_id)
      )`,

      // Downloads table
      `CREATE TABLE IF NOT EXISTS downloads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        save_id INTEGER NOT NULL,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id)
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(500),
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Activity logs table
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,

      // Tags table
      `CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(20),
        icon VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // User tags relationship
      `CREATE TABLE IF NOT EXISTS user_tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(user_id, tag_id)
      )`,

      // Reports table
      `CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        save_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (save_id) REFERENCES saves(id)
      )`,

      // Warnings table
      `CREATE TABLE IF NOT EXISTS warnings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )`,

      // Username changes
      `CREATE TABLE IF NOT EXISTS username_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        old_value VARCHAR(255),
        new_value VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Bans table
      `CREATE TABLE IF NOT EXISTS bans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        banned_by INTEGER NOT NULL,
        reason TEXT NOT NULL,
        ip_address VARCHAR(100),
        country VARCHAR(100),
        city VARCHAR(100),
        region VARCHAR(100),
        isp VARCHAR(100),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (banned_by) REFERENCES users(id)
      )`,

      // Save images table
      `CREATE TABLE IF NOT EXISTS save_images (
        id SERIAL PRIMARY KEY,
        save_id INTEGER NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        is_cover BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE
      )`
    ];

    for (const sql of createTables) {
      await pool.query(sql);
    }

    console.log('PostgreSQL tables initialized successfully');
  } catch (error) {
    console.error('Error initializing PostgreSQL tables:', error);
  }
}

module.exports = pool;
