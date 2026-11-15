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

// Preview sample posts live in `tests/fixtures/posts/` so the test suite has
// deterministic content. They MUST NOT be deployed: `src/content/posts/`
// (a git submodule in production) is the only content source in CI builds.
// GitHub Actions sets CI=true, so fixture routes never reach production.
const includeFixturePosts = !process.env.CI;
const postsBasePrefix = /^(?:src\/content\/posts|tests\/fixtures\/posts)\//u;

const posts = defineCollection({
  loader: glob({
    base: "./",
    pattern: includeFixturePosts
      ? ["src/content/posts/**/*.{md,mdx}", "tests/fixtures/posts/**/*.{md,mdx}"]
      : ["src/content/posts/**/*.{md,mdx}"],
    // Both directories share the flat slug scheme, so strip the directory
    // prefix to keep ids (and /posts/<slug>/ routes) identical to before.
    generateId: ({ entry }) => entry.replace(postsBasePrefix, "").replace(/\.mdx?$/u, ""),
  }),
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
