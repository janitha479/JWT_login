const { PrismaClient } = require("@prisma/client");
const { validateKYCSubmission } = require("../validation/kycValidation");
const prisma = new PrismaClient();

// Submit KYC documents
const submitKYC = async (req, res) => {
  try {
    const { id: userId } = req.user;

    // Validate input data
    const validationResult = validateKYCSubmission(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    // Prepare KYC data from request body
    const { idType, idNumber, idExpiryDate, dateOfBirth, nationality } =
      validationResult.data;

    // Extract file URLs
    const idFrontImageURL = req.files?.idFront?.[0]?.path;
    const idBackImageURL = req.files?.idBack?.[0]?.path;
    const selfieImageURL = req.files?.selfie?.[0]?.path;
    const addressProofURL = req.files?.addressProof?.[0]?.path;

    // Check if at least the ID front and selfie are provided
    if (!idFrontImageURL || !selfieImageURL) {
      return res.status(400).json({
        message:
          "Missing required documents. ID front and selfie are required.",
      });
    }

    // Check if user already has KYC record
    const existingKYC = await prisma.workerKYC.findUnique({
      where: { userId },
    });

    let kyc;

    if (existingKYC) {
      // Update existing KYC
      kyc = await prisma.workerKYC.update({
        where: { userId },
        data: {
          idType,
          idNumber,
          idExpiryDate,
          idFrontImageURL: idFrontImageURL || existingKYC.idFrontImageURL,
          idBackImageURL: idBackImageURL || existingKYC.idBackImageURL,
          selfieImageURL: selfieImageURL || existingKYC.selfieImageURL,
          addressProofURL: addressProofURL || existingKYC.addressProofURL,
          dateOfBirth,
          nationality,
          verificationStatus: "PENDING", // Reset to pending on update
          verifiedAt: null,
          rejectionReason: null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new KYC record
      kyc = await prisma.workerKYC.create({
        data: {
          userId,
          idType,
          idNumber,
          idExpiryDate,
          idFrontImageURL,
          idBackImageURL,
          selfieImageURL,
          addressProofURL,
          dateOfBirth,
          nationality,
          verificationStatus: "PENDING",
        },
      });
    }

    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        action: existingKYC ? "KYC_UPDATED" : "KYC_SUBMITTED",
      },
    });

    res.status(200).json({
      message: "KYC documents submitted successfully. Verification pending.",
      data: {
        id: kyc.id,
        status: kyc.verificationStatus,
        submittedAt: kyc.createdAt,
      },
    });
  } catch (error) {
    console.error("KYC submission error:", error);
    res.status(500).json({
      message: "An error occurred while processing your KYC submission",
    });
  }
};

// Get KYC status for current user
const getKYCStatus = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const kyc = await prisma.workerKYC.findUnique({
      where: { userId },
      select: {
        id: true,
        verificationStatus: true,
        verifiedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!kyc) {
      return res.status(404).json({
        message: "No KYC submission found",
        status: "NOT_SUBMITTED",
      });
    }

    res.status(200).json({
      message: `KYC status: ${kyc.verificationStatus}`,
      data: kyc,
    });
  } catch (error) {
    console.error("Get KYC status error:", error);
    res.status(500).json({
      message: "An error occurred while retrieving KYC status",
    });
  }
};

module.exports = {
  submitKYC,
  getKYCStatus,
};
