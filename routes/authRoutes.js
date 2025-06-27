// This file defines the authentication routes for user registration, login, token refresh, and logout.
// It uses the authController to handle the logic for each route.

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
