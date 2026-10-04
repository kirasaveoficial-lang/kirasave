const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../config/database');

// Get real statistics for homepage
router.get('/api/stats', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  let activeUsersQuery;
  if (isProduction) {
    // PostgreSQL syntax
    activeUsersQuery = `(SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '30 minutes') as active_users`;
  } else {
    // SQLite syntax
    activeUsersQuery = `(SELECT COUNT(*) FROM users WHERE datetime(last_seen) > datetime('now', '-30 minutes')) as active_users`;
  }

  db.get(`
    SELECT
      (SELECT COUNT(*) FROM saves WHERE status = 'approved') as total_saves,
      ${activeUsersQuery},
      (SELECT COUNT(*) FROM downloads) as total_downloads
  `, (err, stats) => {
    if (err) {
      console.error('Error fetching stats:', err);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
    res.json(stats);
  });
});

// Serve the main HTML file for all routes (SPA-like behavior)
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/saves', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/saves/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/profile/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = router;
