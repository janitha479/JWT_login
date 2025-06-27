const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Verify JWT access token
exports.verifyAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access token missing" });

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, async (err, decoded) => {
    if (err)
      return res.status(403).json({ message: "Invalid or expired token" });

    // Attach user info
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user has any valid refresh tokens
    const hasRefreshToken = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    if (!hasRefreshToken) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    req.user = user;
    next();
  });
};

// Role guard middleware
exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role.name.toLowerCase();
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }
    next();
  };
};
