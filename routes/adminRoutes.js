const express = require("express");
const router = express.Router();
const {
  verifyAccessToken,
  allowRoles,
} = require("../middleware/authMiddleware");

router.use(verifyAccessToken, allowRoles("admin"));

router.get("/users", (req, res) => {
  res.json({ message: "List of users" });
});

router.get("/stats", (req, res) => {
  res.json({ message: "Admin statistics" });
});

module.exports = router;
