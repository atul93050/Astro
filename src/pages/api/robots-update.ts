import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

// Check session
function isAuthenticated(cookies: any): boolean {
  return cookies.get("cms_session")?.value === "authenticated-admin-session-2026";
}

// GET: Read existing robots.txt contents
export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const robotsPath = path.resolve("public/robots.txt");
    let content = "User-agent: *\nAllow: /\n\nSitemap: https://www.tangence.in/sitemap.xml";
    
    if (fs.existsSync(robotsPath)) {
      content = fs.readFileSync(robotsPath, "utf-8");
    }
    
    return new Response(JSON.stringify({ success: true, content }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};

// POST: Save robots.txt contents to public/robots.txt on disk
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { content } = await request.json();
    const robotsPath = path.resolve("public/robots.txt");
    
    // Ensure public folder exists
    fs.mkdirSync(path.dirname(robotsPath), { recursive: true });
    
    fs.writeFileSync(robotsPath, content || "", "utf-8");
    
    return new Response(JSON.stringify({ success: true, message: "robots.txt updated successfully!" }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
