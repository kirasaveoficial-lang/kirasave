const db = require('./server/config/database');
const bcrypt = require('bcryptjs');

console.log('Creating administrator account...\n');

const adminUsername = 'admin';
const adminEmail = 'admin@kirasave.com';
const adminPassword = 'admin123'; // Você pode alterar esta senha

// Hash da senha
const hashedPassword = bcrypt.hashSync(adminPassword, 10);

// Verificar se já existe um admin
db.get('SELECT * FROM users WHERE username = ? OR email = ?', [adminUsername, adminEmail], (err, existingUser) => {
  if (err) {
    console.error('Error checking existing user:', err);
    process.exit(1);
  }

  if (existingUser) {
    console.log('Administrador já existe!');
    console.log('Username:', existingUser.username);
    console.log('Email:', existingUser.email);
    console.log('É admin:', existingUser.is_admin === true || existingUser.is_admin === 1 ? 'Sim' : 'Não');

    // Se não for admin, atualizar
    if (existingUser.is_admin !== true && existingUser.is_admin !== 1) {
      db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [existingUser.id], (err) => {
        if (err) {
          console.error('Error updating user to admin:', err);
          process.exit(1);
        }
        console.log('Usuário atualizado para administrador!');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } else {
    // Criar novo admin
    db.run(
      `INSERT INTO users (username, email, password, is_admin, is_online) VALUES (?, ?, ?, TRUE, FALSE)`,
      [adminUsername, adminEmail, hashedPassword],
      function(err) {
        if (err) {
          console.error('Error creating admin:', err);
          process.exit(1);
        }

        const adminId = this.lastID;
        console.log('Administrador criado com sucesso!');
        console.log('ID:', adminId);
        console.log('Username:', adminUsername);
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

        // Criar tag de Administrador
        db.run(
          `INSERT INTO tags (name, color, icon, description) VALUES (?, ?, ?, ?) ON CONFLICT (name) DO NOTHING`,
          ['Administrador', '#ef4444', 'shield-alt', 'Administrador do sistema'],
          function(err) {
            if (err) {
              console.error('Error creating Administrador tag:', err);
            } else {
              console.log('Tag Administrador criada/verificada');

              // Atribuir tag ao admin
              db.get('SELECT id FROM tags WHERE name = ?', ['Administrador'], (err, tag) => {
                if (tag) {
                  db.run(
                    'INSERT INTO user_tags (user_id, tag_id, assigned_by) VALUES (?, ?, ?) ON CONFLICT (user_id, tag_id) DO NOTHING',
                    [adminId, tag.id, adminId],
                    (err) => {
                      if (err) {
                        console.error('Error assigning tag:', err);
                      } else {
                        console.log('Tag Administrador atribuída ao usuário');
                      }
                      process.exit(0);
                    }
                  );
                } else {
                  process.exit(0);
                }
              });
            }
          }
        );
      }
    );
  }
});
