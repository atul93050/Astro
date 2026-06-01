import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const { filename } = await request.json();
    if (!filename) {
      return new Response(JSON.stringify({ success: false, error: "Filename parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Safety checks: restrict deletion to src/content/contacts directory
    const contactsDir = path.resolve("src/content/contacts");
    const targetPath = path.join(contactsDir, filename);

    // Verify it is inside the expected folder
    if (!targetPath.startsWith(contactsDir)) {
      return new Response(JSON.stringify({ success: false, error: "Access denied: Invalid file path" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!fs.existsSync(targetPath)) {
      return new Response(JSON.stringify({ success: false, error: "Submission file not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Delete physical file
    fs.unlinkSync(targetPath);

    return new Response(JSON.stringify({ success: true, message: "Submission deleted successfully!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
