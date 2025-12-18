// app/admin/videos/_components/uploadForm/formSchema.ts
import * as z from "zod"

export const formSchema = z.object({
  title: z
    .string()
    .min(5, "Video title must be at least 5 characters.")
    .max(200, "Video title must be at most 200 characters."),
  
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(2000, "Description must be at most 2000 characters."),
  
  category: z
    .string()
    .min(1, "Please select a category."),
  
  // duration: z
  //   .string()
  //   .optional()
  //   .refine(
  //     (val) => !val || /^(\d+h\s?)?(\d+m)?$/.test(val),
  //     "Duration format should be like '2h 15m' or '90m'"
  //   ),
  
  ageRating: z
    .string()
    .optional(),
  
  director: z
    .string()
    .max(200, "Director name must be at most 200 characters.")
    .optional(),
  
  cast: z
    .string()
    .max(500, "Cast list must be at most 500 characters.")
    .optional(),
  
  releaseDate: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      "Invalid date format"
    ),
  
  status: z.enum(['draft', 'published', 'scheduled']),
  
  tags: z
    .array(z.string())
    .max(10, "Maximum 10 tags allowed.")
    .optional()
})

export type VideoFormData = z.infer<typeof formSchema>