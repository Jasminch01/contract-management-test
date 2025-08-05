const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS URLs
});

// Alternative: Configure with direct values (not recommended for production)
// cloudinary.config({
//   cloud_name: 'your-cloud-name',
//   api_key: 'your-api-key',
//   api_secret: 'your-api-secret',
//   secure: true
// });

// Export for use in other modules
module.exports = cloudinary;
