import { z } from "zod";

export const canvasNoteAccentOptions = [
  "neutral",
  "brass",
  "green",
  "vermillion",
] as const;

export type CanvasNoteAccent = (typeof canvasNoteAccentOptions)[number];

export const canvasNoteConfigSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2_000),
  accent: z.enum(canvasNoteAccentOptions),
  showTitle: z.boolean(),
});

export type CanvasNoteConfig = z.infer<typeof canvasNoteConfigSchema>;

export const defaultCanvasNoteConfig: CanvasNoteConfig =
  canvasNoteConfigSchema.parse({
    title: "画布便签",
    body: "记录这片画布区域的上下文、假设或检查清单。",
    accent: "brass",
    showTitle: true,
  });
