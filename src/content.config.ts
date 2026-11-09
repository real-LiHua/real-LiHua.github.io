// Astro Content Collections — runtime validation for blog posts.
//
// Draft isolation is path-based: anything under `src/posts/drafts/` is a draft
// and is filtered out of production builds by `src/utils/content.ts` (see
// docs/adr/0002-draft-isolation-submodule.md). The schema here must stay in sync
// with `src/modules/types.ts`.

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Input ceilings — defence in depth (docs/SECURITY_WHITEPAPER.md §4.2). Content
// is authored in-repo, so these are not the site's security boundary; they only
// keep a malformed post (or a runaway generator) from bloating the rendered
// HTML, the OG metadata and the search index. Keep in sync with types.ts.
const LIMITS = {
  title: 200,
  description: 500,
  image: 2048,
  tag: 50,
  tags: 20,
  author: 100,
  authors: 10,
  groupId: 64,
  groupName: 200,
  customMessage: 1000,
} as const;

const stringSchema = z.string();
const tagArray = z.array(stringSchema.max(LIMITS.tag)).max(LIMITS.tags);
const authorArray = z.array(stringSchema.max(LIMITS.author)).max(LIMITS.authors);

const telegramAuthSchema = z
  .object({
    enabled: z.boolean(),
    groupId: z.string().max(LIMITS.groupId),
    groupName: z.string().max(LIMITS.groupName).optional(),
    customMessage: z.string().max(LIMITS.customMessage).optional(),
  })
  .optional();

const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    authors: authorArray.optional(),
    description: z.string().max(LIMITS.description).optional().nullable(),
    image: z.string().max(LIMITS.image).optional(),
    publishDate: z.coerce.date().optional(),
    tags: tagArray.optional(),
    telegramAuth: telegramAuthSchema,
    title: z.coerce.string().max(LIMITS.title),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
