const db = require('./server/config/database');

console.log('Adding Membro tag to existing users...\n');

// Create Membro tag if it doesn't exist
db.run(
  `INSERT OR IGNORE INTO tags (name, color, icon, description) VALUES (?, ?, ?, ?)`,
  ['Membro', '#10b981', 'user', 'Membro da comunidade'],
  function(err) {
    if (err) {
      console.error('Error creating Membro tag:', err);
      process.exit(1);
    }

    console.log('Membro tag created/verified');

    // Get the Membro tag ID
    db.get('SELECT id FROM tags WHERE name = ?', ['Membro'], (err, tag) => {
      if (err || !tag) {
        console.error('Error getting Membro tag:', err);
        process.exit(1);
      }

      console.log('Membro tag ID:', tag.id);

      // Assign Membro tag to all users who don't have it
      db.all('SELECT id FROM users', (err, users) => {
        if (err) {
          console.error('Error getting users:', err);
          process.exit(1);
        }

        console.log(`Found ${users.length} users`);

        let assignedCount = 0;
        users.forEach(user => {
          db.run(
            'INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)',
            [user.id, tag.id],
            (err) => {
              if (err) {
                console.error(`Error assigning tag to user ${user.id}:`, err);
              } else {
                assignedCount++;
                console.log(`Membro tag assigned to user ${user.id}`);
              }

              if (assignedCount === users.length) {
                console.log('\nMembro tag assigned to all users successfully!');
                process.exit(0);
              }
            }
          );
        });
      });
    });
  }
);
