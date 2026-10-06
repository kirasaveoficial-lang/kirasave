const db = require('../config/database');

const adminMarketplaceController = {
  // ===== MARKETPLACE DASHBOARD =====
  
  getDashboard: (req, res) => {
    // Get marketplace stats
    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE status = 'approved') as total_products,
        (SELECT COUNT(*) FROM products WHERE status = 'pending') as pending_products,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM orders WHERE payment_status = 'paid') as paid_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals
    `, (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      res.json({ stats });
    });
  },

  // ===== PRODUCT MANAGEMENT =====

  getPendingProducts: (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    db.all(`
      SELECT p.*, u.username as seller_name, u.avatar as seller_avatar
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset], (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch pending products' });
      }

      res.json({ products });
    });
  },

  getAllProducts: (req, res) => {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    db.all(`
      SELECT p.*, u.username as seller_name, u.avatar as seller_avatar
      FROM products p
      JOIN users u ON p.seller_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset], (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch products' });
      }

      res.json({ products });
    });
  },

  approveProduct: (req, res) => {
    const { id } = req.params;

    db.run('UPDATE products SET status = ? WHERE id = ?', ['approved', id], function(err) {
      if (err) {
        console.error('Error approving product:', err);
        return res.status(500).json({ error: 'Failed to approve product' });
      }

      res.json({ message: 'Product approved successfully' });
    });
  },

  rejectProduct: (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    db.run('UPDATE products SET status = ? WHERE id = ?', ['rejected', id], function(err) {
      if (err) {
        console.error('Error rejecting product:', err);
        return res.status(500).json({ error: 'Failed to reject product' });
      }

      // TODO: Send notification to seller with reason

      res.json({ message: 'Product rejected successfully' });
    });
  },

  hideProduct: (req, res) => {
    const { id } = req.params;

    db.run('UPDATE products SET status = ? WHERE id = ?', ['hidden', id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to hide product' });
      }

      res.json({ message: 'Product hidden successfully' });
    });
  },

  blockProduct: (req, res) => {
    const { id } = req.params;

    db.run('UPDATE products SET status = ? WHERE id = ?', ['blocked', id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to block product' });
      }

      res.json({ message: 'Product blocked successfully' });
    });
  },

  // ===== ORDER MANAGEMENT =====

  getAllOrders: (req, res) => {
    const { page = 1, limit = 20, status, payment_status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (payment_status) {
      whereClause += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    db.all(`
      SELECT o.*, u.username as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset], (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      res.json({ orders });
    });
  },

  getOrderDetails: (req, res) => {
    const { id } = req.params;

    db.get(`
      SELECT o.*, u.username as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE o.id = ?
    `, [id], (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch order' });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get order items
      db.all(`
        SELECT oi.*, p.name as product_name, p.image_url, u.username as seller_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN users u ON oi.seller_id = u.id
        WHERE oi.order_id = ?
      `, [id], (err, items) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch order items' });
        }

        res.json({ order: { ...order, items } });
      });
    });
  },

  updateOrderStatus: (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      res.json({ message: 'Order status updated successfully' });
    });
  },

  updatePaymentStatus: (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;

    db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update payment status' });
      }

      // If paid, create wallet transactions for sellers
      if (payment_status === 'paid') {
        db.all('SELECT * FROM order_items WHERE order_id = ?', [id], (err, items) => {
          if (err) return;

          items.forEach(item => {
            // Create or get seller wallet
            db.get('SELECT * FROM wallet WHERE user_id = ?', [item.seller_id], (err, wallet) => {
              if (err) return;

              if (!wallet) {
                db.run('INSERT INTO wallet (user_id) VALUES (?)', [item.seller_id], function(err) {
                  if (err) return;
                  wallet = { id: this.lastID, available_balance: 0, pending_balance: 0, total_earned: 0 };
                });
              }

              // Add to pending balance
              const newPending = parseFloat(wallet.pending_balance) + parseFloat(item.price);
              db.run(`
                UPDATE wallet SET pending_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
              `, [newPending, wallet.id]);
            });
          });
        });
      }

      res.json({ message: 'Payment status updated successfully' });
    });
  },

  // ===== PAYMENT MANAGEMENT =====

  getAllPayments: (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.payment_status = ?';
      params.push(status);
    }

    db.all(`
      SELECT o.*, u.username as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset], (err, payments) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch payments' });
      }

      res.json({ payments });
    });
  }
};

module.exports = adminMarketplaceController;
