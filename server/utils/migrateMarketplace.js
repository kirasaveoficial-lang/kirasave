const { Pool } = require('pg');
const path = require('path');

async function migrateMarketplace() {
  const migrationPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Starting Marketplace database migrations...');

    // Create products table
    try {
      await migrationPool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          subcategory VARCHAR(100),
          price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          image_url VARCHAR(500),
          file_url VARCHAR(500),
          file_name VARCHAR(255),
          file_size INTEGER,
          tags TEXT[],
          status VARCHAR(50) DEFAULT 'pending',
          downloads_count INTEGER DEFAULT 0,
          views_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Products table created/verified');
    } catch (err) {
      console.log('❌ Products table error:', err.message);
    }

    // Create orders table
    try {
      await migrationPool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          total_amount DECIMAL(10, 2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          payment_method VARCHAR(50),
          payment_status VARCHAR(50) DEFAULT 'pending',
          transaction_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Orders table created/verified');
    } catch (err) {
      console.log('❌ Orders table error:', err.message);
    }

    // Create order_items table
    try {
      await migrationPool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          price DECIMAL(10, 2) NOT NULL,
          quantity INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Order items table created/verified');
    } catch (err) {
      console.log('❌ Order items table error:', err.message);
    }

    // Create cart table
    try {
      await migrationPool.query(`
        CREATE TABLE IF NOT EXISTS cart (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, product_id)
        )
      `);
      console.log('✅ Cart table created/verified');
    } catch (err) {
      console.log('❌ Cart table error:', err.message);
    }

    // Create indexes for performance
    try {
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id)`);
      await migrationPool.query(`CREATE INDEX IF NOT EXISTS idx_cart_product ON cart(product_id)`);
      console.log('✅ Indexes created/verified');
    } catch (err) {
      console.log('❌ Indexes error:', err.message);
    }

    console.log('✨ Marketplace migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await migrationPool.end();
  }
}

migrateMarketplace();
