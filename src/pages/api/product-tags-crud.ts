import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { enqueueWrite } from "../../lib/file-write-queue";

export const prerender = false;

const TAGS_FILE = path.resolve("src/data/product-tags.json");
const SESSION_TOKEN = "authenticated-admin-session-2026";

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensureFile() {
  const dir = path.dirname(TAGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(TAGS_FILE)) {
    fs.writeFileSync(TAGS_FILE, "[]", "utf-8");
  }
}

function getTags(): any[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(TAGS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveTags(tags: any[]) {
  fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), "utf-8");
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  return jsonResponse({ success: true, tags: getTags() });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();

  try {
    const data = await request.json();
    if (!data.name?.trim()) return jsonResponse({ success: false, error: "Name is required" }, 400);

    const slug = data.slug?.trim() || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tags = getTags();

    if (tags.some(t => t.slug === slug)) {
      return jsonResponse({ success: false, error: "A tag with this slug already exists" }, 400);
    }

    const newTag = {
      id: `tag-${slug}`,
      name: data.name.trim(),
      slug,
    };

    tags.push(newTag);
    await enqueueWrite(TAGS_FILE, () => {
      saveTags(tags);
    });

    return jsonResponse({ success: true, message: "Tag created!", tag: newTag }, 201);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();

  try {
    const data = await request.json();
    if (!data.id) return jsonResponse({ success: false, error: "ID is required" }, 400);

    const tags = getTags();
    const idx = tags.findIndex(t => t.id === data.id);
    if (idx === -1) return jsonResponse({ success: false, error: "Tag not found" }, 404);

    tags[idx] = {
      ...tags[idx],
      name: data.name?.trim() || tags[idx].name,
      slug: data.slug?.trim() || tags[idx].slug,
    };

    await enqueueWrite(TAGS_FILE, () => {
      saveTags(tags);
    });

    return jsonResponse({ success: true, message: "Tag updated!", tag: tags[idx] });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();

  try {
    const data = await request.json();
    if (!data.id) return jsonResponse({ success: false, error: "ID is required" }, 400);

    const tags = getTags();
    const idx = tags.findIndex(t => t.id === data.id);
    if (idx === -1) return jsonResponse({ success: false, error: "Tag not found" }, 404);

    tags.splice(idx, 1);
    await enqueueWrite(TAGS_FILE, () => {
      saveTags(tags);
    });

    return jsonResponse({ success: true, message: "Tag deleted!" });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};
