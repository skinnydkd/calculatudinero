import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    lastUpdated: z.string().optional(),
    author: z.string().default('CalculaTuDinero'),
    category: z.enum([
      'autonomos',
      'laboral',
      'impuestos',
      'vivienda',
      'ahorro-inversion',
    ]),
    tags: z.array(z.string()),
    relatedCalculators: z.array(z.string()).optional(),
    image: z.string().optional(),
    howTo: z.array(z.object({
      name: z.string(),
      text: z.string(),
    })).optional(),
  }),
});

export const collections = { blog };
