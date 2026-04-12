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

export const collections = {
  projects: projectsCollection,
};
