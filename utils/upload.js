export async function uploadImage(imagePath) {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "uploads", // Optional: organize uploads in folders
      resource_type: "auto", // Automatically detect file type
    });

    console.log("Upload successful:", result.secure_url);
    return result;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

// Generate a transformed URL
function getTransformedUrl(publicId) {
  return cloudinary.url(publicId, {
    width: 300,
    height: 200,
    crop: "fill",
    quality: "auto",
    format: "auto",
  });
}
