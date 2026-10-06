const db = require('../config/database');

const marketplaceController = {
  // Get all products (public)
  getAllProducts: (req, res) => {
    const { page = 1, limit = 20, category, search, sort = 'newest' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.status = ?';
    const params = ['approved'];

    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.price ASC';
    if (sort === 'price_desc') orderBy = 'ORDER BY p.price DESC';
    if (sort === 'popular') orderBy = 'ORDER BY p.downloads_count DESC';
    if (sort === 'rating') orderBy = 'ORDER BY avg_rating DESC';

    db.all(`
      SELECT p.*, u.username as seller_name, u.avatar as seller_avatar,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as reviews_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset], (err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        return res.status(500).json({ error: 'Failed to fetch products' });
      }

      db.get(`SELECT COUNT(*) as total FROM products p ${whereClause}`, params, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to count products' });
        }

        res.json({
          products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      });
    });
  },

  // Get single product
  getProductById: (req, res) => {
    const { id } = req.params;

    db.get(`
      SELECT p.*, u.username as seller_name, u.avatar as seller_avatar, u.id as seller_id
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.id = ?
    `, [id], (err, product) => {
      if (err) {
        console.error('Error fetching product:', err);
        return res.status(500).json({ error: 'Failed to fetch product' });
      }

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Increment view count
      db.run('UPDATE products SET views_count = views_count + 1 WHERE id = ?', [id]);

      res.json(product);
    });
  },

  // Create product (seller only)
  createProduct: (req, res) => {
    const userId = req.user.id;
    const { name, description, category, subcategory, price, image_url, file_url, file_name, file_size, tags } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Parse tags if it's a string
    const tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;

    db.run(`
      INSERT INTO products (seller_id, name, description, category, subcategory, price, image_url, file_url, file_name, file_size, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [userId, name, description, category, subcategory, parseFloat(price), image_url, file_url, file_name, file_size, JSON.stringify(tagsArray)],
    function(err) {
      if (err) {
        console.error('Error creating product:', err);
        return res.status(500).json({ error: 'Failed to create product' });
      }

      res.status(201).json({ message: 'Product created successfully', id: this.lastID });
    });
  },

  // Get user's products (seller)
  getSellerProducts: (req, res) => {
    const userId = req.user.id;

    db.all(`
      SELECT p.*
      FROM products p
      WHERE p.seller_id = ?
      ORDER BY p.created_at DESC
    `, [userId], (err, products) => {
      if (err) {
        console.error('Error fetching seller products:', err);
        return res.status(500).json({ error: 'Failed to fetch products' });
      }

      res.json({ products });
    });
  },

  // Update product
  updateProduct: (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, category, subcategory, price, image_url, tags } = req.body;

    // Parse tags if it's a string
    const tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;

    // Verify ownership
    db.get('SELECT * FROM products WHERE id = ? AND seller_id = ?', [id, userId], (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!product) {
        return res.status(404).json({ error: 'Product not found or unauthorized' });
      }

      db.run(`
        UPDATE products SET name = ?, description = ?, category = ?, subcategory = ?, price = ?, image_url = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, description, category, subcategory, parseFloat(price), image_url, JSON.stringify(tagsArray), id], function(err) {
        if (err) {
          console.error('Error updating product:', err);
          return res.status(500).json({ error: 'Failed to update product' });
        }

        res.json({ message: 'Product updated successfully' });
      });
    });
  },

  // Delete product
  deleteProduct: (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    db.get('SELECT * FROM products WHERE id = ? AND seller_id = ?', [id, userId], (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!product) {
        return res.status(404).json({ error: 'Product not found or unauthorized' });
      }

      db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting product:', err);
          return res.status(500).json({ error: 'Failed to delete product' });
        }

        res.json({ message: 'Product deleted successfully' });
      });
    });
  },

  // Get cart
  getCart: (req, res) => {
    const userId = req.user.id;

    db.all(`
      SELECT c.*, p.name, p.price, p.image_url, p.seller_id
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [userId], (err, cartItems) => {
      if (err) {
        console.error('Error fetching cart:', err);
        return res.status(500).json({ error: 'Failed to fetch cart' });
      }

      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      res.json({ cart: cartItems, total });
    });
  },

  // Add to cart
  addToCart: (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity = 1 } = req.body;

    // Check if product exists and is approved
    db.get('SELECT * FROM products WHERE id = ? AND status = ?', [product_id, 'approved'], (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!product) {
        return res.status(404).json({ error: 'Product not found or not available' });
      }

      // Check if user is trying to buy their own product
      if (product.seller_id === userId) {
        return res.status(400).json({ error: 'You cannot buy your own product' });
      }

      // Check if already in cart
      db.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, product_id], (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update quantity
          db.run('UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
            [quantity, userId, product_id], function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to update cart' });
              }
              res.json({ message: 'Cart updated successfully' });
            });
        } else {
          // Add new item
          db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
            [userId, product_id, quantity], function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to add to cart' });
              }
              res.status(201).json({ message: 'Added to cart successfully' });
            });
        }
      });
    });
  },

  // Remove from cart
  removeFromCart: (req, res) => {
    const userId = req.user.id;
    const { product_id } = req.params;

    db.run('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, product_id], function(err) {
      if (err) {
        console.error('Error removing from cart:', err);
        return res.status(500).json({ error: 'Failed to remove from cart' });
      }

      res.json({ message: 'Removed from cart successfully' });
    });
  },

  // Create order
  createOrder: (req, res) => {
    const userId = req.user.id;

    // Get cart items
    db.all(`
      SELECT c.*, p.price, p.seller_id, p.file_url, p.file_name
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [userId], (err, cartItems) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order
      db.run(`
        INSERT INTO orders (buyer_id, total_amount, status, payment_status)
        VALUES (?, ?, 'pending', 'pending')
      `, [userId, totalAmount], function(err) {
        if (err) {
          console.error('Error creating order:', err);
          return res.status(500).json({ error: 'Failed to create order' });
        }

        const orderId = this.lastID;

        // Add order items
        cartItems.forEach(item => {
          db.run(`
            INSERT INTO order_items (order_id, product_id, seller_id, price, quantity)
            VALUES (?, ?, ?, ?, ?)
          `, [orderId, item.product_id, item.seller_id, item.price, item.quantity]);
        });

        // Clear cart
        db.run('DELETE FROM cart WHERE user_id = ?', [userId]);

        res.status(201).json({ message: 'Order created successfully', order_id: orderId });
      });
    });
  },

  // Get user's orders (buyer)
  getBuyerOrders: (req, res) => {
    const userId = req.user.id;

    db.all(`
      SELECT o.*
      FROM orders o
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `, [userId], (err, orders) => {
      if (err) {
        console.error('Error fetching orders:', err);
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      // For each order, fetch items
      const ordersWithItems = orders.map(order => {
        return new Promise((resolve) => {
          db.all(`
            SELECT oi.*, p.name as product_name, p.image_url as product_image,
              p.file_url, p.file_name, u.username as seller_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON oi.seller_id = u.id
            WHERE oi.order_id = ?
          `, [order.id], (err, items) => {
            resolve({
              ...order,
              items: items || []
            });
          });
        });
      });

      Promise.all(ordersWithItems).then(finalOrders => {
        res.json({ orders: finalOrders });
      });
    });
  },

  // Get seller's orders
  getSellerOrders: (req, res) => {
    const userId = req.user.id;

    db.all(`
      SELECT oi.*, o.total_amount, o.status as order_status, o.payment_status,
        o.created_at as order_created_at,
        p.name as product_name, p.image_url as product_image,
        u.username as buyer_name, u.avatar as buyer_avatar
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      WHERE oi.seller_id = ?
      ORDER BY o.created_at DESC
    `, [userId], (err, orders) => {
      if (err) {
        console.error('Error fetching seller orders:', err);
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      res.json({ orders });
    });
  },

  // Upload product file
  uploadProductFile: (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify ownership
    db.get('SELECT * FROM products WHERE id = ? AND seller_id = ?', [id, userId], (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!product) {
        return res.status(404).json({ error: 'Product not found or unauthorized' });
      }

      // Update product with file URL
      db.run(`
        UPDATE products SET file_url = ?, file_name = ?, file_size = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [req.file.path, req.file.originalname, req.file.size, id], function(err) {
        if (err) {
          console.error('Error updating product file:', err);
          return res.status(500).json({ error: 'Failed to update product file' });
        }

        res.json({ message: 'File uploaded successfully', file_url: req.file.path });
      });
    });
  },

  // Download product (after purchase)
  downloadProduct: (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user has purchased this product
    db.get(`
      SELECT p.file_url, p.file_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.buyer_id = ? AND o.payment_status = 'paid'
    `, [id, userId], (err, result) => {
      if (err) {
        console.error('Error verifying purchase:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!result) {
        return res.status(403).json({ error: 'You have not purchased this product' });
      }

      // Increment download count
      db.run('UPDATE products SET downloads_count = downloads_count + 1 WHERE id = ?', [id]);

      // Redirect to file URL
      res.redirect(result.file_url);
    });
  }
};

module.exports = marketplaceController;
