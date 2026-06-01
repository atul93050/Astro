import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

export const prerender = false;

// Ensure directories exist
function ensureDirs() {
  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }
  if (!fs.existsSync(revisionsDir)) {
    fs.mkdirSync(revisionsDir, { recursive: true });
  }
}

// Parse markdown file with YAML frontmatter
function parseMarkdown(content: string) {
  const parts = content.split(/^---$/m);
  if (parts.length < 3) {
    return { data: {}, body: content };
  }
  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  try {
    const data = parse(yamlStr);
    return { data, body };
  } catch (e) {
    console.error("YAML Parse error:", e);
    return { data: {}, body };
  }
}

// Stringify to markdown with YAML frontmatter
function stringifyMarkdown(data: any, body: string = "") {
  // Format dates consistently
  data.lastUpdated = new Date().toISOString();
  const yamlStr = stringify(data);
  return `---\n${yamlStr}---\n\n${body}`;
}

import { BLOCK_REGISTRY } from "../../block-registry/blocks";

// Backend validation for page builder fields (Dynamically driven by BLOCK_REGISTRY)
function validatePageData(data: any): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    errors.title = "Page Title is required";
  }

  if (!data.slug || typeof data.slug !== "string" || !data.slug.trim()) {
    errors.slug = "Page Slug is required";
  } else if (!/^[a-z0-9-_]+$/.test(data.slug)) {
    errors.slug = "Page Slug must contain only lowercase letters, numbers, dashes, and underscores";
  }

  if (!data.status || !["draft", "published"].includes(data.status)) {
    errors.status = "Status must be either 'draft' or 'published'";
  }

  // SEO validations
  if (!data.seo) {
    errors["seo.global"] = "SEO settings are required";
  } else {
    if (!data.seo.metaTitle || !data.seo.metaTitle.trim()) {
      errors["seo.metaTitle"] = "SEO Meta Title is required";
    }
    if (!data.seo.metaDescription || !data.seo.metaDescription.trim()) {
      errors["seo.metaDescription"] = "SEO Meta Description is required";
    }
  }

  // Dynamic blocks validation driven by central registry
  if (data.blocks && Array.isArray(data.blocks)) {
    data.blocks.forEach((block: any, idx: number) => {
      const prefix = `blocks.${idx}`;
      if (!block.type || typeof block.type !== "string") {
        errors[`${prefix}.type`] = `Block #${idx + 1} has an invalid or missing type`;
        return;
      }

      const config = BLOCK_REGISTRY.find(b => b.type === block.type);
      if (!config) {
        errors[`${prefix}.type`] = `Block #${idx + 1} has an unsupported block type '${block.type}'`;
        return;
      }

      // Loop through registry field schema
      config.fields.forEach(field => {
        const val = block[field.name];

        if (field.required) {
          if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
            errors[`${prefix}.${field.name}`] = `${config.name} #${idx + 1} ${field.label} is required`;
          }
        }

        // Nested lists validation
        if (field.type === "list" && field.required) {
          if (!Array.isArray(val) || val.length === 0 || val.every(v => typeof v === "string" && !v.trim())) {
            errors[`${prefix}.${field.name}`] = `${config.name} #${idx + 1} ${field.label} list cannot be empty`;
          }
        }

        // Repeaters validation
        if (field.type === "repeater" && Array.isArray(val)) {
          if (field.required && val.length === 0) {
            errors[`${prefix}.${field.name}`] = `${config.name} #${idx + 1} ${field.label} requires at least one item`;
          } else {
            val.forEach((item: any, itemIdx: number) => {
              field.repeaterFields?.forEach(subField => {
                const subVal = item[subField.name];
                if (subField.required) {
                  if (subVal === undefined || subVal === null || (typeof subVal === "string" && !subVal.trim())) {
                    errors[`${prefix}.${field.name}.${itemIdx}.${subField.name}`] = `${config.name} #${idx + 1} Item #${itemIdx + 1} ${subField.label} is required`;
                  }
                }
              });
            });
          }
        }
      });
    });
  }

  return errors;
}

// API Routes
export const GET: APIRoute = async ({ url, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureDirs();
  const action = url.searchParams.get("action") || "list";
  const slug = url.searchParams.get("slug") || "";

  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");

  try {
    if (action === "list") {
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".md"));
      const pages = files.map(file => {
        const filePath = path.join(pagesDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data } = parseMarkdown(content);
        return {
          title: data.title || "Untitled Page",
          slug: data.slug || path.basename(file, ".md"),
          status: data.status || "draft",
          lastUpdated: data.lastUpdated || fs.statSync(filePath).mtime.toISOString(),
          seo: data.seo || {},
        };
      });
      return new Response(JSON.stringify({ success: true, pages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      if (!slug) {
        return new Response(JSON.stringify({ success: false, error: "Slug parameter is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const filePath = path.join(pagesDir, `${slug}.md`);
      if (!fs.existsSync(filePath)) {
        return new Response(JSON.stringify({ success: false, error: "Page not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const { data, body } = parseMarkdown(content);
      return new Response(JSON.stringify({ success: true, page: data, body }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "revisions") {
      if (!slug) {
        return new Response(JSON.stringify({ success: false, error: "Slug parameter is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const pageRevDir = path.join(revisionsDir, slug);
      if (!fs.existsSync(pageRevDir)) {
        return new Response(JSON.stringify({ success: true, revisions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const files = fs.readdirSync(pageRevDir).filter(f => f.endsWith(".md")).sort().reverse();
      const revisions = files.map(file => {
        const timestamp = path.basename(file, ".md");
        const formattedDate = new Date(parseInt(timestamp)).toLocaleString();
        return {
          timestamp,
          date: formattedDate,
        };
      });
      return new Response(JSON.stringify({ success: true, revisions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "rollback") {
      const timestamp = url.searchParams.get("timestamp");
      if (!slug || !timestamp) {
        return new Response(JSON.stringify({ success: false, error: "Slug and timestamp are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const revFilePath = path.join(revisionsDir, slug, `${timestamp}.md`);
      if (!fs.existsSync(revFilePath)) {
        return new Response(JSON.stringify({ success: false, error: "Revision not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const content = fs.readFileSync(revFilePath, "utf-8");
      // Write back to main file
      const mainFilePath = path.join(pagesDir, `${slug}.md`);
      fs.writeFileSync(mainFilePath, content, "utf-8");
      return new Response(JSON.stringify({ success: true, message: "Page rolled back successfully!" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureDirs();
  const pagesDir = path.resolve("src/content/pages");

  try {
    const data = await request.json();
    const errors = validatePageData(data);

    if (Object.keys(errors).length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.join(pagesDir, `${data.slug}.md`);
    if (fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, errors: { slug: "A page with this slug already exists" } }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const fileContent = stringifyMarkdown(data, data.body || "");
    fs.writeFileSync(filePath, fileContent, "utf-8");

    return new Response(JSON.stringify({ success: true, message: "Page created successfully!" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureDirs();
  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");

  try {
    const data = await request.json();
    const originalSlug = data.originalSlug || data.slug;
    const errors = validatePageData(data);

    if (Object.keys(errors).length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalFilePath = path.join(pagesDir, `${originalSlug}.md`);
    const newFilePath = path.join(pagesDir, `${data.slug}.md`);

    if (!fs.existsSync(originalFilePath)) {
      return new Response(JSON.stringify({ success: false, error: "Page not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Backup revision
    const existingContent = fs.readFileSync(originalFilePath, "utf-8");
    const pageRevDir = path.join(revisionsDir, originalSlug);
    if (!fs.existsSync(pageRevDir)) {
      fs.mkdirSync(pageRevDir, { recursive: true });
    }
    const timestamp = Date.now().toString();
    fs.writeFileSync(path.join(pageRevDir, `${timestamp}.md`), existingContent, "utf-8");

    // Clean up data to avoid storing originalSlug
    const { originalSlug: _, ...cleanedData } = data;

    const fileContent = stringifyMarkdown(cleanedData, data.body || "");

    if (originalSlug !== data.slug) {
      // Slug changed. Delete old file, rename revision folder, create new file.
      fs.unlinkSync(originalFilePath);
      if (fs.existsSync(pageRevDir)) {
        const newRevDir = path.join(revisionsDir, data.slug);
        fs.renameSync(pageRevDir, newRevDir);
      }
    }

    fs.writeFileSync(newFilePath, fileContent, "utf-8");

    return new Response(JSON.stringify({ success: true, message: "Page updated and revision saved!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get("cms_session")?.value;
  if (session !== "authenticated-admin-session-2026") {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  ensureDirs();
  const pagesDir = path.resolve("src/content/pages");
  const revisionsDir = path.resolve("src/content/revisions");

  try {
    const { slug } = await request.json();
    if (!slug) {
      return new Response(JSON.stringify({ success: false, error: "Slug is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.join(pagesDir, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ success: false, error: "Page not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete main file
    fs.unlinkSync(filePath);

    // Clean up revision folder if exists
    const pageRevDir = path.join(revisionsDir, slug);
    if (fs.existsSync(pageRevDir)) {
      fs.rmSync(pageRevDir, { recursive: true, force: true });
    }

    return new Response(JSON.stringify({ success: true, message: "Page deleted successfully!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
