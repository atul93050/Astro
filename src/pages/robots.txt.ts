import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const robots = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin/*",
    "Disallow: /api/*",
    "",
    "Sitemap: https://www.tangence.in/sitemap.xml"
  ].join("\n");

  return new Response(robots, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400"
    }
  });
};
