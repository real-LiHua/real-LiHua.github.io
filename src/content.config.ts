import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    readingTime: z.string(),
    isPreview: z.boolean().default(true),
    topics: z
      .array(
        z.object({
          slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          name: z.string(),
        }),
      )
      .default([]),
    series: z
      .object({
        id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        title: z.string(),
        order: z.number().int().positive(),
      })
      .optional(),
  }),
});

export const collections = { posts };
