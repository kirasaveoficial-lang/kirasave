const express = require('express');
const router = express.Router();
const savesController = require('../controllers/savesController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', savesController.getAllSaves);
router.get('/games', savesController.getGames);
router.post('/games', authenticateToken, savesController.createGame);
router.get('/:id', savesController.getSaveById);
router.post('/', authenticateToken, savesController.createSave);
router.post('/:id/images', authenticateToken, savesController.uploadSaveImages);
router.put('/:id/image', authenticateToken, savesController.updateSaveImage);
router.delete('/:id/images/:imageId', authenticateToken, savesController.deleteSaveImage);
router.get('/:id/download', savesController.downloadSave); // Changed: no auth required for download
router.post('/:id/rate', authenticateToken, savesController.rateSave);
router.post('/:id/favorite', authenticateToken, savesController.toggleFavorite);
router.post('/:id/comments', authenticateToken, savesController.addComment);
router.post('/comments/:id/like', authenticateToken, savesController.likeComment);
router.delete('/comments/:id', authenticateToken, savesController.deleteComment);
router.put('/comments/:id', authenticateToken, savesController.editComment);

module.exports = router;
