import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const stringSchema = z.string();
const tagArray = z.array(stringSchema);
const authorArray = z.array(stringSchema);

const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    authors: authorArray.optional(),
    description: z.string().optional().nullable(),
    image: z.string().optional(),
    publishDate: z.coerce.date().optional(),
    tags: tagArray.optional(),
    title: z.coerce.string(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
