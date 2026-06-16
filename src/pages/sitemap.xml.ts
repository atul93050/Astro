import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export const prerender = false;

function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return {};
  try {
    return parse(parts[1]) || {};
  } catch (e) {
    return {};
  }
}

export const GET: APIRoute = async () => {
  const pagesDir = path.resolve("src/content/pages");
  const blogDir = path.resolve("src/content/blog");
  
  let pages = [] as any[];
  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".md"));
    pages = files.map(file => {
      const content = fs.readFileSync(path.join(pagesDir, file), "utf-8");
      const data = parseMarkdown(content);
      return {
        slug: data.slug || path.basename(file, ".md"),
        status: data.status || "draft",
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    });
  }

  let posts = [] as any[];
  if (fs.existsSync(blogDir)) {
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith(".md"));
    posts = files.map(file => {
      const content = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const data = parseMarkdown(content);
      return {
        slug: data.slug || path.basename(file, ".md"),
        status: data.status || "draft",
        category: data.category || "uncategorized",
        tags: Array.isArray(data.tags) ? data.tags : [],
        author: data.author || "author-admin",
        lastUpdated: data.updatedDate || data.publishDate || new Date().toISOString(),
      };
    });
  }

  const publishedPages = pages.filter(p => p.status === "published");
  const publishedPosts = posts.filter(p => p.status === "published");
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // 1. Add home page
  xml += `  <url>\n`;
  xml += `    <loc>https://www.tangence.in/</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;
  
  // 2. Add custom static about-us page if exists
  xml += `  <url>\n`;
  xml += `    <loc>https://www.tangence.in/about-us</loc>\n`;
  xml += `    <changefreq>monthly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;

  // 3. Add dynamic pages
  for (const page of publishedPages) {
    if (page.slug === "index" || page.slug === "about-us") continue;
    
    const dateStr = page.lastUpdated ? page.lastUpdated.substring(0, 10) : new Date().toISOString().substring(0, 10);
    
    xml += `  <url>\n`;
    xml += `    <loc>https://www.tangence.in/${page.slug}</loc>\n`;
    xml += `    <lastmod>${dateStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  // 4. Add blog listing index (only when posts exist)
  if (publishedPosts.length > 0) {
    xml += `  <url>\n`;
    xml += `    <loc>https://www.tangence.in/blog</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // 5. Add blog posts
  for (const post of publishedPosts) {
    const dateStr = post.lastUpdated ? post.lastUpdated.substring(0, 10) : new Date().toISOString().substring(0, 10);

    xml += `  <url>\n`;
    xml += `    <loc>https://www.tangence.in/blog/${post.slug}</loc>\n`;
    xml += `    <lastmod>${dateStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  }

  // 6. Add blog taxonomy archives (categories, tags, authors) that have
  //    at least one published post.
  const metaFile = path.resolve("src/data/blog-meta.json");
  if (fs.existsSync(metaFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
      const fullPosts = posts.filter(p => p.status === "published");

      const addArchive = (loc: string) => {
        xml += `  <url>\n`;
        xml += `    <loc>https://www.tangence.in${loc}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.5</priority>\n`;
        xml += `  </url>\n`;
      };

      for (const cat of meta.categories || []) {
        if (fullPosts.some((p: any) => p.category === cat.slug)) addArchive(`/blog/category/${cat.slug}`);
      }
      for (const tag of meta.tags || []) {
        if (fullPosts.some((p: any) => Array.isArray(p.tags) && p.tags.includes(tag.slug))) addArchive(`/blog/tag/${tag.slug}`);
      }
      for (const author of meta.authors || []) {
        if (fullPosts.some((p: any) => p.author === author.id)) addArchive(`/blog/author/${author.slug}`);
      }
    } catch { /* ignore malformed meta */ }
  }

  xml += `</urlset>`;
  
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
