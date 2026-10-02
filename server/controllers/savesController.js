const db = require('../config/database');
const { uploadSave, uploadImages, uploadSingleImage } = require('../middleware/upload');
const { uploadSaveCloudinary, uploadImagesCloudinary } = require('../middleware/uploadCloudinary');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Use Cloudinary in production, local filesystem in development
const isProduction = process.env.NODE_ENV === 'production';
// In production, always try to use Cloudinary if credentials are set
const useCloudinary = isProduction && (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_API_KEY);

const savesController = {
  getAllSaves: (req, res) => {
    const { page = 1, limit = 12, sort = 'recent', game, platform, category, search } = req.query;
    const offset = (page - 1) * limit;

    let orderBy = 'created_at DESC';
    if (sort === 'popular') orderBy = 'download_count DESC';
    if (sort === 'rated') orderBy = 'rating_avg DESC';

    let whereClause = "WHERE s.status = 'approved'";
    const params = [];

    if (game) {
      whereClause += ' AND s.game_id = ?';
      params.push(game);
    }

    if (platform) {
      whereClause += ' AND s.platform = ?';
      params.push(platform);
    }

    if (category) {
      whereClause += ' AND s.category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (s.title LIKE ? OR s.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Save search history if user is logged in
    if (search && req.user) {
      db.run('INSERT INTO search_history (user_id, query) VALUES (?, ?)', [req.user.id, search]);
    }

    const query = `
      SELECT s.*, u.username, u.avatar, u.id as user_id, g.name as game_name, g.cover_image as game_cover,
        (SELECT COUNT(*) FROM favorites WHERE save_id = s.id) as favorites_count
      FROM saves s
      JOIN users u ON s.user_id = u.id
      JOIN games g ON s.game_id = g.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    db.all(query, [...params, limit, offset], (err, saves) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch saves', details: err.message });
      }

      // Add full URL path to file_path and thumbnail, and fetch user tags
      saves = saves.map(save => ({
        ...save,
        file_path: `/uploads/saves/${save.file_path}`,
        thumbnail: save.thumbnail ? `/uploads/images/${save.thumbnail}` : save.game_cover
      }));

      // Fetch user tags for each save author
      const savesWithTags = saves.map(save => {
        return new Promise((resolve) => {
          db.all(`
            SELECT t.*
            FROM tags t
            JOIN user_tags ut ON t.id = ut.tag_id
            WHERE ut.user_id = ?
          `, [save.user_id], (err, tags) => {
            resolve({
              ...save,
              user_tags: tags || []
            });
          });
        });
      });

      Promise.all(savesWithTags).then(finalSaves => {

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM saves s ${whereClause}`;
      db.get(countQuery, params, (err, result) => {
        if (err) {
          console.error('Count error:', err);
          return res.status(500).json({ error: 'Failed to count saves', details: err.message });
        }

        res.json({
          saves: finalSaves,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      });
      });
    });
  },

  getSaveById: (req, res) => {
    const { id } = req.params;

    // Increment view count
    db.run('UPDATE saves SET view_count = view_count + 1 WHERE id = ?', [id], (err) => {
      if (err) console.error('Error updating view count:', err);
    });

    const query = `
      SELECT s.*, u.username, u.avatar, u.is_online, u.last_seen, u.created_at as user_created_at, g.name as game_name, g.cover_image as game_cover,
        (SELECT COUNT(*) FROM favorites WHERE save_id = s.id) as favorites_count
      FROM saves s
      JOIN users u ON s.user_id = u.id
      JOIN games g ON s.game_id = g.id
      WHERE s.id = ?
    `;

    db.get(query, [id], (err, save) => {
      if (err || !save) {
        return res.status(404).json({ error: 'Save not found' });
      }

      // Add full URL path to file_path
      save.file_path = `/uploads/saves/${save.file_path}`;

      // Get user tags
      db.all(`
        SELECT t.*, ut.assigned_at
        FROM tags t
        JOIN user_tags ut ON t.id = ut.tag_id
        WHERE ut.user_id = ?
        ORDER BY ut.assigned_at DESC
      `, [save.user_id], (err, userTags) => {
        if (err) userTags = [];
        save.user_tags = userTags;

        // Get save images
        db.all('SELECT * FROM save_images WHERE save_id = ?', [id], (err, images) => {
          if (err) images = [];
          // Add full URL path to images
          images = images.map(img => ({
            ...img,
            image_path: `/uploads/images/${img.image_path}`
          }));

          // Get comments with nested structure
          db.all(`
            SELECT c.*, u.username, u.avatar, u.id as user_id, u.bio, u.is_online, u.created_at as user_created_at,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as user_liked,
              CASE WHEN c.updated_at > c.created_at THEN TRUE ELSE FALSE END as is_edited
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.save_id = ?
            ORDER BY c.created_at ASC
          `, [req.user?.id || null, id], (err, comments) => {
            if (err) comments = [];

            // Fetch user tags for each comment author
            const commentsWithTags = comments.map(comment => {
              return new Promise((resolve) => {
                db.all(`
                  SELECT t.*
                  FROM tags t
                  JOIN user_tags ut ON t.id = ut.tag_id
                  WHERE ut.user_id = ?
                `, [comment.user_id], (err, tags) => {
                  resolve({
                    ...comment,
                    user_tags: tags || [],
                    created_at: comment.user_created_at || comment.created_at
                  });
                });
              });
            });

            Promise.all(commentsWithTags).then(finalComments => {
              // Build nested comment structure
              const commentMap = {};
              const rootComments = [];

              finalComments.forEach(comment => {
                comment.replies = [];
                commentMap[comment.id] = comment;
              });

              finalComments.forEach(comment => {
                if (comment.parent_id && commentMap[comment.parent_id]) {
                  commentMap[comment.parent_id].replies.push(comment);
                } else {
                  rootComments.push(comment);
                }
              });

            // Check if user favorited
            let isFavorited = false;
            if (req.user) {
              db.get('SELECT * FROM favorites WHERE user_id = ? AND save_id = ?',
                [req.user.id, id], (err, fav) => {
                isFavorited = !!fav;
                res.json({ ...save, images, comments: rootComments, isFavorited });
              });
            } else {
              res.json({ ...save, images, comments: rootComments, isFavorited });
            }
            });
          });
        });
      });
    });
  },

  createSave: (req, res) => {
    console.log('=== UPLOAD REQUEST START ===');
    console.log('User:', req.user);
    console.log('Body keys:', Object.keys(req.body));
    console.log('Body:', req.body);
    console.log('Using Cloudinary:', useCloudinary);

    // Use Cloudinary middleware in production, local filesystem in development
    const uploadMiddleware = useCloudinary ? uploadSaveCloudinary : uploadSave;

    uploadMiddleware(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ error: err.message });
      }

      console.log('File uploaded:', req.file);
      console.log('File path:', req.file ? req.file.path : 'NO PATH');

      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'Save file is required' });
      }

      const { title, description, game_id, platform, category } = req.body;

      console.log('Form data:', { title, description, game_id, platform, category });

      if (!title || !game_id || !platform) {
        console.error('Missing required fields');
        return res.status(400).json({ error: 'Title, game, and platform are required' });
      }

      // Store Cloudinary URL or local file path
      const filePath = useCloudinary ? req.file.path : req.file.filename;

      console.log('Creating save in database...');
      console.log('File path to store:', filePath);

      db.run(
        `INSERT INTO saves (title, description, file_path, user_id, game_id, platform, category, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [title, description, filePath, req.user.id, game_id, platform, category],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create save: ' + err.message });
          }

          console.log('=== SAVE CREATED SUCCESSFULLY ===');
          console.log('Save ID:', this.lastID);
          console.log('Status: pending');

          // Create notification for approval
          db.run(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'save_pending', 'Save Enviado para Análise', `Seu save "${title}" foi enviado e está aguardando aprovação do administrador.`, `/profile`]
          );

          res.status(201).json({
            message: 'Save created successfully and waiting for admin approval',
            save_id: this.lastID
          });
        }
      );
    });
  },

  uploadSaveImages: (req, res) => {
    uploadImages(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'At least one image is required' });
      }

      const { save_id } = req.body;
      const images = req.files;

      let insertedCount = 0;
      images.forEach((file, index) => {
        const isCover = index === 0 ? 1 : 0;
        db.run(
          'INSERT INTO save_images (save_id, image_path, is_cover) VALUES (?, ?, ?)',
          [save_id, file.filename, isCover],
          (err) => {
            if (!err) insertedCount++;
            if (insertedCount === images.length) {
              res.json({ message: 'Images uploaded successfully', count: insertedCount });
            }
          }
        );
      });
    });
  },

  downloadSave: (req, res) => {
    const { id } = req.params;
    const saveId = parseInt(id, 10);

    console.log('=== DOWNLOAD REQUEST ===');
    console.log('Save ID (parsed):', saveId);
    console.log('Save ID (raw):', id);
    console.log('User:', req.user ? req.user.id : 'Not logged in');

    if (isNaN(saveId)) {
      console.error('Invalid save ID:', id);
      return res.status(400).json({ error: 'Invalid save ID' });
    }

    db.get('SELECT * FROM saves WHERE id = ?', [saveId], (err, save) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      if (!save) {
        console.error('Save not found in database:', saveId);
        return res.status(404).json({ error: 'Save not found' });
      }

      console.log('Save found:', { id: save.id, title: save.title, status: save.status, file_path: save.file_path });

      if (save.status !== 'approved') {
        console.error('Save not approved:', save.status);
        return res.status(403).json({ error: 'Save is not approved yet' });
      }

      // Increment download count
      db.run('UPDATE saves SET download_count = download_count + 1 WHERE id = ?', [saveId], (err) => {
        if (err) console.error('Error updating download count:', err);
      });

      // Log download
      if (req.user) {
        db.run('INSERT INTO downloads (user_id, save_id, ip_address) VALUES (?, ?, ?)',
          [req.user.id, saveId, req.ip]);
      } else {
        db.run('INSERT INTO downloads (save_id, ip_address) VALUES (?, ?)',
          [saveId, req.ip]);
      }

      // Check if file_path is a Cloudinary URL
      if (save.file_path.startsWith('http')) {
        console.log('Download from Cloudinary URL:', save.file_path);

        // Stream the file from Cloudinary to the user
        const url = new URL(save.file_path);
        const protocol = url.protocol === 'https:' ? https : http;

        console.log('Streaming file from Cloudinary...');

        protocol.get(save.file_path, (cloudRes) => {
          console.log('Cloudinary response status:', cloudRes.statusCode);

          if (cloudRes.statusCode !== 200) {
            console.error('Cloudinary returned non-200 status:', cloudRes.statusCode);
            return res.status(500).json({ error: 'Failed to download from Cloudinary' });
          }

          // Set headers for download
          res.setHeader('Content-Type', cloudRes.headers['content-type'] || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="save-${saveId}.rar"`);
          res.setHeader('Content-Length', cloudRes.headers['content-length']);

          // Pipe the stream to the response
          cloudRes.pipe(res);

          cloudRes.on('error', (err) => {
            console.error('Cloudinary stream error:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Download stream error' });
            }
          });

          cloudRes.on('end', () => {
            console.log('Cloudinary download completed successfully');
          });
        }).on('error', (err) => {
          console.error('Cloudinary request error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to connect to Cloudinary' });
          }
        });
      } else {
        // Use local filesystem
        const filePath = path.join(__dirname, '../../public/uploads/saves/', save.file_path);
        console.log('Download from local filesystem:', filePath);
        console.log('File path from DB:', save.file_path);

        if (!fs.existsSync(filePath)) {
          console.error('File does not exist:', filePath);
          return res.status(404).json({ error: 'File not found on server' });
        }

        console.log('File exists, starting download...');
        res.download(filePath, (err) => {
          if (err) {
            console.error('Download error:', err);
            return res.status(500).json({ error: 'Failed to download file', details: err.message });
          }
          console.log('Download completed successfully');
        });
      }
    });
  },

  rateSave: (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    db.run(
      'INSERT INTO ratings (user_id, save_id, rating) VALUES (?, ?, ?) ON CONFLICT (user_id, save_id) DO UPDATE SET rating = EXCLUDED.rating',
      [req.user.id, id, rating],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to rate save' });
        }

        // Update save rating average
        db.run(`
          UPDATE saves
          SET rating_avg = (SELECT AVG(rating) FROM ratings WHERE save_id = ?),
              rating_count = (SELECT COUNT(*) FROM ratings WHERE save_id = ?)
          WHERE id = ?
        `, [id, id, id]);

        res.json({ message: 'Rating saved successfully' });
      }
    );
  },

  toggleFavorite: (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM favorites WHERE user_id = ? AND save_id = ?',
      [req.user.id, id], (err, favorite) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to toggle favorite' });
        }

        if (favorite) {
          // Remove favorite
          db.run('DELETE FROM favorites WHERE id = ?', [favorite.id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to remove favorite' });
            }
            res.json({ message: 'Favorite removed', isFavorited: false });
          });
        } else {
          // Add favorite
          db.run('INSERT INTO favorites (user_id, save_id) VALUES (?, ?)',
            [req.user.id, id], (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to add favorite' });
              }
              res.json({ message: 'Favorite added', isFavorited: true });
            });
        }
      });
  },

  addComment: (req, res) => {
    const { id } = req.params;
    const { content, parent_id } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    db.run(
      'INSERT INTO comments (user_id, save_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [req.user.id, id, content, parent_id || null],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to add comment' });
        }

        // Notify save author or parent comment author
        if (parent_id) {
          db.get('SELECT user_id FROM comments WHERE id = ?', [parent_id], (err, parentComment) => {
            if (parentComment && parentComment.user_id !== req.user.id) {
              db.run(
                'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
                [parentComment.user_id, 'comment_reply', 'New Reply', 'Someone replied to your comment', `/saves/${id}`]
              );
            }
          });
        } else {
          db.get('SELECT user_id FROM saves WHERE id = ?', [id], (err, save) => {
            if (save && save.user_id !== req.user.id) {
              db.run(
                'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
                [save.user_id, 'comment', 'New Comment', 'Someone commented on your save', `/saves/${id}`]
              );
            }
          });
        }

        res.status(201).json({ message: 'Comment added successfully', comment_id: this.lastID });
      }
    );
  },

  likeComment: (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [req.user.id, id], (err, like) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to toggle like' });
        }

        if (like) {
          // Remove like
          db.run('DELETE FROM comment_likes WHERE id = ?', [like.id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to remove like' });
            }
            db.run('UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?', [id]);
            res.json({ message: 'Like removed', liked: false });
          });
        } else {
          // Add like
          db.run('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)',
            [req.user.id, id], (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to add like' });
              }
              db.run('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [id]);
              res.json({ message: 'Like added', liked: true });
            });
        }
      });
  },

  deleteComment: (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM comments WHERE id = ?', [id], (err, comment) => {
      if (err || !comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Check if user is comment author or admin
      if (comment.user_id !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }

      db.run('DELETE FROM comments WHERE id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete comment' });
        }
        res.json({ message: 'Comment deleted successfully' });
      });
    });
  },

  editComment: (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    db.get('SELECT * FROM comments WHERE id = ?', [id], (err, comment) => {
      if (err || !comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Check if user is comment author or admin
      if (comment.user_id !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Not authorized to edit this comment' });
      }

      db.run(
        'UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?',
        [content, id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to edit comment' });
          }
          res.json({ message: 'Comment edited successfully' });
        }
      );
    });
  },

  getGames: (req, res) => {
    db.all('SELECT * FROM games ORDER BY name', (err, games) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch games' });
      }
      res.json(games);
    });
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

  updateSaveImage: (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if save exists and belongs to user
    db.get('SELECT * FROM saves WHERE id = ? AND user_id = ?', [id, userId], (err, save) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar save' });
      }
      if (!save) {
        return res.status(404).json({ error: 'Save não encontrado ou você não tem permissão' });
      }

      // Handle image upload
      uploadSingleImage(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }

        // Update save with new image
        const imagePath = req.file.filename;
        db.run(
          'UPDATE saves SET thumbnail = ? WHERE id = ?',
          [imagePath, id],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Erro ao atualizar imagem' });
            }
            res.json({ success: true, thumbnail: `/uploads/images/${imagePath}` });
          }
        );
      });
    });
  },

  deleteSaveImage: (req, res) => {
    const { id, imageId } = req.params;
    const userId = req.user.id;

    // Get the image to check ownership
    db.get('SELECT si.*, s.user_id FROM save_images si JOIN saves s ON si.save_id = s.id WHERE si.id = ?', [imageId], (err, image) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar imagem' });
      }
      if (!image) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }
      if (image.user_id !== userId) {
        return res.status(403).json({ error: 'Você não tem permissão para excluir esta imagem' });
      }

      // Delete the image from database
      db.run('DELETE FROM save_images WHERE id = ?', [imageId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao excluir imagem' });
        }
        res.json({ success: true });
      });
    });
  }
};

module.exports = savesController;
