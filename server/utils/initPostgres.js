const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializePostgreSQLTables() {
  try {
    console.log('Initializing PostgreSQL tables...');

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
        is_read BOOLEAN DEFAULT FALSE,
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
        assigned_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
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
      )`,

      // Search history table
      `CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        query VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const sql of createTables) {
      await pool.query(sql);
    }

    // Fix notifications table column name if needed (read_status -> is_read)
    try {
      // Check if column exists first
      const checkColumn = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'read_status'
      `);

      if (checkColumn.rows.length > 0) {
        await pool.query(`
          ALTER TABLE notifications
          RENAME COLUMN read_status TO is_read
        `);
        console.log('Fixed notifications table column name (read_status -> is_read)');
      } else {
        console.log('Notifications table already has correct column name');
      }
    } catch (err) {
      console.log('Column rename check error (might be OK):', err.message);
    }

    // Add assigned_by column to user_tags if missing
    try {
      const checkAssignedBy = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_tags' AND column_name = 'assigned_by'
      `);

      if (checkAssignedBy.rows.length === 0) {
        await pool.query(`
          ALTER TABLE user_tags
          ADD COLUMN assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('Added assigned_by column to user_tags table');
      } else {
        console.log('user_tags table already has assigned_by column');
      }
    } catch (err) {
      console.log('assigned_by column check error (might be OK):', err.message);
    }

    console.log('PostgreSQL tables initialized successfully');
    await pool.end();
  } catch (error) {
    console.error('Error initializing PostgreSQL tables:', error);
    await pool.end();
    process.exit(1);
  }
}

initializePostgreSQLTables();
