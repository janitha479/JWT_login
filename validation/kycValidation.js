const { z } = require("zod");

// KYC submission schema
const kycSubmissionSchema = z.object({
  idType: z
    .string()
    .min(1, "ID type is required")
    .refine(
      (val) =>
        ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"].includes(
          val.toUpperCase()
        ),
      {
        message:
          "ID type must be one of: Passport, National ID, Driver's License",
      }
    ),
  idNumber: z
    .string()
    .min(3, "ID number must be at least 3 characters")
    .max(50, "ID number must be less than 50 characters"),
  idExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), {
      message: "ID must not be expired",
    })
    .optional()
    .nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .transform((val) => new Date(val))
    .refine(
      (date) => {
        const today = new Date();
        const eighteenYearsAgo = new Date(
          today.getFullYear() - 18,
          today.getMonth(),
          today.getDate()
        );
        return date <= eighteenYearsAgo;
      },
      { message: "You must be at least 18 years old" }
    )
    .optional()
    .nullable(),
  nationality: z
    .string()
    .min(2, "Nationality must be at least 2 characters")
    .max(50, "Nationality must be less than 50 characters")
    .optional()
    .nullable(),
});

// Function for validating KYC submissions
const validateKYCSubmission = (data) => {
  return kycSubmissionSchema.safeParse(data);
};

// Schema for KYC status updates by admin
const kycStatusUpdateSchema = z.object({
  verificationStatus: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().min(1).max(500).optional().nullable(),
});

// Function for validating KYC status updates
const validateKYCStatusUpdate = (data) => {
  return kycStatusUpdateSchema.safeParse(data);
};

module.exports = {
  validateKYCSubmission,
  validateKYCStatusUpdate,
};
