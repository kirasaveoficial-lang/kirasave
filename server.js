const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./server/config/database');

// Start online status checker after database is initialized
// Temporarily disabled due to PostgreSQL migration issues
// setTimeout(() => {
//   require('./server/utils/onlineStatus');
// }, 2000);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render (fixes rate limiter warning)
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/', require('./server/routes/index'));
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/saves', require('./server/routes/saves'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api/tags', require('./server/routes/tags'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('=== ERROR ===');
  console.error('URL:', req.url);
  console.error('Method:', req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('=============');
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`KIRA SAVE server running on http://localhost:${PORT}`);
});
