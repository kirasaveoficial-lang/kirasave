const db = require('../config/database');

const tagsController = {
  // Get all tags
  getAllTags: (req, res) => {
    db.all('SELECT * FROM tags ORDER BY name', (err, tags) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch tags' });
      }
      res.json(tags);
    });
  },

  // Create new tag (admin only)
  createTag: (req, res) => {
    const { name, color, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    db.run(
      'INSERT INTO tags (name, color, icon, description) VALUES (?, ?, ?, ?)',
      [name, color || '#8b5cf6', icon || 'tag', description || ''],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Tag already exists' });
          }
          return res.status(500).json({ error: 'Failed to create tag' });
        }

        res.status(201).json({
          message: 'Tag created successfully',
          tag_id: this.lastID
        });
      }
    );
  },

  // Update tag (admin only)
  updateTag: (req, res) => {
    const { id } = req.params;
    const { name, color, icon, description } = req.body;

    db.run(
      'UPDATE tags SET name = ?, color = ?, icon = ?, description = ? WHERE id = ?',
      [name, color, icon, description, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Tag name already exists' });
          }
          return res.status(500).json({ error: 'Failed to update tag' });
        }

        res.json({ message: 'Tag updated successfully' });
      }
    );
  },

  // Delete tag (admin only)
  deleteTag: (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM tags WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete tag' });
      }

      res.json({ message: 'Tag deleted successfully' });
    });
  },

  // Get user tags
  getUserTags: (req, res) => {
    const { user_id } = req.params;

    db.all(
      `SELECT t.*, ut.assigned_at, ut.assigned_by,
        (SELECT username FROM users WHERE id = ut.assigned_by) as assigned_by_username
      FROM tags t
      JOIN user_tags ut ON t.id = ut.tag_id
      WHERE ut.user_id = ?
      ORDER BY ut.assigned_at DESC`,
      [user_id],
      (err, tags) => {
        if (err) {
          console.error('Failed to fetch user tags:', err);
          return res.status(500).json({ error: 'Failed to fetch user tags', details: err.message });
        }
        res.json(tags);
      }
    );
  },

  // Assign tag to user (admin only)
  assignTagToUser: (req, res) => {
    const { user_id, tag_id } = req.body;

    console.log('Assigning tag to user:', { user_id, tag_id, admin_id: req.user.id });

    if (!user_id || !tag_id) {
      return res.status(400).json({ error: 'User ID and Tag ID are required' });
    }

    db.run(
      'INSERT INTO user_tags (user_id, tag_id, assigned_by) VALUES (?, ?, ?)',
      [user_id, tag_id, req.user.id],
      function(err) {
        if (err) {
          console.error('Failed to assign tag:', err);
          if (err.message.includes('UNIQUE constraint failed') || err.code === '23505') {
            return res.status(400).json({ error: 'User already has this tag' });
          }
          return res.status(500).json({ error: 'Failed to assign tag', details: err.message });
        }

        console.log('Tag assigned successfully');
        res.json({ message: 'Tag assigned successfully' });
      }
    );
  },

  // Remove tag from user (admin only)
  removeTagFromUser: (req, res) => {
    const { user_id, tag_id } = req.params;

    db.run(
      'DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?',
      [user_id, tag_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to remove tag' });
        }

        res.json({ message: 'Tag removed successfully' });
      }
    );
  }
};

module.exports = tagsController;
