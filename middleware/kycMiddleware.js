const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Middleware to check if a worker has verified KYC
const requireVerifiedKYC = async (req, res, next) => {
  try {
    // Check if the user is a worker
    if (req.user.role !== "worker") {
      return next(); // Skip KYC check for non-workers
    }

    // Check if the worker has verified KYC
    const kyc = await prisma.workerKYC.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!kyc) {
      return res.status(403).json({
        message:
          "KYC submission required. Please submit your identification documents.",
      });
    }

    if (kyc.verificationStatus !== "VERIFIED") {
      return res.status(403).json({
        message: `KYC ${kyc.verificationStatus.toLowerCase()}. ${
          kyc.verificationStatus === "PENDING"
            ? "Please wait for verification."
            : kyc.verificationStatus === "REJECTED"
            ? `Reason: ${kyc.rejectionReason || "Contact support for details."}`
            : "Your KYC has expired. Please resubmit."
        }`,
      });
    }

    // KYC is verified, proceed
    next();
  } catch (error) {
    console.error("KYC verification middleware error:", error);
    res.status(500).json({
      message: "An error occurred while checking verification status",
    });
  }
};

module.exports = {
  requireVerifiedKYC,
};
