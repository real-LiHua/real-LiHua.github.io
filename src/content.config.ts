import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const topicSchema = z.object({
  slug: z.string().regex(slugPattern),
  name: z.string(),
});
const seriesSchema = z.object({
  id: z.string().regex(slugPattern),
  title: z.string(),
  order: z.number().int().positive(),
});

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    readingTime: z.string(),
    isPreview: z.boolean().default(true),
    topics: z.array(topicSchema).default([]),
    series: seriesSchema.optional(),
  }),
});

export const collections = { posts };
