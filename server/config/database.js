const knex = require('knex');
const path = require('path');

// Use PostgreSQL in production (Render), SQLite for development
const isProduction = process.env.NODE_ENV === 'production';

const db = knex({
  client: isProduction ? 'pg' : 'sqlite3',
  connection: isProduction
    ? process.env.DATABASE_URL
    : {
      filename: path.join(__dirname, '../../kira-save.db')
    },
  useNullAsDefault: true,
  migrations: {
    tableName: 'knex_migrations'
  }
});

console.log(`Connected to ${isProduction ? 'PostgreSQL' : 'SQLite'} database`);

// Initialize tables if they don't exist
async function initializeTables() {
  const exists = await db.schema.hasTable('users');
  if (!exists) {
    await db.schema.createTable('users', table => {
      table.increments('id');
      table.string('username', 255).unique().notNullable();
      table.string('email', 255).unique().notNullable();
      table.string('password', 255).notNullable();
      table.string('avatar', 500).defaultTo('default-avatar.png');
      table.text('bio');
      table.date('birth_date');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.boolean('is_admin').defaultTo(false);
      table.boolean('is_banned').defaultTo(false);
      table.boolean('is_online').defaultTo(false);
      table.timestamp('last_seen');
      table.timestamp('username_changed_at');
    });

    await db.schema.createTable('games', table => {
      table.increments('id');
      table.string('name', 255).unique().notNullable();
      table.string('cover_image', 500);
      table.text('description');
      table.string('platform', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('saves', table => {
      table.increments('id');
      table.string('title', 255).notNullable();
      table.text('description');
      table.string('file_path', 500).notNullable();
      table.string('thumbnail', 500);
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('game_id').unsigned().notNullable().references('id').in('games');
      table.string('platform', 100).notNullable();
      table.string('category', 100);
      table.integer('download_count').defaultTo(0);
      table.integer('view_count').defaultTo(0);
      table.decimal('rating_avg', 3, 2).defaultTo(0.00);
      table.integer('rating_count').defaultTo(0);
      table.string('status', 50).defaultTo('pending');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('ratings', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('save_id').unsigned().notNullable().references('id').in('saves');
      table.integer('rating').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'save_id']);
    });

    await db.schema.createTable('comments', table => {
      table.increments('id');
      table.text('content').notNullable();
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('save_id').unsigned().notNullable().references('id').in('saves');
      table.integer('parent_id').unsigned().references('id').in('comments');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('comment_likes', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('comment_id').unsigned().notNullable().references('id').in('comments');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'comment_id']);
    });

    await db.schema.createTable('favorites', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('save_id').unsigned().notNullable().references('id').in('saves');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'save_id']);
    });

    await db.schema.createTable('downloads', table => {
      table.increments('id');
      table.integer('user_id').unsigned().references('id').in('users');
      table.integer('save_id').unsigned().notNullable().references('id').in('saves');
      table.string('ip_address', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('notifications', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.string('type', 50).notNullable();
      table.string('title', 255).notNullable();
      table.text('message');
      table.string('link', 500);
      table.boolean('read_status').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('activity_logs', table => {
      table.increments('id');
      table.integer('user_id').unsigned().references('id').in('users');
      table.string('action', 100).notNullable();
      table.string('target_type', 50);
      table.integer('target_id');
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('tags', table => {
      table.increments('id');
      table.string('name', 100).unique().notNullable();
      table.string('color', 20);
      table.string('icon', 50);
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('user_tags', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('tag_id').unsigned().notNullable().references('id').in('tags');
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'tag_id']);
    });

    await db.schema.createTable('reports', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('save_id').unsigned().notNullable().references('id').in('saves');
      table.text('reason').notNullable();
      table.string('status', 50).defaultTo('pending');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('warnings', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('admin_id').unsigned().notNullable().references('id').in('users');
      table.text('reason').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('username_changes', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.string('old_value', 255);
      table.string('new_value', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('bans', table => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable().references('id').in('users');
      table.integer('banned_by').unsigned().notNullable().references('id').in('users');
      table.text('reason').notNullable();
      table.string('ip_address', 100);
      table.string('country', 100);
      table.string('city', 100);
      table.string('region', 100);
      table.string('isp', 100);
      table.decimal('latitude', 10, 8);
      table.decimal('longitude', 11, 8);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await db.schema.createTable('save_images', table => {
      table.increments('id');
      table.integer('save_id').unsigned().notNullable().references('id').in('saves');
      table.string('image_path', 500).notNullable();
      table.boolean('is_cover').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    console.log('Database tables initialized');
  }
}

initializeTables();

// Wrapper to make knex compatible with SQLite-style API
const wrapper = {
  run: async (sql, params, callback) => {
    try {
      // Convert SQLite ? to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

      // Handle INSERT OR IGNORE -> ON CONFLICT DO NOTHING
      pgSql = pgSql.replace(/INSERT OR IGNORE/gi, 'INSERT');

      const result = await db.raw(pgSql, params);
      const lastId = result[0] ? result[0].insertId || result[0].id : null;
      const changes = result.rowCount || result.length;

      if (callback) {
        callback(null, { lastID: lastId, changes: changes });
      }
      return { lastID: lastId, changes: changes };
    } catch (err) {
      if (callback) {
        callback(err);
      }
      throw err;
    }
  },

  get: async (sql, params, callback) => {
    try {
      // Convert SQLite ? to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

      const result = await db.raw(pgSql, params);
      const row = result[0] ? result[0][0] : null;

      if (callback) {
        callback(null, row);
      }
      return row;
    } catch (err) {
      if (callback) {
        callback(err);
      }
      throw err;
    }
  },

  all: async (sql, params, callback) => {
    try {
      // Convert SQLite ? to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

      const result = await db.raw(pgSql, params);
      const rows = result[0] || [];

      if (callback) {
        callback(null, rows);
      }
      return rows;
    } catch (err) {
      if (callback) {
        callback(err);
      }
      throw err;
    }
  },

  query: async (sql, params, callback) => {
    return wrapper.all(sql, params, callback);
  }
};

module.exports = wrapper;
