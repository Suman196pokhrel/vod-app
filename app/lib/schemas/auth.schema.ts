// lib/schemas/auth.schema.ts
import * as z from 'zod';

/**
 * Password validation schema
 * Reusable across all forms
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * OTP code validation schema
 */
export const otpCodeSchema = z
  .string()
  .length(6, 'Code must be exactly 6 digits')
  .regex(/^\d+$/, 'Code must only contain numbers');

/**
 * Reset Password Form Schema
 */
export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: otpCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;