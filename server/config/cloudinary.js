const cloudinary = require('cloudinary').v2;

console.log('=== CLOUDINARY CONFIG ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
console.log('Cloudinary will be used:', !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
  secure: true
});

module.exports = cloudinary;
