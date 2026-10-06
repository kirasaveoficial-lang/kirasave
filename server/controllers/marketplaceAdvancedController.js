const db = require('../config/database');

const marketplaceAdvancedController = {
  // ===== REVIEWS =====
  
  // Create review (only after purchase)
  createReview: (req, res) => {
    const userId = req.user.id;
    const { product_id, rating, comment } = req.body;

    if (!product_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid product_id and rating (1-5) required' });
    }

    // Verify user purchased this product
    db.get(`
      SELECT oi.*, p.seller_id
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.product_id = ? AND o.buyer_id = ? AND o.payment_status = 'paid'
    `, [product_id, userId], (err, purchase) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!purchase) {
        return res.status(403).json({ error: 'You must purchase this product to review it' });
      }

      // Check if already reviewed
      db.get('SELECT * FROM reviews WHERE product_id = ? AND buyer_id = ?', [product_id, userId], (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        // Create review
        db.run(`
          INSERT INTO reviews (product_id, buyer_id, seller_id, rating, comment)
          VALUES (?, ?, ?, ?, ?)
        `, [product_id, userId, purchase.seller_id, rating, comment], function(err) {
          if (err) {
            console.error('Error creating review:', err);
            return res.status(500).json({ error: 'Failed to create review' });
          }

          res.status(201).json({ message: 'Review created successfully', id: this.lastID });
        });
      });
    });
  },

  // Get product reviews
  getProductReviews: (req, res) => {
    const { product_id } = req.params;

    db.all(`
      SELECT r.*, u.username as buyer_name, u.avatar as buyer_avatar
      FROM reviews r
      JOIN users u ON r.buyer_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `, [product_id], (err, reviews) => {
      if (err) {
        console.error('Error fetching reviews:', err);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
      }

      res.json({ reviews });
    });
  },

  // ===== COUPONS =====

  // Create coupon (admin only)
  createCoupon: (req, res) => {
    const { code, discount_type, discount_value, min_purchase, max_uses, valid_until } = req.body;

    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ error: 'Code, discount_type and discount_value are required' });
    }

    db.run(`
      INSERT INTO coupons (code, discount_type, discount_value, min_purchase, max_uses, valid_until)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [code.toUpperCase(), discount_type, parseFloat(discount_value), parseFloat(min_purchase || 0), max_uses, valid_until],
    function(err) {
      if (err) {
        console.error('Error creating coupon:', err);
        return res.status(500).json({ error: 'Failed to create coupon' });
      }

      res.status(201).json({ message: 'Coupon created successfully', id: this.lastID });
    });
  },

  // Validate coupon
  validateCoupon: (req, res) => {
    const { code } = req.params;

    db.get(`
      SELECT * FROM coupons
      WHERE code = ? AND status = 'active'
      AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
    `, [code.toUpperCase()], (err, coupon) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!coupon) {
        return res.status(404).json({ error: 'Invalid or expired coupon' });
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return res.status(400).json({ error: 'Coupon has reached maximum uses' });
      }

      res.json({
        valid: true,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase
      });
    });
  },

  // Apply coupon to order
  applyCoupon: (req, res) => {
    const { code, total_amount } = req.body;

    db.get(`
      SELECT * FROM coupons
      WHERE code = ? AND status = 'active'
      AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
    `, [code.toUpperCase()], (err, coupon) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!coupon) {
        return res.status(404).json({ error: 'Invalid or expired coupon' });
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return res.status(400).json({ error: 'Coupon has reached maximum uses' });
      }

      if (coupon.min_purchase && total_amount < coupon.min_purchase) {
        return res.status(400).json({ error: `Minimum purchase R$ ${coupon.min_purchase} required` });
      }

      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = total_amount * (coupon.discount_value / 100);
      } else {
        discount = coupon.discount_value;
      }

      const final_amount = Math.max(0, total_amount - discount);

      res.json({
        discount,
        final_amount,
        coupon_id: coupon.id
      });
    });
  },

  // List coupons (admin)
  listCoupons: (req, res) => {
    db.all('SELECT * FROM coupons ORDER BY created_at DESC', (err, coupons) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch coupons' });
      }

      res.json({ coupons });
    });
  },

  // ===== WALLET =====

  // Get user wallet
  getWallet: (req, res) => {
    const userId = req.user.id;

    db.get('SELECT * FROM wallet WHERE user_id = ?', [userId], (err, wallet) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!wallet) {
        // Create wallet if doesn't exist
        db.run('INSERT INTO wallet (user_id) VALUES (?)', [userId], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create wallet' });
          }

          db.get('SELECT * FROM wallet WHERE user_id = ?', [userId], (err, newWallet) => {
            res.json(newWallet);
          });
        });
      } else {
        res.json(wallet);
      }
    });
  },

  // Get wallet transactions
  getWalletTransactions: (req, res) => {
    const userId = req.user.id;

    db.get('SELECT id FROM wallet WHERE user_id = ?', [userId], (err, wallet) => {
      if (err || !wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      db.all(`
        SELECT * FROM transactions
        WHERE wallet_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `, [wallet.id], (err, transactions) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch transactions' });
        }

        res.json({ transactions });
      });
    });
  },

  // Add funds to wallet (admin or system only)
  addFunds: (req, res) => {
    const { user_id, amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    db.get('SELECT * FROM wallet WHERE user_id = ?', [user_id], (err, wallet) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const newBalance = parseFloat(wallet.available_balance) + parseFloat(amount);
      const newTotal = parseFloat(wallet.total_earned) + parseFloat(amount);

      db.run(`
        UPDATE wallet SET available_balance = ?, total_earned = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newBalance, newTotal, wallet.id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update wallet' });
        }

        // Create transaction record
        db.run(`
          INSERT INTO transactions (wallet_id, type, amount, balance_after, description)
          VALUES (?, 'credit', ?, ?, ?)
        `, [wallet.id, amount, newBalance, description]);

        res.json({ message: 'Funds added successfully', new_balance: newBalance });
      });
    });
  },

  // ===== WITHDRAWALS =====

  // Create withdrawal request
  createWithdrawal: (req, res) => {
    const userId = req.user.id;
    const { amount, method, method_details } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    if (!method || !method_details) {
      return res.status(400).json({ error: 'Method and method_details required' });
    }

    // Check wallet balance
    db.get('SELECT * FROM wallet WHERE user_id = ?', [userId], (err, wallet) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      if (parseFloat(wallet.available_balance) < parseFloat(amount)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Create withdrawal
      db.run(`
        INSERT INTO withdrawals (user_id, amount, method, method_details)
        VALUES (?, ?, ?, ?)
      `, [userId, amount, method, JSON.stringify(method_details)], function(err) {
        if (err) {
          console.error('Error creating withdrawal:', err);
          return res.status(500).json({ error: 'Failed to create withdrawal' });
        }

        // Deduct from wallet (pending)
        db.run(`
          UPDATE wallet SET available_balance = available_balance - ?, pending_balance = pending_balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [amount, amount, wallet.id]);

        // Create transaction record
        db.run(`
          INSERT INTO transactions (wallet_id, type, amount, balance_after, description, reference_id, reference_type)
          VALUES (?, 'debit', ?, ?, ?, ?, 'withdrawal')
        `, [wallet.id, amount, parseFloat(wallet.available_balance) - amount, 'Solicitação de saque', this.lastID]);

        res.status(201).json({ message: 'Withdrawal request created', id: this.lastID });
      });
    });
  },

  // Get user withdrawals
  getWithdrawals: (req, res) => {
    const userId = req.user.id;

    db.all(`
      SELECT w.*, u.username
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId], (err, withdrawals) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch withdrawals' });
      }

      res.json({ withdrawals });
    });
  },

  // Get all withdrawals (admin)
  getAllWithdrawals: (req, res) => {
    db.all(`
      SELECT w.*, u.username
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `, (err, withdrawals) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch withdrawals' });
      }

      res.json({ withdrawals });
    });
  },

  // Process withdrawal (admin)
  processWithdrawal: (req, res) => {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.get('SELECT * FROM withdrawals WHERE id = ?', [id], (err, withdrawal) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal not found' });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).json({ error: 'Withdrawal already processed' });
      }

      db.run(`
        UPDATE withdrawals SET status = ?, admin_notes = ?, processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, admin_notes, id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to process withdrawal' });
        }

        // If approved, move from pending to total_earned
        if (status === 'approved' || status === 'paid') {
          db.run(`
            UPDATE wallet SET pending_balance = pending_balance - ?, total_earned = total_earned + ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `, [withdrawal.amount, withdrawal.amount, withdrawal.user_id]);
        }

        // If rejected, return to available balance
        if (status === 'rejected') {
          db.run(`
            UPDATE wallet SET pending_balance = pending_balance - ?, available_balance = available_balance + ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `, [withdrawal.amount, withdrawal.amount, withdrawal.user_id]);
        }

        res.json({ message: 'Withdrawal processed successfully' });
      });
    });
  }
};

module.exports = marketplaceAdvancedController;
