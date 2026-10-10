import { z } from "zod";

export const toolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  insteadOf: z.string().min(1),
  hook: z.string().min(1),
  bullets: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  setupSteps: z.array(z.string()).optional(),
  details: z.string().optional(),
  setup: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  link: z.url(),
  repo: z.url(),
  logo: z.string().optional(),
  screenshot: z.string().optional(),
  screenshotType: z.enum(["landscape", "portrait"]).optional(),
});

export const categorySchema = z.object({
  label: z.string(),
  color: z.string(),
});

export const categoriesSchema = z.record(z.string(), categorySchema);

export const highlightSchema = z.object({
  word: z.string(),
  color: z.string().optional(),
});

export const postSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  intro: z.object({
    eyebrow: z.string(),
    headline: z.string(),
    subhead: z.string(),
    pills: z.array(z.string()).optional(),
    hl: highlightSchema.optional(),
  }),
  tools: z.array(z.string()).min(1),
  outro: z.object({
    headline: z.string(),
    subhead: z.string(),
  }),
  format: z.literal("deep-dive").optional(),
});

export const toolManifestSchema = z.object({
  tools: z.array(z.string()),
});

export const postManifestSchema = z.object({
  posts: z.array(z.string()),
});
