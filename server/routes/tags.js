const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tagsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public: Get all tags
router.get('/', tagsController.getAllTags);

// Public: Get user tags
router.get('/user/:user_id', tagsController.getUserTags);

// Admin: Create tag
router.post('/', authenticateToken, requireAdmin, tagsController.createTag);

// Admin: Update tag
router.put('/:id', authenticateToken, requireAdmin, tagsController.updateTag);

// Admin: Delete tag
router.delete('/:id', authenticateToken, requireAdmin, tagsController.deleteTag);

// Admin: Assign tag to user
router.post('/assign', authenticateToken, requireAdmin, tagsController.assignTagToUser);

// Admin: Remove tag from user
router.delete('/user/:user_id/tag/:tag_id', authenticateToken, requireAdmin, tagsController.removeTagFromUser);

module.exports = router;
