const db = require('../config/database');
const { uploadAvatar } = require('../middleware/upload');

const userController = {
  getUserProfile: (req, res) => {
    const { id } = req.params;

    db.get(
      'SELECT id, username, avatar, bio, birth_date, created_at, is_online, last_seen FROM users WHERE id = ?',
      [id],
      (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get user stats
        db.get(
          `SELECT
            (SELECT COUNT(*) FROM saves WHERE user_id = ?) as saves_count,
            (SELECT COUNT(*) FROM favorites WHERE user_id = ?) as favorites_count,
            (SELECT COUNT(*) FROM downloads WHERE user_id = ?) as downloads_count,
            (SELECT SUM(download_count) FROM saves WHERE user_id = ?) as total_downloads
          FROM users WHERE id = ?`,
          [id, id, id, id, id],
          (err, stats) => {
            if (err) stats = { saves_count: 0, favorites_count: 0, downloads_count: 0, total_downloads: 0 };

            // Get user's saves
            db.all(
              `SELECT s.*, g.name as game_name,
                (SELECT COUNT(*) FROM favorites WHERE save_id = s.id) as favorites_count
              FROM saves s
              JOIN games g ON s.game_id = g.id
              WHERE s.user_id = ? AND s.status = 'approved'
              ORDER BY s.created_at DESC
              LIMIT 20`,
              [id],
              (err, saves) => {
                if (err) saves = [];

                // Get user's tags
                db.all(
                  `SELECT t.*, ut.assigned_at, ut.assigned_by,
                    (SELECT username FROM users WHERE id = ut.assigned_by) as assigned_by_username
                  FROM tags t
                  JOIN user_tags ut ON t.id = ut.tag_id
                  WHERE ut.user_id = ?
                  ORDER BY ut.assigned_at DESC`,
                  [id],
                  (err, tags) => {
                    if (err) tags = [];

                    res.json({ ...user, ...stats, saves, tags });
                  }
                );
              }
            );
          }
        );
      }
    );
  },

  getUserSaves: (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT s.*, g.name as game_name, g.cover_image as game_cover,
        (SELECT COUNT(*) FROM favorites WHERE save_id = s.id) as favorites_count
      FROM saves s
      JOIN games g ON s.game_id = g.id
      WHERE s.user_id = ? AND s.status = 'approved'
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
      [id, limit, offset],
      (err, saves) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch saves' });
        }

        db.get(
          'SELECT COUNT(*) as total FROM saves WHERE user_id = ? AND status = 'approved'',
          [id],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to count saves' });
            }

            res.json({
              saves,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.total,
                pages: Math.ceil(result.total / limit)
              }
            });
          }
        );
      }
    );
  },

  getUserFavorites: (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT s.*, g.name as game_name, g.cover_image as game_cover,
        (SELECT COUNT(*) FROM favorites WHERE save_id = s.id) as favorites_count,
        f.created_at as favorited_at
      FROM favorites f
      JOIN saves s ON f.save_id = s.id
      JOIN games g ON s.game_id = g.id
      WHERE f.user_id = ? AND s.status = 'approved'
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
      [id, limit, offset],
      (err, saves) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch favorites' });
        }

        db.get(
          'SELECT COUNT(*) as total FROM favorites f JOIN saves s ON f.save_id = s.id WHERE f.user_id = ? AND s.status = 'approved'',
          [id],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to count favorites' });
            }

            res.json({
              saves,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.total,
                pages: Math.ceil(result.total / limit)
              }
            });
          }
        );
      }
    );
  },

  getUserDownloads: (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT s.*, g.name as game_name, g.cover_image as game_cover,
        d.created_at as downloaded_at
      FROM downloads d
      JOIN saves s ON d.save_id = s.id
      JOIN games g ON s.game_id = g.id
      WHERE d.user_id = ? AND s.status = 'approved'
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?`,
      [id, limit, offset],
      (err, saves) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch downloads' });
        }

        db.get(
          'SELECT COUNT(*) as total FROM downloads d JOIN saves s ON d.save_id = s.id WHERE d.user_id = ? AND s.status = 'approved'',
          [id],
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to count downloads' });
            }

            res.json({
              saves,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.total,
                pages: Math.ceil(result.total / limit)
              }
            });
          }
        );
      }
    );
  },

  updateAvatar: (req, res) => {
    uploadAvatar(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Avatar file is required' });
      }

      // Use relative path for frontend access
      const avatarPath = '/uploads/avatars/' + req.file.filename;

      db.run(
        'UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [avatarPath, req.user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update avatar' });
          }

          res.json({ message: 'Avatar updated successfully', avatar: avatarPath });
        }
      );
    });
  },

  getNotifications: (req, res) => {
    const { unread_only = false } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    db.all(query, params, (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      // Get unread count
      db.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [req.user.id],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to count notifications' });
          }

          res.json({
            notifications,
            unread_count: result.count
          });
        }
      );
    });
  },

  markNotificationRead: (req, res) => {
    const { id } = req.params;

    db.run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to mark notification as read' });
        }

        res.json({ message: 'Notification marked as read' });
      }
    );
  },

  markAllNotificationsRead: (req, res) => {
    db.run(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }

        res.json({ message: 'All notifications marked as read' });
      }
    );
  },

  getSearchHistory: (req, res) => {
    db.all(
      'SELECT DISTINCT query, MAX(created_at) as last_searched FROM search_history WHERE user_id = ? GROUP BY query ORDER BY last_searched DESC LIMIT 20',
      [req.user.id],
      (err, history) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch search history' });
        }

        res.json(history);
      }
    );
  },

  clearSearchHistory: (req, res) => {
    db.run(
      'DELETE FROM search_history WHERE user_id = ?',
      [req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to clear search history' });
        }

        res.json({ message: 'Search history cleared' });
      }
    );
  }
};

module.exports = userController;
