const express = require('express');
const router = express.Router();
const path = require('path');

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
