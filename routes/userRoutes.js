const express = require("express");
const router = express.Router();
const {
  verifyAccessToken,
  allowRoles,
} = require("../middleware/authMiddleware");

// Apply middleware to ALL routes in this file
router.use(verifyAccessToken, allowRoles("user"));

// Now you can define multiple user-protected routes:
router.get("/profile", (req, res) => {
  res.json({ message: `User Profile: ${req.user.email}` });
});

router.get("/dashboard", (req, res) => {
  res.json({ message: "Welcome to your dashboard" });
});

router.post("/book-service", (req, res) => {
  res.json({ message: "Service booked successfully" });
});

module.exports = router;
