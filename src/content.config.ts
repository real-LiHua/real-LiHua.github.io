import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    description: z.coerce.string().optional(),
    draft: z.boolean().optional().default(false),
    publishDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    title: z.coerce.string(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
