const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/profile/:id', authController.getUserProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/password', authenticateToken, authController.changePassword);
router.put('/email', authenticateToken, authController.changeEmail);
router.post('/logout', authenticateToken, authController.logout);
router.post('/heartbeat', authenticateToken, authController.heartbeat);

module.exports = router;
