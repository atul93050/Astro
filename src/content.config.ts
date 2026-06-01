import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const about = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/about" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    hero: z.object({
      title: z.string(),
      description: z.string(),
      image: z.string(),
    }),
    mission: z.object({
      title: z.string(),
      description: z.string(),
      image: z.string().optional().default(""),
    }),
    vision: z.object({
      title: z.string(),
      description: z.string(),
      image: z.string().optional().default(""),
    }),
    team: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        bio: z.string(),
        image: z.string(),
      })
    ).default([]),
  }),
});

const home = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/home" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    hero: z.object({
      badge: z.string(),
      title: z.string(),
      description: z.string(),
      bullets: z.array(z.string()).default([]),
      formTitle: z.string(),
      formDescription: z.string(),
      formTrust: z.string(),
    }),
    stats: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      items: z.array(
        z.object({
          num: z.string(),
          label: z.string(),
        })
      ).default([]),
    }),
    pricing: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      footer: z.string(),
      items: z.array(
        z.object({
          title: z.string(),
          price: z.string(),
          suffix: z.string(),
          subtext: z.string(),
          featured: z.boolean().default(false),
          features: z.array(z.string()).default([]),
        })
      ).default([]),
    }),
    faq: z.object({
      eyebrow: z.string(),
      title: z.string(),
      items: z.array(
        z.object({
          question: z.string(),
          answer: z.string(),
          open: z.boolean().default(false),
        })
      ).default([]),
    }),
  }),
});

export const collections = {
  about,
  home,
};