const express = require("express");
const router = express.Router();
const {
  verifyAccessToken,
  allowRoles,
} = require("../middleware/authMiddleware");
const { requireVerifiedKYC } = require("../middleware/kycMiddleware");
const workerKYCController = require("../controllers/workerKYCController");
const { kycUpload } = require("../config/cloudinary");

// Apply auth middleware to all worker routes
router.use(verifyAccessToken, allowRoles("worker"));

// KYC routes - don't require verified KYC
router.post(
  "/kyc",
  kycUpload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  workerKYCController.submitKYC
);
router.get("/kyc", workerKYCController.getKYCStatus);

// Protected routes - require verified KYC
router.use(requireVerifiedKYC);

router.get("/jobs", (req, res) => {
  res.json({ message: "List of assigned jobs" });
});

module.exports = router;
