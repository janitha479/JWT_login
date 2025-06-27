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

    // Save refresh token to DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Optional: log login activity
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        action: "login",
      },
    });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      role: user.role.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(401).json({ message: "No token provided" });

  const session = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!session)
    return res.status(403).json({ message: "Invalid refresh token" });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, userData) => {
    if (err)
      return res.status(403).json({ message: "Expired or invalid token" });

    const newAccessToken = generateAccessToken({
      id: userData.id,
      role: userData.role,
    });
    res.json({ accessToken: newAccessToken });
  });
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Access token missing or malformed" });
    }

    const accessToken = authHeader.split(" ")[1];
    const decoded = jwt.decode(accessToken);

    if (!decoded || !decoded.id) {
      return res.status(400).json({ message: "Invalid access token" });
    }
    //Check the refresToken is in the table
    await prisma.refreshToken.findFirst({
      where: { userId: decoded.id, token: refreshToken },
    });
    if (!refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
    // Delete the refresh token from DB
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    // Log logout activity
    await prisma.userActivity.create({
      data: {
        userId: decoded.id, // Use decoded ID from token
        action: "logout",
      },
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
