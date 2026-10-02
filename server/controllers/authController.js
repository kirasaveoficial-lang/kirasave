const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

const authController = {
  register: (req, res) => {
    const { username, email, password } = req.body;

    console.log('Registration attempt:', { username, email });

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Generate dynamic avatar based on username using UI Avatars
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=8b5cf6&color=fff&size=200&bold=true`;

    db.run(
      'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, defaultAvatar],
      function(err) {
        if (err) {
          console.error('Registration error:', err);
          // Handle both SQLite and PostgreSQL unique constraint errors
          if (err.message.includes('UNIQUE constraint failed') ||
              err.message.includes('duplicate key value violates unique constraint') ||
              err.code === '23505') {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Registration failed: ' + err.message });
        }

        const userId = this.lastID;
        console.log('User registered successfully:', { userId, username });

        // Check if this is the first user - make them admin
        db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
          if (!err && result.count === 1) {
            db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [userId], (err) => {
              if (err) console.error('Error setting first user as admin:', err);
              else console.log('First user set as admin');
            });
          }
        });

        // Ensure "Membro" tag exists and assign it to new user
        db.run(
          `INSERT INTO tags (name, color, icon, description) VALUES (?, ?, ?, ?) ON CONFLICT (name) DO NOTHING`,
          ['Membro', '#10b981', 'user', 'Membro da comunidade'],
          function(err) {
            if (err) {
              console.error('Error creating Membro tag:', err);
            }

            // Get the Membro tag ID
            db.get('SELECT id FROM tags WHERE name = ?', ['Membro'], (err, tag) => {
              if (tag) {
                // Assign tag to user
                db.run(
                  'INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)',
                  [userId, tag.id],
                  (err) => {
                    if (err) console.error('Error assigning Membro tag:', err);
                  }
                );
              }
            });
          }
        );

        const user = { id: userId, username, email, avatar: defaultAvatar };
        const token = generateToken(user);

        res.status(201).json({
          message: 'Registration successful',
          token,
          user: { id: user.id, username: user.username, email: user.email, avatar: defaultAvatar }
        });
      }
    );
  },

  login: (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Login failed' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.is_banned) {
          return res.status(403).json({ error: 'Account is banned' });
        }

        const isValidPassword = bcrypt.compareSync(password, user.password);

        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Mark user as online
        db.run(
          'UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?',
          [user.id],
          (err) => {
            if (err) console.error('Error updating online status:', err);
          }
        );

        const token = generateToken(user);

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            is_admin: user.is_admin
          }
        });
      }
    );
  },

  getProfile: (req, res) => {
    db.get(
      'SELECT id, username, email, avatar, bio, birth_date, created_at, is_admin, is_online, last_seen, username_changed_at FROM users WHERE id = ?',
      [req.user.id],
      (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Calculate days until username can be changed
        // Only enforce 7-day restriction AFTER first username change
        let canChangeUsername = true;
        let daysUntilChange = 0;
        let lastChangeDate = user.username_changed_at || user.created_at;

        if (user.username_changed_at) {
          // User has changed username before - enforce 7-day restriction
          const lastChange = new Date(user.username_changed_at);
          const now = new Date();
          const daysSinceChange = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
          daysUntilChange = Math.max(0, 7 - daysSinceChange);
          canChangeUsername = daysSinceChange >= 7;
        }
        // If username_changed_at is NULL, user can change freely (first time)

        // Get user stats
        db.get(
          `SELECT
            (SELECT COUNT(*) FROM saves WHERE user_id = ? AND status = 'approved') as saves_count,
            (SELECT COUNT(*) FROM favorites f JOIN saves s ON f.save_id = s.id WHERE s.user_id = ? AND s.status = 'approved') as favorites_count`,
          [req.user.id, req.user.id],
          (err, stats) => {
            if (err) stats = { saves_count: 0, favorites_count: 0 };

            // Get user's tags
            const tagsQuery = `SELECT t.*, ut.assigned_at, ut.assigned_by,
                (SELECT username FROM users WHERE id = ut.assigned_by) as assigned_by_username
              FROM tags t
              JOIN user_tags ut ON t.id = ut.tag_id
              WHERE ut.user_id = ?
              ORDER BY ut.assigned_at DESC`;
            
            console.log('Fetching tags for user:', req.user.id);
            console.log('Tags query:', tagsQuery);

            db.all(
              tagsQuery,
              [req.user.id],
              (err, tags) => {
                if (err) {
                  console.error('Failed to fetch user tags in getProfile:', err);
                  tags = [];
                }

                console.log('User tags returned:', tags);
                console.log('Number of tags:', tags.length);

                res.json({
                  ...user,
                  saves_count: stats.saves_count,
                  favorites_count: stats.favorites_count,
                  tags,
                  usernameChangeInfo: {
                    canChangeUsername,
                    daysUntilChange,
                    lastChangeDate: lastChangeDate
                  }
                });
              }
            );
          }
        );
      }
    );
  },

  updateProfile: (req, res) => {
    const { bio, username, birth_date } = req.body;

    // Check if username is being changed
    if (username && username !== req.user.username) {
      // Get current user to check username_changed_at
      db.get('SELECT username_changed_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Only enforce 7-day restriction if user has changed username before
        if (user.username_changed_at) {
          const lastChange = new Date(user.username_changed_at);
          const now = new Date();
          const daysSinceChange = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));

          if (daysSinceChange < 7) {
            const daysRemaining = 7 - daysSinceChange;
            return res.status(400).json({
              error: `Você só pode alterar seu nome de usuário após 7 dias. Tempo restante: ${daysRemaining} dia(s)`
            });
          }
        }

        // Username can be changed - proceed with update
        performUpdate();
      });
    } else {
      // Only bio or birth_date being changed - proceed immediately
      performUpdate();
    }

    function performUpdate() {
      db.run(
        'UPDATE users SET bio = ?, username = ?, birth_date = ?, updated_at = NOW(), username_changed_at = NOW() WHERE id = ?',
        [bio || '', username || req.user.username, birth_date || null, req.user.id],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Update failed' });
          }

          // Log username change if it was changed
          if (username && username !== req.user.username) {
            console.log('Logging username change:', { userId: req.user.id, oldUsername: req.user.username, newUsername: username });
            db.run(
              'INSERT INTO activity_log (user_id, action_type, description, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
              [req.user.id, 'username_change', 'Username changed', req.user.username, username],
              function(logErr) {
                if (logErr) {
                  console.error('Error logging username change:', logErr);
                } else {
                  console.log('Username change logged successfully with ID:', this.lastID);
                }
              }
            );
          }

          res.json({ message: 'Profile updated successfully' });
        }
      );
    }
  },

  changePassword: (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current password
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = bcrypt.compareSync(current_password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      const hashedPassword = bcrypt.hashSync(new_password, 10);

      db.run(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, req.user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update password' });
          }

          res.json({ message: 'Password updated successfully' });
        }
      );
    });
  },

  changeEmail: (req, res) => {
    const { new_email, password } = req.body;

    if (!new_email || !password) {
      return res.status(400).json({ error: 'New email and password are required' });
    }

    // Verify password
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = bcrypt.compareSync(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Password is incorrect' });
      }

      // Update email
      db.run(
        'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
        [new_email, req.user.id],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: 'Failed to update email' });
          }

          res.json({ message: 'Email updated successfully' });
        }
      );
    });
  },

  logout: (req, res) => {
    // Mark user as offline
    db.run(
      'UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ?',
      [req.user.id],
      (err) => {
        if (err) {
          console.error('Error updating logout status:', err);
        }
        res.json({ message: 'Logout successful' });
      }
    );
  },

  getUserProfile: (req, res) => {
    const userId = req.params.id;
    db.get(
      'SELECT id, username, avatar, bio, created_at, is_admin, is_online, last_seen FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get user tags
        console.log('Fetching tags for user profile:', userId);
        db.all(
          'SELECT t.* FROM tags t JOIN user_tags ut ON t.id = ut.tag_id WHERE ut.user_id = ?',
          [userId],
          (err, tags) => {
            if (err) {
              console.error('Failed to fetch user tags in getUserProfile:', err);
              tags = [];
            }
            console.log('User profile tags returned:', tags);

            // Get user stats
            db.get(
              'SELECT COUNT(*) as saves_count FROM saves WHERE user_id = ? AND status = "approved"',
              [userId],
              (err, stats) => {
                const savesCount = stats ? stats.saves_count : 0;

                // Get real favorites count
                db.get(
                  'SELECT COUNT(*) as favorites_count FROM favorites f JOIN saves s ON f.save_id = s.id WHERE s.user_id = ? AND s.status = "approved"',
                  [userId],
                  (err, favStats) => {
                    const favoritesCount = favStats ? favStats.favorites_count : 0;

                    res.json({
                      ...user,
                      user_tags: tags,
                      saves_count: savesCount,
                      favorites_count: favoritesCount,
                      downloads_count: 0
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  },

  heartbeat: (req, res) => {
    // Update last_seen timestamp to keep user online
    const userId = req.user ? req.user.id : null;
    console.log('Heartbeat request from user:', userId);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    db.run(
      'UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?',
      [userId],
      (err) => {
        if (err) {
          console.error('Error updating heartbeat:', err);
          return res.status(500).json({ error: 'Failed to update heartbeat', details: err.message });
        }
        res.json({ message: 'Heartbeat updated' });
      }
    );
  }
};

module.exports = authController;
