// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const projectsCollection = defineCollection({
  type: 'data',
  schema: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      image: z.string(),
      technologies: z.array(z.string()),
      date: z.string(),
      status: z.string(),
      github: z.string().nullable(),
      demo: z.string().nullable(),
    })
  ),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()),
    readTime: z.string().optional(),
    heroImage: z.string().optional(),
    sourceFormat: z.string().optional(),
    bibliography: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  projects: projectsCollection,
  blog: blogCollection,
};
