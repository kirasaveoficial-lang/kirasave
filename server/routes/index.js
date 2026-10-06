const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../config/database');

// Serve robots.txt
router.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/robots.txt'));
});

// Generate dynamic sitemap.xml
router.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://kirasave.online';

  // Fetch all approved saves from database
  db.all(`
    SELECT s.id, s.title, s.updated_at, g.name as game_name
    FROM saves s
    JOIN games g ON s.game_id = g.id
    WHERE s.status = 'approved'
    ORDER BY s.updated_at DESC
  `, (err, saves) => {
    if (err) {
      console.error('Error fetching saves for sitemap:', err);
      // Return basic sitemap even if database fails
      saves = [];
    }

    // Fetch all games/categories
    db.all('SELECT id, name, updated_at FROM games ORDER BY name', (err, games) => {
      if (err) {
        console.error('Error fetching games for sitemap:', err);
        games = [];
      }

      // Build sitemap XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // Homepage
      const now = new Date().toISOString().split('T')[0];
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';

      // All saves page
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/saves</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.9</priority>\n';
      xml += '  </url>\n';

      // Individual save pages
      saves.forEach(save => {
        const lastmod = save.updated_at ? new Date(save.updated_at).toISOString().split('T')[0] : now;
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/saves/${save.id}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      });

      // Game/category pages
      games.forEach(game => {
        const lastmod = game.updated_at ? new Date(game.updated_at).toISOString().split('T')[0] : now;
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/saves?game=${encodeURIComponent(game.name)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });

      xml += '</urlset>';

      // Set content type and send
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    });
  });
});

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

router.get('/marketplace', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/my-products', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/my-orders', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/seller-orders', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/sell', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/marketplace/wallet', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin/marketplace', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin/marketplace/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin/marketplace/orders', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin/marketplace/payments', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin/marketplace/withdrawals', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/admin/marketplace/coupons', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = router;
