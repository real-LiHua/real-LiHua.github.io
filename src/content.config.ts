import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const stringSchema = z.string();
const tagArray = z.array(stringSchema);

const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    description: z.string().optional().nullable(),
    publishDate: z.coerce.date().optional(),
    tags: tagArray.optional(),
    title: z.coerce.string(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
