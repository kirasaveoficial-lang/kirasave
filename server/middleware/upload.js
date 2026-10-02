const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  'public/uploads/saves',
  'public/uploads/images',
  'public/uploads/avatars'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
});

// WARNING: Render doesn't have persistent storage for local files
// Files uploaded will be lost on redeploy. Consider using cloud storage like:
// - AWS S3
// - Cloudinary
// - Render Disk (if available)
console.log('⚠️  WARNING: Local file uploads are not persistent on Render. Files will be lost on redeploy.');

// Storage configuration for save files
const saveStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/saves/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'save-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed'));
};

// File filter for save files - TEMPORARILY DISABLED FOR TESTING
const saveFilter = (req, file, cb) => {
  // Accept all files for now
  return cb(null, true);
};

// Upload middleware
const uploadSave = multer({
  storage: saveStorage,
  fileFilter: saveFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).single('saveFile');

const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).array('images', 10);

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
}).single('avatar');

const uploadSingleImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

module.exports = { uploadSave, uploadImages, uploadAvatar, uploadSingleImage };
