const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/products', marketplaceController.getAllProducts);
router.get('/products/:id', marketplaceController.getProductById);

// Seller routes (require authentication)
router.post('/products', authenticateToken, marketplaceController.createProduct);
router.get('/my-products', authenticateToken, marketplaceController.getSellerProducts);
router.put('/products/:id', authenticateToken, marketplaceController.updateProduct);
router.delete('/products/:id', authenticateToken, marketplaceController.deleteProduct);

// Cart routes
router.get('/cart', authenticateToken, marketplaceController.getCart);
router.post('/cart', authenticateToken, marketplaceController.addToCart);
router.delete('/cart/:product_id', authenticateToken, marketplaceController.removeFromCart);

// Order routes
router.post('/orders', authenticateToken, marketplaceController.createOrder);
router.get('/my-orders', authenticateToken, marketplaceController.getBuyerOrders);
router.get('/seller-orders', authenticateToken, marketplaceController.getSellerOrders);

// Download route
router.get('/products/:id/download', authenticateToken, marketplaceController.downloadProduct);

module.exports = router;
