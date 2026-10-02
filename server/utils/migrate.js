const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  try {
    console.log('Running database migrations...');

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
        console.log('✅ Added assigned_by column to user_tags table');
      } else {
        console.log('✅ user_tags table already has assigned_by column');
      }
    } catch (err) {
      console.log('❌ assigned_by column check/add error:', err.message);
    }

    // Fix notifications table column name if needed
    try {
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
        console.log('✅ Fixed notifications table column name (read_status -> is_read)');
      } else {
        console.log('✅ Notifications table already has correct column name');
      }
    } catch (err) {
      console.log('❌ Column rename check error:', err.message);
    }

    console.log('Migrations completed successfully');
    await pool.end();
  } catch (error) {
    console.error('❌ Migration error:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
