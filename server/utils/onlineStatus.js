const db = require('../config/database');

// Check if running in production (PostgreSQL)
const isProduction = process.env.NODE_ENV === 'production';

// Update users who haven't been active in the last 5 minutes to offline
function updateOfflineUsers() {
  if (isProduction) {
    // PostgreSQL syntax
    db.run(
      `UPDATE users SET is_online = FALSE
       WHERE is_online = TRUE
       AND last_seen < NOW() - INTERVAL '5 minutes'`,
      function(err) {
        if (err) {
          console.error('Error updating offline users:', err);
        } else {
          if (this.changes > 0) {
            console.log(`Marked ${this.changes} user(s) as offline`);
          }
        }
      }
    );
  } else {
    // SQLite syntax
    db.all('PRAGMA table_info(users)', (err, columns) => {
      if (err) {
        console.error('Error checking table:', err);
        return;
      }

      const hasIsOnline = columns.some(col => col.name === 'is_online');
      const hasLastSeen = columns.some(col => col.name === 'last_seen');

      if (!hasIsOnline || !hasLastSeen) {
        console.log('Online status columns not yet created, skipping update');
        return;
      }

      db.run(
        `UPDATE users SET is_online = 0
         WHERE is_online = 1
         AND datetime(last_seen) < datetime('now', '-5 minutes')`,
        function(err) {
          if (err) {
            console.error('Error updating offline users:', err);
          } else {
            if (this.changes > 0) {
              console.log(`Marked ${this.changes} user(s) as offline`);
            }
          }
        }
      );
    });
  }
}

// Run every 30 seconds instead of every minute for faster updates
setInterval(updateOfflineUsers, 30000);

// Run once on startup
updateOfflineUsers();

console.log('Online status checker started (every 30 seconds)');
