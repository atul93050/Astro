import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  // Session authentication gate check
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Load from dynamic section-definitions.json instead of hardcoded BLOCK_REGISTRY
  try {
    const definitionsPath = path.resolve("src/data/section-definitions.json");
    let definitions: any[] = [];
    if (fs.existsSync(definitionsPath)) {
      definitions = JSON.parse(fs.readFileSync(definitionsPath, "utf-8"));
    }

    return new Response(JSON.stringify({ success: true, registry: definitions, definitions }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
