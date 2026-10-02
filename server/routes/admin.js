const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../config/database');

// TEMPORARY: Promote user to admin (remove after first admin is set)
router.post('/promote/:username', (req, res) => {
  const { username } = req.params;

  db.run(
    'UPDATE users SET is_admin = TRUE WHERE username = ?',
    [username],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to promote user' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: `User "${username}" promoted to admin successfully` });
    }
  );
});

router.get('/dashboard', authenticateToken, requireAdmin, adminController.getDashboardStats);
router.get('/saves/pending', authenticateToken, requireAdmin, adminController.getPendingSaves);
router.get('/saves/:id/download', authenticateToken, requireAdmin, adminController.downloadPendingSave);
router.put('/saves/:id/approve', authenticateToken, requireAdmin, adminController.approveSave);
router.put('/saves/:id/reject', authenticateToken, requireAdmin, adminController.rejectSave);
router.delete('/saves/:id', authenticateToken, requireAdmin, adminController.deleteSave);
router.get('/reports', authenticateToken, requireAdmin, adminController.getReports);
router.put('/reports/:id/resolve', authenticateToken, requireAdmin, adminController.resolveReport);
router.get('/users', authenticateToken, requireAdmin, adminController.getUsers);
router.put('/users/:id/ban', authenticateToken, requireAdmin, adminController.banUser);
router.put('/users/:id/unban', authenticateToken, requireAdmin, adminController.unbanUser);
router.get('/activity-logs', authenticateToken, requireAdmin, adminController.getActivityLogs);

// Games management
router.get('/games', authenticateToken, requireAdmin, adminController.getGames);
router.post('/games', authenticateToken, requireAdmin, adminController.createGame);
router.put('/games/:id', authenticateToken, requireAdmin, adminController.updateGame);
router.delete('/games/:id', authenticateToken, requireAdmin, adminController.deleteGame);

// All saves management
router.get('/saves/all', authenticateToken, requireAdmin, adminController.getAllSaves);

// Warning system
router.post('/warnings', authenticateToken, requireAdmin, adminController.giveWarning);
router.get('/warnings', authenticateToken, requireAdmin, adminController.getAllWarnings);
router.get('/warnings/user/:user_id', authenticateToken, requireAdmin, adminController.getUserWarnings);
router.delete('/warnings/:id', authenticateToken, requireAdmin, adminController.deleteWarning);

// Banned users management
router.get('/users/banned', authenticateToken, requireAdmin, adminController.getBannedUsers);
router.get('/users/:id/ban-details', authenticateToken, requireAdmin, adminController.getUserBanDetails);
router.put('/users/:id/unban', authenticateToken, requireAdmin, adminController.unbanUser);

// User tags management
router.post('/users/:id/tags', authenticateToken, requireAdmin, adminController.assignUserTag);
router.delete('/users/:id/tags/:tagId', authenticateToken, requireAdmin, adminController.removeUserTag);

module.exports = router;
