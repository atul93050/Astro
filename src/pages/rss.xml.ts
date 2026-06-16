import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { getBlogPosts } from "../utils/blog";

export const prerender = false;

const SITE = "https://www.tangence.in";

function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const GET: APIRoute = async () => {
  // Load blog settings
  let settings: any = { rssEnabled: true, rssFeedTitle: "Blog RSS Feed", blogDescription: "" };
  try {
    const metaPath = path.resolve("src/data/blog-meta.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      settings = { ...settings, ...(meta.settings || {}) };
    }
  } catch { /* fallback to defaults */ }

  if (settings.rssEnabled === false) {
    return new Response("RSS feed is disabled.", { status: 404 });
  }

  const posts = (await getBlogPosts())
    .filter((p: any) => p.data.status === "published")
    .sort((a: any, b: any) =>
      new Date(b.data.publishDate || b.data.updatedDate || 0).getTime() -
      new Date(a.data.publishDate || a.data.updatedDate || 0).getTime()
    )
    .slice(0, 50);

  const items = posts.map((p: any) => {
    const link = `${SITE}/blog/${p.slug}`;
    const date = new Date(p.data.publishDate || p.data.updatedDate || Date.now()).toUTCString();
    return `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${date}</pubDate>
      <description>${esc(p.data.excerpt || "")}</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(settings.rssFeedTitle || "Blog RSS Feed")}</title>
    <link>${SITE}/blog</link>
    <description>${esc(settings.blogDescription || "")}</description>
    <language>en-us</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
