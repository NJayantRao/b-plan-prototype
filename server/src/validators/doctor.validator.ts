import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

// Verification fields are deliberately absent: doctors can never set them.
export const updateDoctorProfileSchema = z
  .object({
    specialties: z.array(text(100)).max(10).optional(),
    qualifications: z
      .array(
        z
          .object({
            degree: text(100),
            institution: text(200).optional(),
            year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    licenseNumber: text(50).optional(),
    registrationCouncil: text(100).optional(),
    yearsOfExperience: z.number().int().min(0).max(70).optional(),
    bio: text(1000).optional(),
    consultationFee: z.number().min(0).max(100_000).optional(),
  })
  .strict();

export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
