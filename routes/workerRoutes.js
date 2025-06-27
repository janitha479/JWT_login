const express = require("express");
const router = express.Router();
const {
  verifyAccessToken,
  allowRoles,
} = require("../middleware/authMiddleware");

router.use(verifyAccessToken, allowRoles("worker"));

router.get("/jobs", (req, res) => {
  res.json({ message: "List of assigned jobs" });
});

module.exports = router;
