const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const generateAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });

exports.register = async (req, res) => {
  const { email, phone, password, roleName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Find role by name (default to 'user')
    const role = await prisma.role.findUnique({
      where: { name: roleName?.toLowerCase() || "user" },
    });

    if (!role) {
      return res.status(400).json({ message: "Invalid role name" });
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        roleId: role.id,
      },
    });

    res
      .status(201)
      .json({ message: "User registered successfully", userId: newUser.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }, // include role for checking and returning
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Access Token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role.name }, // include role in token
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Refresh Token
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    // Set refresh token as HTTP-only cookie for web
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Detect client type
    const isMobile = req.headers["x-client-type"] === "mobile";

    // Return access token and (optionally) refresh token
    const response = {
      message: "Login successful",
      accessToken,
      role: user.role.name,
    };
    if (isMobile) {
      response.refreshToken = refreshToken;
    }

    res.status(200).json(response);

    // Log the login activity based on web or mobile
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: isMobile ? "login (mobile)" : "login",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  // Try to get refresh token from cookie first (for web browsers)
  let refreshToken = req.cookies.refreshToken;

  // If not in cookie, check request body (for mobile apps)
  if (!refreshToken && req.body.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    // Verify the refresh token
    const userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Get user with role information
    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Generate new refresh token (rotation)
    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    // Set new refresh token as HTTP-only cookie (for web browsers)
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return both tokens (access token in body, refresh token in both cookie and body)
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // Include for mobile apps
      role: user.role.name,
    });
  } catch (err) {
    console.error("Refresh Token Error:", err);
    return res.status(403).json({
      message: "Invalid or expired refresh token",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "No active session found",
        status: "error",
      });
    }

    // Verify the refresh token is valid before logging out
    try {
      const userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userData.id },
      });

      if (user) {
        // Log the logout activity
        await prisma.userActivity.create({
          data: {
            userId: user.id,
            action: "logout",
          },
        });
      }
    } catch (tokenError) {
      // Token is invalid/expired, but we'll still clear the cookie
      console.log("Invalid token during logout:", tokenError.message);
    }

    // For web browsers - clear the HTTP-only cookie
    res.clearCookie("refreshToken");

    res.json({
      message: "Logged out successfully",
      status: "success",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Logout failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
