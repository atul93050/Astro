import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { enqueueWrite } from "../../lib/file-write-queue";

export const prerender = false;

const PRODUCTS_DIR = path.resolve("src/content/products");
const CATEGORIES_FILE = path.resolve("src/data/product-categories.json");
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

function ensureDirs() {
  if (!fs.existsSync(PRODUCTS_DIR)) fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  const dataDir = path.dirname(CATEGORIES_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(CATEGORIES_FILE)) fs.writeFileSync(CATEGORIES_FILE, "[]", "utf-8");
  if (!fs.existsSync(TAGS_FILE)) fs.writeFileSync(TAGS_FILE, "[]", "utf-8");
}

function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) return { data: {}, body: content };
  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  try {
    return { data: parse(yamlStr) || {}, body };
  } catch (e) {
    console.error("YAML Parse error:", e);
    return { data: {}, body };
  }
}

function stringifyMarkdown(data: any, body = "") {
  data.updatedDate = new Date().toISOString();
  const yamlStr = stringify(data);
  return `---\n${yamlStr}---\n\n${body}`;
}

function getCategories(): any[] {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function getTags(): any[] {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(TAGS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function listProducts(filters: { search?: string; category?: string; tag?: string; status?: string }): any[] {
  ensureDirs();
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith(".md"));
  let products = files.map(file => {
    const filePath = path.join(PRODUCTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, body } = parseMarkdown(content);
    return {
      ...data,
      slug: data.slug || path.basename(file, ".md"),
      descriptionHtml: body,
    };
  });

  if (filters.status && filters.status !== "all") {
    products = products.filter(p => p.status === filters.status);
  }
  if (filters.category) {
    products = products.filter(p => p.category === filters.category);
  }
  if (filters.tag) {
    products = products.filter(p => Array.isArray(p.tags) && p.tags.includes(filters.tag));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    products = products.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q)
    );
  }

  products.sort((a, b) => new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime());
  return products;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDirs();

  const action = url.searchParams.get("action") || "list";
  const slug = url.searchParams.get("slug") || "";

  try {
    if (action === "list") {
      const products = listProducts({
        status: url.searchParams.get("status") || "all",
        category: url.searchParams.get("category") || "",
        tag: url.searchParams.get("tag") || "",
        search: url.searchParams.get("search") || "",
      });
      return jsonResponse({ success: true, products });
    }

    if (action === "get") {
      if (!slug) return jsonResponse({ success: false, error: "Slug required" }, 400);
      const filePath = path.join(PRODUCTS_DIR, `${slug}.md`);
      if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Product not found" }, 404);
      const content = fs.readFileSync(filePath, "utf-8");
      const { data, body } = parseMarkdown(content);
      return jsonResponse({ success: true, product: { ...data, slug }, body });
    }

    if (action === "categories") {
      const cats = getCategories();
      const allProds = listProducts({});
      const result = cats.map(c => {
        const count = allProds.filter(p => p.category === c.slug).length;
        return { ...c, productCount: count };
      });
      return jsonResponse({ success: true, categories: result });
    }

    if (action === "tags") {
      const tags = getTags();
      const allProds = listProducts({});
      const result = tags.map(t => {
        const count = allProds.filter(p => Array.isArray(p.tags) && p.tags.includes(t.slug)).length;
        return { ...t, productCount: count };
      });
      return jsonResponse({ success: true, tags: result });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDirs();

  try {
    const data = await request.json();
    const action = data.action || "create";

    if (action === "create") {
      if (!data.name?.trim()) return jsonResponse({ success: false, error: "Name is required" }, 400);
      const slug = data.slug?.trim() || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const filePath = path.join(PRODUCTS_DIR, `${slug}.md`);
      if (fs.existsSync(filePath)) return jsonResponse({ success: false, error: "A product with this slug already exists" }, 400);

      const frontmatter = {
        name: data.name.trim(),
        slug,
        status: data.status || "draft",
        category: data.category || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        basePrice: Number(data.basePrice || 0),
        stock: Number(data.stock || 0),
        lowStockThreshold: Number(data.lowStockThreshold || 5),
        featuredImage: data.featuredImage || "",
        images: Array.isArray(data.images) ? data.images : [],
        variants: Array.isArray(data.variants) ? data.variants : [],
        views: 0,
        createdAt: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        seo: {
          metaTitle: data.seo?.metaTitle || data.name.trim(),
          metaDescription: data.seo?.metaDescription || "",
          ogImage: data.seo?.ogImage || data.featuredImage || "",
          focusKeyword: data.seo?.focusKeyword || "",
          canonicalUrl: data.seo?.canonicalUrl || "",
          robots: data.seo?.robots || "index, follow",
        }
      };

      const fileContent = stringifyMarkdown(frontmatter, data.body || "");
      await enqueueWrite(filePath, () => {
        fs.writeFileSync(filePath, fileContent, "utf-8");
      });

      return jsonResponse({ success: true, message: "Product created successfully!", slug }, 201);
    }

    if (action === "duplicate") {
      const origSlug = data.slug;
      if (!origSlug) return jsonResponse({ success: false, error: "slug required" }, 400);
      const origPath = path.join(PRODUCTS_DIR, `${origSlug}.md`);
      if (!fs.existsSync(origPath)) return jsonResponse({ success: false, error: "Product not found" }, 404);

      const content = fs.readFileSync(origPath, "utf-8");
      const { data: origData, body } = parseMarkdown(content);

      let newSlug = `${origSlug}-copy`;
      let counter = 2;
      while (fs.existsSync(path.join(PRODUCTS_DIR, `${newSlug}.md`))) {
        newSlug = `${origSlug}-copy-${counter++}`;
      }

      const newData = {
        ...origData,
        slug: newSlug,
        name: `${origData.name || "Untitled"} (Copy)`,
        status: "draft",
        views: 0,
        createdAt: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
      };

      const fileContent = stringifyMarkdown(newData, body);
      await enqueueWrite(path.join(PRODUCTS_DIR, `${newSlug}.md`), () => {
        fs.writeFileSync(path.join(PRODUCTS_DIR, `${newSlug}.md`), fileContent, "utf-8");
      });

      return jsonResponse({ success: true, message: "Product duplicated!", newSlug });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDirs();

  try {
    const data = await request.json();
    const slug = data.slug;
    if (!slug) return jsonResponse({ success: false, error: "Slug is required" }, 400);

    const filePath = path.join(PRODUCTS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Product not found" }, 404);

    const content = fs.readFileSync(filePath, "utf-8");
    const { data: origData, body: origBody } = parseMarkdown(content);

    const frontmatter = {
      ...origData,
      name: data.name?.trim() || origData.name,
      status: data.status || origData.status,
      category: data.category !== undefined ? data.category : origData.category,
      tags: Array.isArray(data.tags) ? data.tags : origData.tags,
      basePrice: data.basePrice !== undefined ? Number(data.basePrice) : origData.basePrice,
      stock: data.stock !== undefined ? Number(data.stock) : origData.stock,
      lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : origData.lowStockThreshold,
      featuredImage: data.featuredImage !== undefined ? data.featuredImage : origData.featuredImage,
      images: Array.isArray(data.images) ? data.images : origData.images,
      variants: Array.isArray(data.variants) ? data.variants : origData.variants,
      seo: {
        ...origData.seo,
        metaTitle: data.seo?.metaTitle || origData.seo?.metaTitle,
        metaDescription: data.seo?.metaDescription || origData.seo?.metaDescription,
        ogImage: data.seo?.ogImage || origData.seo?.ogImage,
        focusKeyword: data.seo?.focusKeyword || origData.seo?.focusKeyword,
        canonicalUrl: data.seo?.canonicalUrl || origData.seo?.canonicalUrl,
        robots: data.seo?.robots || origData.seo?.robots,
      }
    };

    const newContent = stringifyMarkdown(frontmatter, data.body !== undefined ? data.body : origBody);
    await enqueueWrite(filePath, () => {
      fs.writeFileSync(filePath, newContent, "utf-8");
    });

    return jsonResponse({ success: true, message: "Product updated successfully!" });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== SESSION_TOKEN) return unauthorized();
  ensureDirs();

  try {
    const data = await request.json();
    const slug = data.slug;
    if (!slug) return jsonResponse({ success: false, error: "Slug is required" }, 400);

    const filePath = path.join(PRODUCTS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return jsonResponse({ success: false, error: "Product not found" }, 404);

    await enqueueWrite(filePath, () => {
      fs.unlinkSync(filePath);
    });

    return jsonResponse({ success: true, message: "Product deleted!" });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
};
