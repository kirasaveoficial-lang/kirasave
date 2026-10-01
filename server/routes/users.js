const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/:id', userController.getUserProfile);
router.get('/:id/saves', userController.getUserSaves);
router.get('/:id/favorites', userController.getUserFavorites);
router.get('/:id/downloads', userController.getUserDownloads);

// Protected routes - must come before /:id routes
router.put('/avatar', authenticateToken, userController.updateAvatar);
router.get('/me/notifications', authenticateToken, userController.getNotifications);
router.put('/notifications/:id/read', authenticateToken, userController.markNotificationRead);
router.put('/notifications/read-all', authenticateToken, userController.markAllNotificationsRead);
router.get('/me/search-history', authenticateToken, userController.getSearchHistory);
router.delete('/me/search-history', authenticateToken, userController.clearSearchHistory);

module.exports = router;
