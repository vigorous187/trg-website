import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default("Toronto Restaurant Growth"),
    publishDate: z.string(),
    category: z.string(),
    readTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    howCreated: z.string().optional(),
    ymylReviewRequired: z.boolean().optional(),
  }),
});

export const collections = { blog };
