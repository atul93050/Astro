import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";

const BLOG_DIR = path.resolve("src/content/blog");

// Calculate reading time helper
function calcReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Slugify heading text for anchor ids
function slugifyHeading(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Ensures every heading in the rendered HTML has a unique anchor id and returns
 * a TOC heading list. Works for both markdown-authored posts (headings already
 * have ids) and raw-HTML / Quill-authored posts (headings have none).
 */
function ensureHeadingAnchors(html: string, mdHeadings: any[]) {
  const used = new Set<string>();
  const headings: { depth: number; slug: string; text: string }[] = [];

  const out = html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (m, depth, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = "";
    const existing = /\bid=["']([^"']+)["']/.exec(attrs);
    if (existing) {
      id = existing[1];
    } else {
      id = slugifyHeading(text) || `section-${headings.length + 1}`;
    }
    // Deduplicate ids
    let unique = id, n = 1;
    while (used.has(unique)) unique = `${id}-${n++}`;
    used.add(unique);

    headings.push({ depth: parseInt(depth, 10), slug: unique, text });
    const newAttrs = existing
      ? attrs.replace(/\bid=["'][^"']+["']/, `id="${unique}"`)
      : `${attrs} id="${unique}"`;
    return `<h${depth}${newAttrs}>${inner}</h${depth}>`;
  });

  // Prefer the richer markdown metadata when it lines up; otherwise use derived.
  return { html: out, headings: headings.length ? headings : (mdHeadings || []) };
}

// Parse markdown file helper
function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return { data: {}, body: content };
  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  try {
    return { data: parse(yamlStr) || {}, body };
  } catch (e) {
    console.error("YAML Parse error:", e);
    return { data: {}, body };
  }
}

/**
 * Reads all blog post markdown files directly from disk.
 * Returns post objects styled like Astro Content Collection posts.
 */
export async function getBlogPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith(".md"));
  const posts = files.map(file => {
    const filePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, body } = parseMarkdown(content);
    const slug = data.slug || path.basename(file, ".md");
    
    return {
      slug,
      body,
      data: {
        title: data.title || "Untitled Post",
        slug,
        excerpt: data.excerpt || "",
        author: data.author || "author-admin",
        category: data.category || "uncategorized",
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: data.featuredImage || "",
        status: data.status || "draft",
        publishDate: data.publishDate || "",
        scheduledDate: data.scheduledDate || "",
        updatedDate: data.updatedDate || "",
        views: data.views || 0,
        headerScripts: data.headerScripts || "",
        footerScripts: data.footerScripts || "",
        customCss: data.customCss || "",
        customJs: data.customJs || "",
        seo: data.seo || {},
      }
    };
  });

  return posts;
}

/**
 * Reads a single blog post directly from disk and compiles its markdown content to HTML.
 * Includes heading metadata for Table of Contents.
 */
export async function getBlogPost(slug: string) {
  if (!slug) return null;

  // Resolve the file: prefer `${slug}.md`, but fall back to scanning for a
  // file whose frontmatter `slug` matches (filename may differ from slug).
  let filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    if (!fs.existsSync(BLOG_DIR)) return null;
    const match = fs.readdirSync(BLOG_DIR)
      .filter(f => f.endsWith(".md"))
      .find(f => {
        const { data } = parseMarkdown(fs.readFileSync(path.join(BLOG_DIR, f), "utf-8"));
        return data.slug === slug;
      });
    if (!match) return null;
    filePath = path.join(BLOG_DIR, match);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const { data, body } = parseMarkdown(content);

  // Compile markdown to HTML and extract headings
  const processor = await createMarkdownProcessor();
  const rendered = await processor.render(body);

  // Ensure headings have anchor ids and a usable TOC list even when the body
  // is raw HTML (e.g. authored in the Quill editor), which the markdown
  // processor passes through without slugging headings.
  const { html, headings } = ensureHeadingAnchors(rendered.code, rendered.metadata.headings || []);

  return {
    slug: data.slug || slug,
    body,
    html,
    headings,
    data: {
      title: data.title || "Untitled Post",
      slug,
      excerpt: data.excerpt || "",
      author: data.author || "author-admin",
      category: data.category || "uncategorized",
      tags: Array.isArray(data.tags) ? data.tags : [],
      featuredImage: data.featuredImage || "",
      status: data.status || "draft",
      publishDate: data.publishDate || "",
      scheduledDate: data.scheduledDate || "",
      updatedDate: data.updatedDate || "",
      views: data.views || 0,
      headerScripts: data.headerScripts || "",
      footerScripts: data.footerScripts || "",
      customCss: data.customCss || "",
      customJs: data.customJs || "",
      seo: data.seo || {},
    }
  };
}
