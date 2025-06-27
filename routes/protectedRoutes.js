const express = require("express");
const router = express.Router();
const {
  verifyAccessToken,
  allowRoles,
} = require("../middleware/authMiddleware");

router.get("/user-page", verifyAccessToken, allowRoles("user"), (req, res) => {
  res.json({ message: `Welcome User: ${req.user.email}` });
});

router.get(
  "/admin-page",
  verifyAccessToken,
  allowRoles("admin"),
  (req, res) => {
    res.json({ message: `Welcome Admin: ${req.user.email}` });
  }
);

router.get(
  "/worker-page",
  verifyAccessToken,
  allowRoles("worker"),
  (req, res) => {
    res.json({ message: `Welcome Worker: ${req.user.email}` });
  }
);

module.exports = router;
