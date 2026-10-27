import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

// bcrypt only uses the first 72 bytes, so cap the length there.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: "Password must contain at least one letter and one number",
  });

const nameSchema = z.string().trim().min(1, "Required").max(50);

// `.strict()` rejects unexpected keys such as `role`, so clients cannot
// attempt privilege escalation through registration.
export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyOtpSchema = z
  .object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  })
  .strict();

export const sendOtpSchema = z.object({ email: emailSchema }).strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required").max(72),
  })
  .strict();
