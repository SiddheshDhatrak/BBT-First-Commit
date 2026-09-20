const { z } = require('zod');

const emailSchema = z.string().email().max(255).transform(v => v.trim().toLowerCase());
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().min(2).max(100).transform(v => v.trim());

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(['DONOR', 'NGO', 'VENDOR', 'FIELD', 'GOVT']).default('DONOR'),
  organizationId: z.string().uuid().optional(),
  invitationToken: z.string().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().max(128),
});

const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().length(6).regex(/^\d+$/),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().length(6).regex(/^\d+$/),
  newPassword: passwordSchema,
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const resendVerificationSchema = z.object({
  email: emailSchema,
});

const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['FIELD', 'GOVT']),
  sendEmail: z.boolean().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  inviteSchema,
};