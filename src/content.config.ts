// Astro Content Collections — runtime validation for blog posts.
//
// Draft isolation is path-based: anything under `src/posts/drafts/` is a draft
// and is filtered out of production builds by `src/utils/content.ts` (see
// docs/adr/0002-draft-isolation-submodule.md). The schema here must stay in sync
// with `src/modules/types.ts`.

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const stringSchema = z.string();
const tagArray = z.array(stringSchema);
const authorArray = z.array(stringSchema);

const telegramAuthSchema = z
  .object({
    enabled: z.boolean(),
    groupId: z.string(),
    groupName: z.string().optional(),
    customMessage: z.string().optional(),
  })
  .optional();

const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    authors: authorArray.optional(),
    description: z.string().optional().nullable(),
    image: z.string().optional(),
    publishDate: z.coerce.date().optional(),
    tags: tagArray.optional(),
    telegramAuth: telegramAuthSchema,
    title: z.coerce.string(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
