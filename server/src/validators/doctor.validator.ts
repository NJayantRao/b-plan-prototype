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
    weeklyAvailability: z
      .array(
        z
          .object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
            endTime: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
          })
          .strict()
          .refine((slot) => slot.endTime > slot.startTime, {
            message: "End time must be after start time",
            path: ["endTime"],
          }),
      )
      .max(21)
      .optional(),
  })
  .strict()
  .refine(
    (profile) => {
      if (!profile.weeklyAvailability) return true;
      const slots = [...profile.weeklyAvailability].sort((a, b) =>
        a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
      );
      return slots.every((slot, index) =>
        index === 0 ||
        slots[index - 1]?.dayOfWeek !== slot.dayOfWeek ||
        slots[index - 1]!.endTime <= slot.startTime,
      );
    },
    { message: "Availability slots for the same day cannot overlap", path: ["weeklyAvailability"] },
  );

export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
