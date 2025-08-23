const express = require("express");
const router = express.Router();
const {
  verifyAccessToken,
  allowRoles,
} = require("../middleware/authMiddleware");
const adminKYCController = require("../controllers/adminKYCController");

router.use(verifyAccessToken, allowRoles("admin"));

// General admin routes
router.get("/users", (req, res) => {
  res.json({ message: "List of users" });
});

router.get("/stats", (req, res) => {
  res.json({ message: "Admin statistics" });
});

// KYC management routes
router.get("/kyc", adminKYCController.getPendingKYC);
router.get("/kyc/:id", adminKYCController.getKYCById);
router.put("/kyc/:id/verify", adminKYCController.verifyKYC);
router.put("/kyc/:id/reject", adminKYCController.rejectKYC);

module.exports = router;
