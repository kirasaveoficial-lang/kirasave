const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function listUsers() {
  try {
    console.log('Fetching users from database...\n');

    const result = await pool.query(
      'SELECT id, username, email, is_admin, is_banned, created_at FROM users ORDER BY created_at DESC'
    );

    if (result.rows.length === 0) {
      console.log('❌ No users found in database');
      await pool.end();
      return;
    }

    console.log('📋 Users List:');
    console.log('═'.repeat(100));
    console.log('ID\t| Username\t| Email\t\t\t\t| Admin | Banned | Created At');
    console.log('─'.repeat(100));

    result.rows.forEach(user => {
      const id = user.id.toString().padEnd(4);
      const username = user.username.padEnd(15);
      const email = user.email.padEnd(30);
      const isAdmin = user.is_admin ? '✓' : '✗';
      const isBanned = user.is_banned ? '✓' : '✗';
      const createdAt = new Date(user.created_at).toLocaleString('pt-BR');

      console.log(`${id}\t| ${username}\t| ${email}\t|  ${isAdmin}   |  ${isBanned}   | ${createdAt}`);
    });

    console.log('═'.repeat(100));
    console.log(`\nTotal users: ${result.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    await pool.end();
    process.exit(1);
  }
}

listUsers();
