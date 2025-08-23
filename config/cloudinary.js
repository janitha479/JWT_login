const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup storage for KYC documents
const kycStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "kyc_documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    // Add public_id prefix to distinguish document types
    public_id: (req, file) => {
      const userId = req.user.id;
      const documentType = file.fieldname; // idFront, idBack, selfie, addressProof
      return `user_${userId}_${documentType}_${Date.now()}`;
    },
  },
});

// Create multer upload for KYC documents
const kycUpload = multer({
  storage: kycStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only images and PDFs
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPG, PNG and PDF files are allowed."
        ),
        false
      );
    }
  },
});

module.exports = {
  cloudinary,
  kycUpload,
};
