const express = require('express');
const router = express.Router();
const adminMarketplaceController = require('../controllers/adminMarketplaceController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

// Dashboard
router.get('/dashboard', adminMarketplaceController.getDashboard);

// Products
router.get('/products/pending', adminMarketplaceController.getPendingProducts);
router.get('/products/all', adminMarketplaceController.getAllProducts);
router.put('/products/:id/approve', adminMarketplaceController.approveProduct);
router.put('/products/:id/reject', adminMarketplaceController.rejectProduct);
router.put('/products/:id/hide', adminMarketplaceController.hideProduct);
router.put('/products/:id/block', adminMarketplaceController.blockProduct);

// Orders
router.get('/orders', adminMarketplaceController.getAllOrders);
router.get('/orders/:id', adminMarketplaceController.getOrderDetails);
router.put('/orders/:id/status', adminMarketplaceController.updateOrderStatus);
router.put('/orders/:id/payment-status', adminMarketplaceController.updatePaymentStatus);

// Payments
router.get('/payments', adminMarketplaceController.getAllPayments);

module.exports = router;
