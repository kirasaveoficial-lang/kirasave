const db = require('../config/database');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`
    INSERT OR IGNORE INTO users (username, email, password, is_admin)
    VALUES ('admin', 'admin@kirasave.com', ?, 1)
  `, [adminPassword], function(err) {
    if (err) console.error('Error creating admin user:', err);
    else console.log('Admin user created/updated');
  });

  // Create test user
  const userPassword = bcrypt.hashSync('user123', 10);
  db.run(`
    INSERT OR IGNORE INTO users (username, email, password, bio)
    VALUES ('gamer', 'gamer@kirasave.com', ?, 'Gamer enthusiast and save collector')
  `, [userPassword], function(err) {
    if (err) console.error('Error creating test user:', err);
    else console.log('Test user created/updated');
  });

  // Create popular games
  const games = [
    { name: 'The Witcher 3', platform: 'PC', description: 'Open world RPG' },
    { name: 'Elden Ring', platform: 'PC', description: 'Action RPG' },
    { name: 'Cyberpunk 2077', platform: 'PC', description: 'Open world action' },
    { name: 'GTA V', platform: 'PC', description: 'Open world action-adventure' },
    { name: 'Red Dead Redemption 2', platform: 'PC', description: 'Western action-adventure' },
    { name: 'God of War', platform: 'PlayStation', description: 'Action-adventure' },
    { name: 'Halo Infinite', platform: 'Xbox', description: 'First-person shooter' },
    { name: 'Zelda: BOTW', platform: 'Nintendo', description: 'Action-adventure' }
  ];

  games.forEach(game => {
    db.run(`
      INSERT OR IGNORE INTO games (name, platform, description)
      VALUES (?, ?, ?)
    `, [game.name, game.platform, game.description], (err) => {
      if (err) console.error(`Error creating game ${game.name}:`, err);
    });
  });

  // Create some test saves after games are created
  setTimeout(() => {
    db.get('SELECT id FROM users WHERE username = ?', ['gamer'], (err, user) => {
      if (err || !user) {
        console.log('Test user not found, skipping save creation');
        return;
      }

      db.get('SELECT id FROM games WHERE name = ?', ['GTA V'], (err, game) => {
        if (err || !game) {
          console.log('GTA V game not found, skipping save creation');
          return;
        }

        const testSaves = [
          {
            title: 'Save 100% Completo',
            description: 'Save com 100% de conclusão do jogo',
            game_id: game.id,
            platform: 'PC',
            file_path: 'test-save.zip'
          },
          {
            title: 'Save Início do Jogo',
            description: 'Save logo no início para recomeçar',
            game_id: game.id,
            platform: 'PC',
            file_path: 'test-save2.zip'
          }
        ];

        testSaves.forEach(save => {
          db.run(`
            INSERT OR IGNORE INTO saves (title, description, file_path, user_id, game_id, platform, status)
            VALUES (?, ?, ?, ?, ?, ?, 'approved')
          `, [save.title, save.description, save.file_path, user.id, save.game_id, save.platform], (err) => {
            if (err) console.error(`Error creating save ${save.title}:`, err);
            else console.log(`Test save created: ${save.title}`);
          });
        });
      });
    });
  }, 500);

  setTimeout(() => {
    console.log('Database seeded successfully!');
    console.log('Admin login: admin@kirasave.com / admin123');
    console.log('Test user login: gamer@kirasave.com / user123');
    process.exit(0);
  }, 1500);
}

seedDatabase();
