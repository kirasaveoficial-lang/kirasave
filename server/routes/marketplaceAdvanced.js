const express = require('express');
const router = express.Router();
const marketplaceAdvancedController = require('../controllers/marketplaceAdvancedController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ===== REVIEWS =====
router.post('/reviews', authenticateToken, marketplaceAdvancedController.createReview);
router.get('/reviews/:product_id', marketplaceAdvancedController.getProductReviews);

// ===== COUPONS =====
router.post('/coupons', authenticateToken, requireAdmin, marketplaceAdvancedController.createCoupon);
router.get('/coupons/validate/:code', marketplaceAdvancedController.validateCoupon);
router.post('/coupons/apply', authenticateToken, marketplaceAdvancedController.applyCoupon);
router.get('/coupons', authenticateToken, requireAdmin, marketplaceAdvancedController.listCoupons);

// ===== WALLET =====
router.get('/wallet', authenticateToken, marketplaceAdvancedController.getWallet);
router.get('/wallet/transactions', authenticateToken, marketplaceAdvancedController.getWalletTransactions);
router.post('/wallet/add-funds', authenticateToken, requireAdmin, marketplaceAdvancedController.addFunds);

// ===== WITHDRAWALS =====
router.post('/withdrawals', authenticateToken, marketplaceAdvancedController.createWithdrawal);
router.get('/withdrawals', authenticateToken, marketplaceAdvancedController.getWithdrawals);
router.get('/withdrawals/all', authenticateToken, requireAdmin, marketplaceAdvancedController.getAllWithdrawals);
router.put('/withdrawals/:id', authenticateToken, requireAdmin, marketplaceAdvancedController.processWithdrawal);

module.exports = router;
