import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const about = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/about" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    seoFocusKeyword: z.string().optional().default(""),
    seoCanonical: z.string().optional().default(""),
    seoRobots: z.string().optional().default("index, follow"),
    seoOgTitle: z.string().optional().default(""),
    seoOgDescription: z.string().optional().default(""),
    seoOgImage: z.string().optional().default(""),
    seoTwitterCard: z.string().optional().default("summary_large_image"),
    seoSchemaType: z.string().optional().default("none"),
    seoSchemaMarkup: z.string().optional().default(""),
    headerScripts: z.string().optional().default(""),
    footerScripts: z.string().optional().default(""),
    customCss: z.string().optional().default(""),
    customJs: z.string().optional().default(""),
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
    seoFocusKeyword: z.string().optional().default(""),
    seoCanonical: z.string().optional().default(""),
    seoRobots: z.string().optional().default("index, follow"),
    seoOgTitle: z.string().optional().default(""),
    seoOgDescription: z.string().optional().default(""),
    seoOgImage: z.string().optional().default(""),
    seoTwitterCard: z.string().optional().default("summary_large_image"),
    seoSchemaType: z.string().optional().default("none"),
    seoSchemaMarkup: z.string().optional().default(""),
    headerScripts: z.string().optional().default(""),
    footerScripts: z.string().optional().default(""),
    customCss: z.string().optional().default(""),
    customJs: z.string().optional().default(""),
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

// Advanced dynamic page-builder collections schema
const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    status: z.enum(["draft", "published"]).default("draft"),
    lastUpdated: z.union([z.string(), z.date()]).transform(v => typeof v === "string" ? v : v.toISOString()),
    headerScripts: z.string().optional().default(""),
    footerScripts: z.string().optional().default(""),
    customCss: z.string().optional().default(""),
    customJs: z.string().optional().default(""),
    seo: z.object({
      metaTitle: z.string(),
      metaDescription: z.string(),
      canonicalUrl: z.string().optional().default(""),
      robots: z.string().optional().default("index, follow"),
      ogTitle: z.string().optional().default(""),
      ogDescription: z.string().optional().default(""),
      ogImage: z.string().optional().default(""),
      twitterCard: z.string().optional().default("summary_large_image"),
      focusKeyword: z.string().optional().default(""),
      schemaMarkup: z.string().optional().default(""), // Custom JSON-LD
      schemaType: z.enum(["none", "organization", "local_business", "faq", "article", "breadcrumb", "custom"]).default("none"),
    }),
    blocks: z.array(z.any()).default([]),
  }),
});

// Contacts schema for submissions inbox
const contacts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/contacts" }),
  schema: z.object({
    name: z.string(),
    email: z.string().email(),
    subject: z.string(),
    message: z.string(),
    submittedAt: z.union([z.string(), z.date()]).transform(v => typeof v === "string" ? v : v.toISOString()),
  }),
});

export const collections = {
  about,
  home,
  pages,
  contacts,
};