import { z } from "zod";

// These mirror the API's rules (server docs/api.md) for instant feedback. The
// server remains the authority and its errors are shown too.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const passwordRules = [
  { id: "length", label: "8–72 characters", test: (v: string) => v.length >= 8 && v.length <= 72 },
  { id: "letter", label: "A letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "A number", test: (v: string) => /\d/.test(v) },
] as const;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: "Password must contain at least one letter and one number",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});
export type LoginValues = z.infer<typeof loginSchema>;

const nameSchema = z.string().trim().min(1, "Required").max(50, "Too long");

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;
