const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Storage for avatar images
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kira-save/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'image',
    transformation: [
      { width: 200, height: 200, crop: 'fill' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      return `avatar-${timestamp}-${random}`;
    }
  }
});

// Storage for save images (thumbnails, game covers)
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kira-save/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'image',
    transformation: [
      { width: 800, height: 600, crop: 'limit' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      return `image-${timestamp}-${random}`;
    }
  }
});

// Storage for game cover images
const gameCoverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kira-save/game-covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'image',
    transformation: [
      { width: 400, height: 600, crop: 'limit' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      return `game-cover-${timestamp}-${random}`;
    }
  }
});

// Storage for product files (digital products)
const productFileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kira-save/product-files',
    allowed_formats: ['zip', 'rar', '7z', 'pdf', 'doc', 'docx'],
    resource_type: 'raw',
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const ext = file.originalname.split('.').pop();
      return `product-${timestamp}-${random}.${ext}`;
    }
  }
});

const uploadAvatarCloudinary = multer({ storage: avatarStorage }).single('avatar');
const uploadImagesCloudinary = multer({ storage: imageStorage }).array('images', 10);
const uploadCloudinary = multer({ storage: imageStorage }).single('image');
const uploadGameCoverCloudinary = multer({ storage: gameCoverStorage }).single('image');
const uploadProductFileCloudinary = multer({ storage: productFileStorage }).single('file');

module.exports = {
  uploadAvatarCloudinary,
  uploadImagesCloudinary,
  uploadCloudinary,
  uploadGameCoverCloudinary,
  uploadProductFileCloudinary
};
