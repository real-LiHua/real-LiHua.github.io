import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md{,x}", base: "./src/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(""),
  }),
});

export const collections = { blog };
