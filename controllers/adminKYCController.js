const { PrismaClient } = require("@prisma/client");
const { validateKYCStatusUpdate } = require("../validation/kycValidation");
const prisma = new PrismaClient();

// Get all pending KYC submissions
const getPendingKYC = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || "PENDING";

    const kycSubmissions = await prisma.workerKYC.findMany({
      where: {
        verificationStatus: status,
      },
      select: {
        id: true,
        idType: true,
        idNumber: true,
        idExpiryDate: true,
        idFrontImageURL: true,
        idBackImageURL: true,
        selfieImageURL: true,
        addressProofURL: true,
        dateOfBirth: true,
        nationality: true,
        verificationStatus: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await prisma.workerKYC.count({
      where: {
        verificationStatus: status,
      },
    });

    res.status(200).json({
      message: `${status} KYC submissions retrieved`,
      data: kycSubmissions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get pending KYC error:", error);
    res.status(500).json({
      message: "An error occurred while retrieving KYC submissions",
    });
  }
};

// Get KYC details by ID
const getKYCById = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await prisma.workerKYC.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!kyc) {
      return res.status(404).json({
        message: "KYC submission not found",
      });
    }

    res.status(200).json({
      message: "KYC details retrieved",
      data: kyc,
    });
  } catch (error) {
    console.error("Get KYC by ID error:", error);
    res.status(500).json({
      message: "An error occurred while retrieving KYC details",
    });
  }
};

// Verify KYC
const verifyKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Validate input
    const validationResult = validateKYCStatusUpdate({
      verificationStatus: "VERIFIED",
    });

    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.errors,
      });
    }

    // Check if KYC exists
    const kyc = await prisma.workerKYC.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!kyc) {
      return res.status(404).json({
        message: "KYC submission not found",
      });
    }

    // Update KYC status
    const updatedKYC = await prisma.workerKYC.update({
      where: {
        id: parseInt(id),
      },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Log the activity
    await prisma.userActivity.create({
      data: {
        userId: adminId,
        action: `VERIFIED_KYC_${kyc.user.id}`,
      },
    });

    // TODO: Send notification to user about KYC verification

    res.status(200).json({
      message: "KYC verified successfully",
      data: {
        id: updatedKYC.id,
        status: updatedKYC.verificationStatus,
        verifiedAt: updatedKYC.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Verify KYC error:", error);
    res.status(500).json({
      message: "An error occurred while verifying KYC",
    });
  }
};

// Reject KYC
const rejectKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { rejectionReason } = req.body;

    // Validate input
    const validationResult = validateKYCStatusUpdate({
      verificationStatus: "REJECTED",
      rejectionReason,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.errors,
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    // Check if KYC exists
    const kyc = await prisma.workerKYC.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!kyc) {
      return res.status(404).json({
        message: "KYC submission not found",
      });
    }

    // Update KYC status
    const updatedKYC = await prisma.workerKYC.update({
      where: {
        id: parseInt(id),
      },
      data: {
        verificationStatus: "REJECTED",
        rejectionReason,
        verifiedAt: null,
      },
    });

    // Log the activity
    await prisma.userActivity.create({
      data: {
        userId: adminId,
        action: `REJECTED_KYC_${kyc.user.id}`,
      },
    });

    // TODO: Send notification to user about KYC rejection

    res.status(200).json({
      message: "KYC rejected",
      data: {
        id: updatedKYC.id,
        status: updatedKYC.verificationStatus,
        rejectionReason: updatedKYC.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Reject KYC error:", error);
    res.status(500).json({
      message: "An error occurred while rejecting KYC",
    });
  }
};

module.exports = {
  getPendingKYC,
  getKYCById,
  verifyKYC,
  rejectKYC,
};
