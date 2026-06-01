import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  // Query all content pages
  let pages = [] as any[];
  try {
    pages = await getCollection("pages");
  } catch (e) {
    // If collection is not yet populated
  }
  
  const publishedPages = pages.filter(p => p.data.status === "published");
  
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
    if (page.data.slug === "index" || page.data.slug === "about-us") continue;
    
    // Clean date formatting
    const dateStr = page.data.lastUpdated ? page.data.lastUpdated.substring(0, 10) : new Date().toISOString().substring(0, 10);
    
    xml += `  <url>\n`;
    xml += `    <loc>https://www.tangence.in/${page.data.slug}</loc>\n`;
    xml += `    <lastmod>${dateStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
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
