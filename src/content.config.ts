import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Generic schema-driven section builder content collection
const sections = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/sections" }),
  schema: z.record(z.any()),
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
  sections,
  pages,
  contacts,
};