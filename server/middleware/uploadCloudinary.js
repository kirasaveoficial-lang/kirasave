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

const uploadAvatarCloudinary = multer({ storage: avatarStorage }).single('avatar');
const uploadImagesCloudinary = multer({ storage: imageStorage }).array('images', 10);

module.exports = {
  uploadAvatarCloudinary,
  uploadImagesCloudinary
};
