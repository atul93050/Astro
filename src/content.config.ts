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

// Blog posts collection
const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional().default(""),
    author: z.string().optional().default("author-admin"),
    category: z.string().optional().default("uncategorized"),
    tags: z.array(z.string()).optional().default([]),
    featuredImage: z.string().optional().default(""),
    status: z.enum(["draft", "published", "scheduled", "archived"]).default("draft"),
    publishDate: z.union([z.string(), z.date()]).optional().transform(v => v ? (typeof v === "string" ? v : v.toISOString()) : ""),
    scheduledDate: z.union([z.string(), z.date()]).optional().transform(v => v ? (typeof v === "string" ? v : v.toISOString()) : ""),
    updatedDate: z.union([z.string(), z.date()]).optional().transform(v => v ? (typeof v === "string" ? v : v.toISOString()) : ""),
    views: z.number().optional().default(0),
    headerScripts: z.string().optional().default(""),
    footerScripts: z.string().optional().default(""),
    customCss: z.string().optional().default(""),
    customJs: z.string().optional().default(""),
    seo: z.object({
      metaTitle: z.string().optional().default(""),
      metaDescription: z.string().optional().default(""),
      ogImage: z.string().optional().default(""),
      focusKeyword: z.string().optional().default(""),
      canonicalUrl: z.string().optional().default(""),
      robots: z.string().optional().default("index, follow"),
      schemaMarkup: z.string().optional().default(""),
      schemaType: z.enum(["none", "article", "custom"]).optional().default("none"),
    }).optional().default({}),
  }),
});

export const collections = {
  sections,
  pages,
  contacts,
  blog,
};