const db = require('./server/config/database');

console.log('Checking database...\n');

// Check users
db.all('SELECT id, username, email, is_admin FROM users', (err, users) => {
  if (err) {
    console.error('Error fetching users:', err);
  } else {
    console.log('=== USERS ===');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Admin: ${user.is_admin}`);
    });
  }

  // Check saves
  db.all('SELECT id, title, status, user_id, game_id, platform FROM saves ORDER BY created_at DESC', (err, saves) => {
    if (err) {
      console.error('Error fetching saves:', err);
    } else {
      console.log('\n=== SAVES ===');
      if (saves.length === 0) {
        console.log('No saves found in database');
      } else {
        saves.forEach(save => {
          console.log(`ID: ${save.id}, Title: ${save.title}, Status: ${save.status}, User ID: ${save.user_id}, Game ID: ${save.game_id}, Platform: ${save.platform}`);
        });
      }
    }

    // Check games
    db.all('SELECT id, name FROM games', (err, games) => {
      if (err) {
        console.error('Error fetching games:', err);
      } else {
        console.log('\n=== GAMES ===');
        games.forEach(game => {
          console.log(`ID: ${game.id}, Name: ${game.name}`);
        });
      }

      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  });
});
