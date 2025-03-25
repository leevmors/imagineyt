import * as z from "zod";

export const youtubeFormSchema = z.object({
  videoUrl: z
    .string()
    .min(1, "YouTube URL is required")
    .refine(
      (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        return regExp.test(url);
      },
      {
        message: "Invalid YouTube URL",
      }
    ),
}); 