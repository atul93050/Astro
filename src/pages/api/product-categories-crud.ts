import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { enqueueWrite } from "../../lib/file-write-queue";

export const prerender = false;

const CATEGORIES_FILE = path.resolve("src/data/product-categories.json");
const PRODUCTS_DIR = path.resolve("src/content/products");
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
  const dir = path.dirname(CATEGORIES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CATEGORIES_FILE)) {
    fs.writeFileSync(CATEGORIES_FILE, "[]", "utf-8");
  }
}

function getCategories(): any[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveCategories(cats: any[]) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(cats, null, 2), "utf-8");
}

function isCategoryReferenced(slug: string): boolean {
  if (!fs.existsSync(PRODUCTS_DIR)) return false;
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith(".md"));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(PRODUCTS_DIR, file), "utf-8");
      const parts = content.split(/^---$/m);
      if (parts.length >= 3) {
        const data = parse(parts[1]);
        if (data && data.category === slug) {
          return true;
        }
      }
    } catch {}
  }
  return false;
}

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  return jsonResponse({ success: true, categories: getCategories() });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();

  try {
    const data = await request.json();
    if (!data.name?.trim()) return jsonResponse({ success: false, error: "Name is required" }, 400);

    const slug = data.slug?.trim() || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const categories = getCategories();

    if (categories.some(c => c.slug === slug)) {
      return jsonResponse({ success: false, error: "A category with this slug already exists" }, 400);
    }

    // Auto-generate color via hash string
    const key = slug.toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    const colors = ["#6366F1", "#10B981", "#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899"];
    const color = colors[Math.abs(hash) % colors.length];

    const newCat = {
      id: `cat-${slug}`,
      name: data.name.trim(),
      slug,
      description: data.description || "",
      color,
      createdAt: new Date().toISOString(),
    };

    categories.push(newCat);
    await enqueueWrite(CATEGORIES_FILE, () => {
      saveCategories(categories);
    });

    return jsonResponse({ success: true, message: "Category created!", category: newCat }, 201);
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

    const categories = getCategories();
    const idx = categories.findIndex(c => c.id === data.id);
    if (idx === -1) return jsonResponse({ success: false, error: "Category not found" }, 404);

    categories[idx] = {
      ...categories[idx],
      name: data.name?.trim() || categories[idx].name,
      slug: data.slug?.trim() || categories[idx].slug,
      description: data.description !== undefined ? data.description : categories[idx].description,
    };

    await enqueueWrite(CATEGORIES_FILE, () => {
      saveCategories(categories);
    });

    return jsonResponse({ success: true, message: "Category updated!", category: categories[idx] });
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

    const categories = getCategories();
    const idx = categories.findIndex(c => c.id === data.id);
    if (idx === -1) return jsonResponse({ success: false, error: "Category not found" }, 404);

    const catSlug = categories[idx].slug;
    if (isCategoryReferenced(catSlug)) {
      return jsonResponse({ success: false, error: "Cannot delete category: it is referenced by existing products." }, 400);
    }

    categories.splice(idx, 1);
    await enqueueWrite(CATEGORIES_FILE, () => {
      saveCategories(categories);
    });

    return jsonResponse({ success: true, message: "Category deleted!" });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};
