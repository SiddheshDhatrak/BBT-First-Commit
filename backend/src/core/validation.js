const { z } = require('zod');
const { badRequest } = require('./errors');

function validate(schema, source) {
  // Pipeline step for withRole(): validates ctx[source] and resolves to a
  // marker carrying the parsed payload. withRole() unwraps the marker so the
  // next step in the chain sees validated data. Never mount this directly as
  // a route handler — use withValidation() for single-handler routes.
  return async ctx => {
    const data = ctx[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      const details = result.error.flatten();
      throw badRequest(`Invalid ${source}`, details);
    }
    return { __validated: { source, data: result.data } };
  };
}

// Single-handler composition for routers that accept one handler fn
// (e.g. backend/src/modules/auth/routes.js).
function withValidation(schema, source, handler) {
  return async ctx => {
    const result = schema.safeParse(ctx[source]);
    if (!result.success) {
      const details = result.error.flatten();
      throw badRequest(`Invalid ${source}`, details);
    }
    return handler({ ...ctx, [source]: result.data });
  };
}

const commonSchemas = {
  uuid: z.string().uuid({ message: 'Must be a valid UUID' }),
  positiveInt: z.number().int().positive({ message: 'Must be a positive integer' }),
  nonNegativeInt: z.number().int().nonnegative({ message: 'Must be a non-negative integer' }),
  positiveNumber: z.number().positive({ message: 'Must be a positive number' }),
  nonNegativeNumber: z.number().nonnegative({ message: 'Must be a non-negative number' }),
  isoDate: z.string().datetime({ message: 'Must be a valid ISO 8601 date' }),
  sha256Hash: z.string().regex(/^sha256:[a-f0-9]{64}$/i, { message: 'Must be a sha256 hash' }),
  phash: z.string().regex(/^phash:[a-f0-9]+$/i, { message: 'Must be a perceptual hash' }),
  dhash: z.string().regex(/^dhash:[01]{64}$/i, { message: 'Must be a dhash' }),
  email: z.string().email({ message: 'Must be a valid email' }),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, {
      message: 'Must be a valid GSTIN',
    })
    .optional(),
  darpanId: z.string().optional(),
};

const disasterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['FLOOD', 'CYCLONE', 'EARTHQUAKE', 'DROUGHT', 'LANDSLIDE', 'OTHER']).optional(),
  state: z.string().optional(),
  district: z.string().min(1),
  declaredAt: commonSchemas.isoDate.optional(),
  deliveryPolicy: z
    .object({
      proofDeadlineHours: z.number().int().positive().optional(),
      randomAuditRate: z.number().min(0).max(1).optional(),
      allowedBounds: z
        .object({
          minLat: z.number().min(-90).max(90),
          maxLat: z.number().min(-90).max(90),
          minLng: z.number().min(-180).max(180),
          maxLng: z.number().min(-180).max(180),
        })
        .optional(),
    })
    .optional(),
});

const campaignSchema = z.object({
  disasterId: commonSchemas.uuid,
  name: z.string().min(1).optional(),
  targetAmount: commonSchemas.positiveNumber,
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

const donationSchema = z.object({
  amount: commonSchemas.positiveNumber,
  method: z.enum(['UPI', 'NEFT', 'RTGS', 'IMPS', 'SIMULATED_UPI', 'SIMULATED']).optional(),
});

const allocationSchema = z.object({
  campaignId: commonSchemas.uuid,
  organizationId: commonSchemas.uuid,
  amount: commonSchemas.positiveNumber,
});

const organizationSchema = z.object({
  name: z.string().min(1),
  darpanId: commonSchemas.darpanId,
  gstin: commonSchemas.gstin,
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
});

const programSchema = z.object({
  organizationId: commonSchemas.uuid,
  campaignId: commonSchemas.uuid,
  name: z.string().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const budgetSchema = z.object({
  programId: commonSchemas.uuid,
  category: z.string().min(1),
  capAmount: commonSchemas.positiveNumber,
  totalAmount: commonSchemas.positiveNumber.optional(),
});

const vendorSchema = z.object({
  name: z.string().min(1),
  gstin: commonSchemas.gstin,
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).optional(),
});

const vendorBankAccountSchema = z.object({
  accountNumberHash: z.string().min(1),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, { message: 'Must be a valid IFSC code' }),
  isActive: z.boolean().optional(),
});

const purchaseOrderSchema = z.object({
  programId: commonSchemas.uuid,
  vendorId: commonSchemas.uuid,
  amount: commonSchemas.positiveNumber,
  quantity: commonSchemas.positiveInt,
  category: z.string().min(1),
  status: z.enum(['APPROVED', 'PENDING', 'CANCELLED']).optional(),
});

const invoiceSchema = z.object({
  purchaseOrderId: commonSchemas.uuid,
  invoiceNumber: z.string().min(1),
  amount: commonSchemas.positiveNumber,
  fileKey: z.string().min(1),
  invoiceHash: z.string().optional(),
  ocrJson: z.record(z.unknown()).optional(),
});

const expenseSchema = z.object({
  invoiceId: commonSchemas.uuid,
  budgetCategoryId: commonSchemas.uuid,
});

const paymentSchema = z.object({
  expenseId: commonSchemas.uuid,
  toAccountLast4: z.string().regex(/^\d{4}$/),
});

const beneficiarySchema = z.object({
  programId: commonSchemas.uuid,
  householdHash: commonSchemas.sha256Hash,
  phoneHash: commonSchemas.sha256Hash.optional(),
  district: z.string().min(1),
});

const distributionSchema = z.object({
  expenseId: commonSchemas.uuid,
  beneficiaryId: commonSchemas.uuid,
  quantity: commonSchemas.positiveInt,
  status: z.enum(['DELIVERED', 'ACKNOWLEDGED', 'PENDING']).optional(),
  distributedAt: commonSchemas.isoDate.optional(),
});

const proofSchema = z.object({
  fileKey: z.string().min(1),
  photoHash: z.string().min(1),
  gpsLat: z.number().min(-90).max(90),
  gpsLng: z.number().min(-180).max(180),
  capturedAt: commonSchemas.isoDate,
  dHash: z.string().optional(),
});

const confirmSchema = z.object({
  confirmationTokenHash: z.string().min(1),
  channel: z.enum(['MOCK_SMS', 'WHATSAPP', 'IVR', 'IN_PERSON']).optional(),
});

const communityDisputeSchema = z.object({
  distributionId: commonSchemas.uuid,
  description: z.string().min(1),
});

const fraudAlertResolveSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED', 'ESCALATED']),
  reason: z.string().min(1),
});

const fieldAuditSampleSchema = z.object({
  expenseId: commonSchemas.uuid,
  rate: z.number().min(0).max(1).optional(),
});

const fieldAuditResultSchema = z.object({
  result: z.enum(['CONFIRMED', 'DISCREPANCY', 'FRAUD_CONFIRMED']),
  notes: z.string().optional(),
});

const aiAuditSchema = z.object({
  expenseId: commonSchemas.uuid,
  question: z.string().min(1).optional(),
});

const verificationInvoiceSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().optional(),
  invoiceHash: z.string().optional(),
});

const verificationProofSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  capturedAt: commonSchemas.isoDate.optional(),
});

const s3SignedUrlSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  operation: z.enum(['putObject', 'getObject']).optional(),
  expiresIn: z.number().int().positive().max(604800).optional(),
});

module.exports = {
  validate,
  withValidation,
  commonSchemas,
  disasterSchema,
  campaignSchema,
  donationSchema,
  allocationSchema,
  organizationSchema,
  programSchema,
  budgetSchema,
  vendorSchema,
  vendorBankAccountSchema,
  purchaseOrderSchema,
  invoiceSchema,
  expenseSchema,
  paymentSchema,
  beneficiarySchema,
  distributionSchema,
  proofSchema,
  confirmSchema,
  communityDisputeSchema,
  fraudAlertResolveSchema,
  fieldAuditSampleSchema,
  fieldAuditResultSchema,
  aiAuditSchema,
  verificationInvoiceSchema,
  verificationProofSchema,
  s3SignedUrlSchema,
};
