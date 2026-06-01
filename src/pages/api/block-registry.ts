import type { APIRoute } from "astro";
import { BLOCK_REGISTRY } from "../../block-registry/blocks";

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

  return new Response(JSON.stringify({ success: true, registry: BLOCK_REGISTRY }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
