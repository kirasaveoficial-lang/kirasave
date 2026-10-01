const db = require('../config/database');
const path = require('path');

const adminController = {
  getDashboardStats: (req, res) => {
    db.get(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM saves) as total_saves,
        (SELECT COUNT(*) FROM saves WHERE status = 'pending') as pending_saves,
        (SELECT COUNT(*) FROM downloads) as total_downloads,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports
    `, (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }

      // Get recent activity (comments, reports, pending saves, username changes)
      db.all(`
        SELECT 'comment' as type, c.id, c.content as title, c.save_id, c.created_at, u.username, s.title as save_title
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN saves s ON c.save_id = s.id
        ORDER BY c.created_at DESC
        LIMIT 5

        UNION ALL

        SELECT 'report' as type, r.id, r.reason, r.save_id, r.created_at, u.username, s.title as save_title
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        JOIN saves s ON r.save_id = s.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
        LIMIT 5

        UNION ALL

        SELECT 'save' as type, s.id, s.title, s.id as save_id, s.created_at, u.username, s.title as save_title
        FROM saves s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'pending'
        ORDER BY s.created_at DESC
        LIMIT 5

        UNION ALL

        SELECT 'username_change' as type, al.id, al.description as title, al.user_id as save_id, al.created_at, u.username, al.new_value as save_title
        FROM activity_log al
        JOIN users u ON al.user_id = u.id
        WHERE al.action_type = 'username_change'
        ORDER BY al.created_at DESC
        LIMIT 5
      `, (err, activity) => {
        if (err) activity = [];

        // Sort by created_at desc and limit to 10
        activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        activity = activity.slice(0, 10);

        res.json({ stats, activity });
      });
    });
  },

  getPendingSaves: (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT s.*, u.username, u.email, g.name as game_name, g.platform as game_platform
      FROM saves s
      JOIN users u ON s.user_id = u.id
      JOIN games g ON s.game_id = g.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, saves) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch pending saves' });
        }

        // Get images for each save
        let savesWithImages = [];
        let processedCount = 0;

        if (saves.length === 0) {
          return res.json({
            saves: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0
            }
          });
        }

        saves.forEach(save => {
          db.all(
            'SELECT * FROM save_images WHERE save_id = ?',
            [save.id],
            (err, images) => {
              if (err) images = [];
              // Add full URL path to images
              images = images.map(img => ({
                ...img,
                image_path: `/uploads/images/${img.image_path}`
              }));
              savesWithImages.push({ ...save, images });
              processedCount++;

              if (processedCount === saves.length) {
                res.json({
                  saves: savesWithImages,
                  pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: saves.length,
                    pages: Math.ceil(saves.length / limit)
                  }
                });
              }
            }
          );
        });
      }
    );
  },

  downloadPendingSave: (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM saves WHERE id = ?', [id], (err, save) => {
      if (err || !save) {
        return res.status(404).json({ error: 'Save not found' });
      }

      // Admin can download any save regardless of status
      // Use full path for download
      const filePath = path.join(__dirname, '../../public/uploads/saves/', save.file_path);
      res.download(filePath);
    });
  },

  approveSave: (req, res) => {
    const { id } = req.params;

    db.run(
      'UPDATE saves SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to approve save' });
        }

        // Notify user
        db.get('SELECT user_id, title FROM saves WHERE id = ?', [id], (err, save) => {
          if (save) {
            db.run(
              'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
              [save.user_id, 'save_approved', 'Save Aprovado!', `Seu save "${save.title}" foi aprovado e agora está disponível no site!`, `/saves/${id}`]
            );
          }
        });

        res.json({ message: 'Save approved successfully' });
      }
    );
  },

  rejectSave: (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    db.run(
      'UPDATE saves SET status = "rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to reject save' });
        }

        // Notify user
        db.get('SELECT user_id, title FROM saves WHERE id = ?', [id], (err, save) => {
          if (save) {
            db.run(
              'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
              [save.user_id, 'save_rejected', 'Save Rejected', `Your save "${save.title}" was rejected. ${reason || ''}`, '/profile']
            );
          }
        });

        res.json({ message: 'Save rejected successfully' });
      }
    );
  },

  deleteSave: (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM saves WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete save' });
      }

      res.json({ message: 'Save deleted successfully' });
    });
  },

  getReports: (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    db.all(
      `SELECT r.*, s.title as save_title, u.username as reporter_username
      FROM reports r
      JOIN saves s ON r.save_id = s.id
      JOIN users u ON r.reporter_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err, reports) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        const countQuery = `SELECT COUNT(*) as total FROM reports r ${whereClause}`;
        db.get(countQuery, params, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to count reports' });
          }

          res.json({
            reports,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: result.total,
              pages: Math.ceil(result.total / limit)
            }
          });
        });
      }
    );
  },

  resolveReport: (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'dismiss' or 'delete_save'

    db.run(
      'UPDATE reports SET status = "resolved" WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to resolve report' });
        }

        if (action === 'delete_save') {
          db.get('SELECT save_id FROM reports WHERE id = ?', [id], (err, report) => {
            if (report) {
              db.run('DELETE FROM saves WHERE id = ?', [report.save_id]);
            }
          });
        }

        res.json({ message: 'Report resolved successfully' });
      }
    );
  },

  getUsers: (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    db.all(
      `SELECT id, username, email, avatar, bio, created_at, is_admin, is_banned,
        (SELECT COUNT(*) FROM saves WHERE user_id = users.id) as saves_count
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err, users) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch users' });
        }

        const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        db.get(countQuery, params, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to count users' });
          }

          res.json({
            users,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: result.total,
              pages: Math.ceil(result.total / limit)
            }
          });
        });
      }
    );
  },

  banUser: (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Get user info before banning
    db.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Try to get geolocation info from IP
      let geoInfo = {
        ip_address: clientIp,
        country: null,
        city: null,
        region: null,
        isp: null,
        latitude: null,
        longitude: null
      };

      try {
        // Use free IP geolocation API
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === 'success') {
            geoInfo = {
              ip_address: clientIp,
              country: geoData.country || null,
              city: geoData.city || null,
              region: geoData.regionName || null,
              isp: geoData.isp || null,
              latitude: geoData.lat || null,
              longitude: geoData.lon || null
            };
          }
        }
      } catch (geoError) {
        console.log('Failed to get geolocation:', geoError.message);
      }

      // Update user as banned
      db.run(
        'UPDATE users SET is_banned = 1 WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to ban user' });
          }

          // Store ban details in bans table
          db.run(
            `INSERT INTO bans (user_id, banned_by, reason, ip_address, country, city, region, isp, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.user.id, reason, geoInfo.ip_address, geoInfo.country, geoInfo.city, geoInfo.region, geoInfo.isp, geoInfo.latitude, geoInfo.longitude],
            function(err) {
              if (err) {
                console.error('Failed to store ban details:', err);
              }
            }
          );

          // Notify user
          db.run(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
            [id, 'banned', '⛔ Você foi banido', `Motivo: ${reason}`, '/profile']
          );

          res.json({ message: 'User banned successfully' });
        }
      );
    });
  },

  unbanUser: (req, res) => {
    const { id } = req.params;

    db.run(
      'UPDATE users SET is_banned = 0 WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to unban user' });
        }

        res.json({ message: 'User unbanned successfully' });
      }
    );
  },

  getActivityLogs: (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // This is a simplified version - in production you'd have a proper activity logs table
    db.all(`
      SELECT 'download' as action, d.created_at, u.username, s.title as target
      FROM downloads d
      JOIN users u ON d.user_id = u.id
      JOIN saves s ON d.save_id = s.id
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, logs) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch activity logs' });
      }

      res.json({ logs });
    });
  },

  // Games Management
  getGames: (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    db.all(
      `SELECT g.*, (SELECT COUNT(*) FROM saves WHERE game_id = g.id) as saves_count
       FROM games g ${whereClause} ORDER BY name LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err, games) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch games' });
        }

        const countQuery = `SELECT COUNT(*) as total FROM games ${whereClause}`;
        db.get(countQuery, params, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to count games' });
          }

          res.json({
            games,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: result.total,
              pages: Math.ceil(result.total / limit)
            }
          });
        });
      }
    );
  },

  createGame: (req, res) => {
    const { name, description, platform, cover_image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    db.run(
      'INSERT INTO games (name, description, platform, cover_image) VALUES (?, ?, ?, ?)',
      [name, description, platform, cover_image],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Game already exists' });
          }
          return res.status(500).json({ error: 'Failed to create game' });
        }

        res.status(201).json({ message: 'Game created successfully', id: this.lastID });
      }
    );
  },

  updateGame: (req, res) => {
    const { id } = req.params;
    const { name, description, platform, cover_image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    db.run(
      'UPDATE games SET name = ?, description = ?, platform = ?, cover_image = ? WHERE id = ?',
      [name, description, platform, cover_image, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update game' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Game not found' });
        }

        res.json({ message: 'Game updated successfully' });
      }
    );
  },

  deleteGame: (req, res) => {
    const { id } = req.params;

    // Check if game has saves
    db.get('SELECT COUNT(*) as count FROM saves WHERE game_id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check game' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: 'Cannot delete game with existing saves' });
      }

      db.run('DELETE FROM games WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete game' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Game not found' });
        }

        res.json({ message: 'Game deleted successfully' });
      });
    });
  },

  // All Saves Management
  getAllSaves: (req, res) => {
    const { page = 1, limit = 20, search, status, game } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (s.title LIKE ? OR u.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    if (game) {
      whereClause += ' AND s.game_id = ?';
      params.push(game);
    }

    db.all(
      `SELECT s.*, u.username, u.email, u.id as user_id, g.name as game_name, g.platform as game_platform,
        (SELECT COUNT(*) FROM downloads WHERE save_id = s.id) as download_count,
        (SELECT COUNT(*) FROM comments WHERE save_id = s.id) as comments_count
      FROM saves s
      JOIN users u ON s.user_id = u.id
      JOIN games g ON s.game_id = g.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err, saves) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch saves' });
        }

        const countQuery = `SELECT COUNT(*) as total FROM saves s JOIN users u ON s.user_id = u.id JOIN games g ON s.game_id = g.id ${whereClause}`;
        db.get(countQuery, params, (err, result) => {
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
        });
      }
    );
  },

  // Warning System
  giveWarning: (req, res) => {
    const { user_id, save_id, reason, warning_type } = req.body;

    if (!user_id || !reason) {
      return res.status(400).json({ error: 'User ID and reason are required' });
    }

    db.run(
      'INSERT INTO warnings (user_id, save_id, reason, warning_type, created_by) VALUES (?, ?, ?, ?, ?)',
      [user_id, save_id, reason, warning_type || 'general', req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create warning' });
        }

        // Notify user
        db.get('SELECT username FROM users WHERE id = ?', [user_id], (err, user) => {
          if (user) {
            const warningTitle = warning_type === 'severe' ? '⚠️ Advertência Grave' : '⚠️ Advertência';
            db.run(
              'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
              [user_id, 'warning', warningTitle, `Você recebeu uma advertência: ${reason}`, save_id ? `/saves/${save_id}` : '/profile']
            );
          }
        });

        res.status(201).json({ message: 'Warning given successfully', warning_id: this.lastID });
      }
    );
  },

  getUserWarnings: (req, res) => {
    const { user_id } = req.params;

    db.all(
      `SELECT w.*, u.username as created_by_username, s.title as save_title
      FROM warnings w
      JOIN users u ON w.created_by = u.id
      LEFT JOIN saves s ON w.save_id = s.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC`,
      [user_id],
      (err, warnings) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch warnings' });
        }

        res.json({ warnings });
      }
    );
  },

  getAllWarnings: (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT w.*, u.username as user_username, u.email as user_email, admin.username as created_by_username, s.title as save_title
      FROM warnings w
      JOIN users u ON w.user_id = u.id
      JOIN users admin ON w.created_by = admin.id
      LEFT JOIN saves s ON w.save_id = s.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, warnings) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch warnings' });
        }

        const countQuery = 'SELECT COUNT(*) as total FROM warnings';
        db.get(countQuery, [], (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to count warnings' });
          }

          res.json({
            warnings,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: result.total,
              pages: Math.ceil(result.total / limit)
            }
          });
        });
      }
    );
  },

  deleteWarning: (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM warnings WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete warning' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Warning not found' });
      }

      res.json({ message: 'Warning deleted successfully' });
    });
  },

  // Banned Users Management
  getUserBanDetails: (req, res) => {
    const { id } = req.params;

    db.all(
      `SELECT b.*, u.username as banned_username, u.email as banned_email,
        admin.username as banned_by_username
      FROM bans b
      JOIN users u ON b.user_id = u.id
      JOIN users admin ON b.banned_by = admin.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC`,
      [id],
      (err, bans) => {
        if (err) {
          console.error('Error fetching ban details:', err);
          return res.status(500).json({ error: 'Failed to fetch ban details' });
        }

        res.json({ bans });
      }
    );
  },

  getBannedUsers: (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.is_banned = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    db.all(
      `SELECT u.id, u.username, u.email, u.avatar, u.bio, u.created_at, u.is_admin, u.is_banned,
        (SELECT COUNT(*) FROM saves WHERE user_id = u.id) as saves_count,
        b.id as ban_id, b.reason as ban_reason, b.ip_address, b.country, b.city,
        b.region, b.isp, b.latitude, b.longitude, b.created_at as banned_at,
        admin.username as banned_by_username
      FROM users u
      LEFT JOIN bans b ON u.id = b.user_id
      LEFT JOIN users admin ON b.banned_by = admin.id
      ${whereClause}
      ORDER BY COALESCE(b.created_at, u.created_at) DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err, users) => {
        if (err) {
          console.error('Error fetching banned users:', err);
          return res.status(500).json({ error: 'Failed to fetch banned users' });
        }

        // Count total banned users
        db.get(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params, (err, result) => {
          if (err) {
            console.error('Error counting banned users:', err);
            return res.status(500).json({ error: 'Failed to count banned users' });
          }

          res.json({
            users,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: result.total,
              pages: Math.ceil(result.total / limit)
            }
          });
        });
      }
    );
  },

  unbanUser: (req, res) => {
    const { id } = req.params;

    db.run(
      'UPDATE users SET is_banned = 0 WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to unban user' });
        }

        // Notify user
        db.get('SELECT username FROM users WHERE id = ?', [id], (err, user) => {
          if (user) {
            db.run(
              'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
              [id, 'unban', 'Conta Desbanida', 'Sua conta foi desbanida. Você pode voltar a usar o site normalmente.', '/']
            );
          }
        });

        res.json({ message: 'User unbanned successfully' });
      }
    );
  },

  assignUserTag: (req, res) => {
    const { id } = req.params;
    const { tagId } = req.body;

    // Check if tag exists
    db.get('SELECT * FROM tags WHERE id = ?', [tagId], (err, tag) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch tag' });
      }
      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Assign tag to user
      db.run(
        'INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)',
        [id, tagId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to assign tag' });
          }

          res.json({ message: 'Tag assigned successfully' });
        }
      );
    });
  },

  removeUserTag: (req, res) => {
    const { id, tagId } = req.params;

    db.run(
      'DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?',
      [id, tagId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to remove tag' });
        }

        res.json({ message: 'Tag removed successfully' });
      }
    );
  }
};

module.exports = adminController;
