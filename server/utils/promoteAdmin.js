const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function promoteToAdmin(username) {
  try {
    console.log(`Promoting user "${username}" to admin...`);

    const result = await pool.query(
      'UPDATE users SET is_admin = TRUE WHERE username = $1 RETURNING id, username, email, is_admin',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User "${username}" not found`);
      return;
    }

    const user = result.rows[0];
    console.log(`✅ User "${username}" promoted to admin successfully!`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Is Admin: ${user.is_admin}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    await pool.end();
    process.exit(1);
  }
}

// Get username from command line argument
const username = process.argv[2];

if (!username) {
  console.log('Usage: node server/utils/promoteAdmin.js <username>');
  console.log('Example: node server/utils/promoteAdmin.js myusername');
  process.exit(1);
}

promoteToAdmin(username);
