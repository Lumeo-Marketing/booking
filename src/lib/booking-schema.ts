import { z } from "zod";

export const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

export const zipValidationSchema = z.object({
  zip: z.string().trim().regex(ZIP_PATTERN, "Enter a valid US ZIP code"),
});

export const bookingSubmissionSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((phone) => phone.replace(/\D/g, "").length >= 7, "Enter a valid phone number"),
  services: z
    .array(z.string().trim().min(1).max(80))
    .min(1)
    .max(8)
    .refine((services) => new Set(services).size === services.length, "Duplicate services"),
  selectedSlot: z
    .string()
    .datetime({ offset: true })
    .refine((slot) => new Date(slot).getTime() > Date.now() - 60_000, "Select a future time"),
  timezone: z.string().trim().min(1).max(80),
  contactPref: z.enum(["Phone", "Email", "Text Message"]),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, "Use the two-letter state code"),
  zip: zipValidationSchema.shape.zip,
  notes: z.string().trim().max(2_000),
  submissionId: z.string().uuid(),
  page: z.object({
    url: z.string().max(2_000),
    title: z.string().max(300),
    path: z.string().max(1_000),
    userAgent: z.string().max(1_000),
  }),
});

export type BookingSubmission = z.infer<typeof bookingSubmissionSchema>;
